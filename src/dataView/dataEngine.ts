import * as fs from "fs/promises";
import type {
  BaseConfig,
  FilterNode,
  FileEntry,
  TableDataMessage,
  ColumnDef,
  RowData,
  SortConfig,
} from "./types";
import { scanVault, getAllFiles, getFileCount, updateFile, removeFile, setStoragePath } from "./fileScanner";
import { parseBaseFile } from "./configParser";
import { parseFilterGroup } from "./filterParser";
import { evaluateEntry } from "./filterEvaluator";

export class DataEngine {
  private vaultPath: string;
  private storagePath: string;
  private config: BaseConfig | null = null;
  private activeViewName = "";
  private topLevelFilter: FilterNode | undefined;
  private viewLevelFilter: FilterNode | undefined;
  private baseFilePath = "";

  onTableData: ((data: TableDataMessage) => void) | null = null;

  constructor(vaultPath: string, storagePath: string) {
    this.vaultPath = vaultPath;
    this.storagePath = storagePath;
  }

  getActiveViewName(): string {
    return this.activeViewName;
  }

  async initialize(): Promise<void> {
    console.log(`[w-flow] Initializing data engine, vault: ${this.vaultPath}`);
    setStoragePath(this.storagePath);
    await scanVault(this.vaultPath);
    const count = await getFileCount();
    console.log(`[w-flow] Database has ${count} files`);
  }

  async loadBaseFromContent(content: string, filePath: string): Promise<void> {
    this.baseFilePath = filePath;
    if (!content.trim()) {
      // Empty base file - show all files
      this.config = {
        views: [{
          type: "table",
          name: "ALL",
          order: ["file.name", "file.folder", "file.tags", "file.size"],
          sort: [{ property: "file.name", direction: "ASC" }],
        }],
      };
      this.topLevelFilter = undefined;
    } else {
      this.config = parseBaseFile(content);
      this.topLevelFilter = this.config.filters
        ? parseFilterGroup(this.config.filters as Record<string, unknown>)
        : undefined;
    }

    if (this.config.views.length > 0) {
      await this.setActiveView(this.config.views[0].name);
    }
  }

  async setActiveView(viewName: string): Promise<void> {
    this.activeViewName = viewName;
    const view = this.config?.views.find((v) => v.name === viewName);
    this.viewLevelFilter = view?.filters
      ? parseFilterGroup(view.filters as Record<string, unknown>)
      : undefined;
    this.emitTableData();
  }

  async refresh(): Promise<void> {
    await scanVault(this.vaultPath);
    this.emitTableData();
  }

  async onFileChanged(relativePath: string): Promise<void> {
    await updateFile(this.vaultPath, relativePath);
    this.emitTableData();
  }

  async onFileDeleted(relativePath: string): Promise<void> {
    await removeFile(relativePath);
    this.emitTableData();
  }

  private async emitTableData(): Promise<void> {
    if (!this.onTableData) {
      return;
    }
    this.onTableData(await this.buildTableData());
  }

  private async buildTableData(): Promise<TableDataMessage> {
    if (!this.config) {
      return {
        type: "updateTable",
        columns: [],
        rows: [],
        viewTabs: [],
        activeView: "",
        baseFiles: [],
        activeBaseFile: "",
      };
    }

    const view = this.config.views.find((v) => v.name === this.activeViewName);
    if (!view) {
      return {
        type: "updateTable",
        columns: [],
        rows: [],
        viewTabs: this.config.views.map((v) => v.name),
        activeView: this.activeViewName,
        baseFiles: [],
        activeBaseFile: this.baseFilePath,
      };
    }

    // Get all files from database
    const allFiles = await getAllFiles();

    // Filter entries
    const entries: FileEntry[] = [];
    for (const entry of allFiles) {
      if (evaluateEntry(entry, this.topLevelFilter, this.viewLevelFilter)) {
        entries.push(entry);
      }
    }

    // Sort
    sortEntries(entries, view.sort);

    // Build columns
    const columns: ColumnDef[] = view.order.map((key) => ({
      key,
      label: formatColumnLabel(key),
      width: view.columnSize?.[key],
    }));

    // Build rows
    const rows: RowData[] = entries.map((entry) => ({
      cells: buildCells(entry, view.order),
      filePath: entry.fullPath,
    }));

    return {
      type: "updateTable",
      columns,
      rows,
      viewTabs: this.config.views.map((v) => v.name),
      activeView: this.activeViewName,
      baseFiles: [],
      activeBaseFile: this.baseFilePath,
    };
  }
}

function sortEntries(entries: FileEntry[], sortConfig: SortConfig[]): void {
  if (sortConfig.length === 0) {
    return;
  }
  entries.sort((a, b) => {
    for (const sort of sortConfig) {
      const aVal = resolveSortValue(a, sort.property);
      const bVal = resolveSortValue(b, sort.property);
      const cmp = compareValues(aVal, bVal);
      if (cmp !== 0) {
        return sort.direction === "DESC" ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function resolveSortValue(entry: FileEntry, property: string): unknown {
  if (property.startsWith("file.")) {
    const key = property.slice(5) as keyof typeof entry.file;
    return entry.file[key];
  }
  return entry.frontmatter[property];
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }
  if (a === null || a === undefined) {
    return -1;
  }
  if (b === null || b === undefined) {
    return 1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.join(", ").localeCompare(b.join(", "));
  }
  return String(a).localeCompare(String(b));
}

function formatColumnLabel(key: string): string {
  const parts = key.split(".");
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function buildCells(entry: FileEntry, order: string[]): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const key of order) {
    let value: unknown;
    if (key.startsWith("file.")) {
      const fileKey = key.slice(5) as keyof typeof entry.file;
      value = entry.file[fileKey];
    } else {
      value = entry.frontmatter[key];
    }
    cells[key] = formatCellValue(value);
  }
  return cells;
}

function formatCellValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return formatFileSize(value);
  }
  return String(value);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- File metadata ---

export interface FileProperties {
  name: string;        // filename without extension
  folder: string;      // relative folder path from vault root
  ext: string;         // file extension without dot
  size: number;        // file size in bytes
  path: string;        // relative path from vault root
  tags: string[];      // from frontmatter, also exposed as file.tags
}

export interface FrontmatterData {
  [key: string]: unknown;
  status?: string | string[];
  date?: string;
  tags?: string | string[];
  desc?: string;
  aliases?: string[];
}

export interface FileEntry {
  file: FileProperties;
  frontmatter: FrontmatterData;
  fullPath: string;    // absolute path on disk
}

// --- .base config ---

export interface BaseConfig {
  filters?: FilterGroup;
  views: ViewConfig[];
  formulas?: Record<string, string>;
  properties?: Record<string, { displayName?: string }>;
}

export interface ViewConfig {
  type: "table";
  name: string;
  filters?: FilterGroup;
  order: string[];
  sort: SortConfig[];
  columnSize?: Record<string, number>;
  cardSize?: number;
}

export interface FilterGroup {
  and?: (string | FilterGroup)[];
  or?: (string | FilterGroup)[];
  not?: (string | FilterGroup)[];
}

export interface SortConfig {
  property: string;
  direction: "ASC" | "DESC";
}

// --- Filter AST ---

export type FilterNode =
  | { kind: "method"; property: string; method: string; args: string[] }
  | { kind: "comparison"; property: string; operator: string; value: string }
  | { kind: "and"; children: FilterNode[] }
  | { kind: "or"; children: FilterNode[] }
  | { kind: "not"; child: FilterNode };

// --- View state (messages between extension and webview) ---

export interface TableDataMessage {
  type: "updateTable";
  columns: ColumnDef[];
  rows: RowData[];
  viewTabs: string[];
  activeView: string;
  baseFiles: string[];
  activeBaseFile: string;
  allProperties: string[];
  sort: SortConfig[];
}

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
}

export interface RowData {
  cells: Record<string, string>;
  filePath: string;
}

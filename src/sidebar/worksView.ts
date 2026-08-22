import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { VAULT_PATH, HIDDEN_DIRS } from "../shared/constants";

interface WorkFolder {
  name: string;
  date: Date | null;
  uri: vscode.Uri;
}

class WorkItem extends vscode.TreeItem {
  constructor(work: WorkFolder) {
    super(work.name, vscode.TreeItemCollapsibleState.None);
    this.tooltip = work.uri.fsPath;
    this.iconPath = new vscode.ThemeIcon("folder");
    this.resourceUri = work.uri;
    this.command = {
      command: "vscode.openFolder",
      title: "Open as Workspace",
      arguments: [work.uri, { forceNewWindow: false }],
    };
  }
}

export class WorksViewProvider implements vscode.TreeDataProvider<WorkItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<WorkItem[]> {
    const works = await this.collectWorks(path.join(VAULT_PATH, "works"));
    works.sort((a, b) => {
      const ta = a.date?.getTime() ?? 0;
      const tb = b.date?.getTime() ?? 0;
      return tb - ta;
    });
    return works.map((work) => new WorkItem(work));
  }

  private async collectWorks(dir: string): Promise<WorkFolder[]> {
    const works: WorkFolder[] = [];
    await this.walk(dir, dir, 0, works);
    return works;
  }

  private async walk(dir: string, root: string, depth: number, result: WorkFolder[]): Promise<void> {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (HIDDEN_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (depth === 2) {
        const rel = path.relative(root, fullPath).split(path.sep);
        result.push({ name: entry.name, date: this.parseDate(rel), uri: vscode.Uri.file(fullPath) });
      } else {
        await this.walk(fullPath, root, depth + 1, result);
      }
    }
  }

  private parseDate(relParts: string[]): Date | null {
    const match = relParts[1]?.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return null;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { VAULT_PATH, HIDDEN_DIRS } from "../shared/constants";
import { parseFrontmatter } from "../shared/frontmatterParser";

interface NoteFile {
  name: string;
  date: Date | null;
  dateLabel: string;
  uri: vscode.Uri;
}

class NoteItem extends vscode.TreeItem {
  constructor(note: NoteFile) {
    super(note.name, vscode.TreeItemCollapsibleState.None);
    this.description = note.dateLabel;
    this.tooltip = note.uri.fsPath;
    this.iconPath = new vscode.ThemeIcon("file-text");
    this.resourceUri = note.uri;
    this.command = {
      command: "vscode.open",
      title: "Open Note",
      arguments: [note.uri],
    };
  }
}

export class NotesViewProvider implements vscode.TreeDataProvider<NoteItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<NoteItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly folders = ["notes", "inbox"];
  private cachedNotes: NoteFile[] = [];

  refresh(): void {
    this.cachedNotes = [];
    this._onDidChangeTreeData.fire();
  }

  async getCount(): Promise<number> {
    return (await this.loadNotes()).length;
  }

  getTreeItem(element: NoteItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<NoteItem[]> {
    return (await this.loadNotes()).map((note) => new NoteItem(note));
  }

  private async loadNotes(): Promise<NoteFile[]> {
    if (this.cachedNotes.length === 0) {
      const notes = (
        await Promise.all(this.folders.map((folder) => this.collectNotes(folder)))
      ).flat();
      notes.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
      this.cachedNotes = notes;
    }
    return this.cachedNotes;
  }

  private async collectNotes(folder: string): Promise<NoteFile[]> {
    const notes: NoteFile[] = [];
    await this.collect(path.join(VAULT_PATH, folder), notes);
    return notes;
  }

  private async collect(dir: string, result: NoteFile[]): Promise<void> {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (HIDDEN_DIRS.has(entry.name)) {
          continue;
        }
        await this.collect(path.join(dir, entry.name), result);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const note = await this.buildNote(path.join(dir, entry.name));
        if (note) {
          result.push(note);
        }
      }
    }
  }

  private async buildNote(fullPath: string): Promise<NoteFile | null> {
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      const frontmatter = parseFrontmatter(content);
      let date: Date | null = null;
      let dateLabel = "";
      const raw = frontmatter?.date;
      if (typeof raw === "string") {
        const parsed = new Date(raw.replace(" ", "T"));
        if (!Number.isNaN(parsed.getTime())) {
          date = parsed;
          dateLabel = raw;
        }
      }
      if (!date) {
        const stat = await fs.stat(fullPath);
        date = stat.mtime;
      }
      return {
        name: path.basename(fullPath, ".md"),
        date,
        dateLabel,
        uri: vscode.Uri.file(fullPath),
      };
    } catch {
      return null;
    }
  }
}
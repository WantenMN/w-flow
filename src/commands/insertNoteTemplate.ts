import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export async function insertNoteTemplate() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const filePath = editor.document.fileName;
  const name = path.basename(filePath, path.extname(filePath));

  let dateStr: string;
  try {
    const stat = fs.statSync(filePath);
    const ctime = stat.birthtime;
    const y = ctime.getFullYear().toString();
    const m = (ctime.getMonth() + 1).toString().padStart(2, "0");
    const d = ctime.getDate().toString().padStart(2, "0");
    const h = ctime.getHours().toString().padStart(2, "0");
    const min = ctime.getMinutes().toString().padStart(2, "0");
    dateStr = `${y}-${m}-${d} ${h}:${min}`;
  } catch {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    const h = now.getHours().toString().padStart(2, "0");
    const min = now.getMinutes().toString().padStart(2, "0");
    dateStr = `${y}-${m}-${d} ${h}:${min}`;
  }

  const snippet = [
    "---",
    `date: ${dateStr}`,
    "tags:",
    "status:",
    "  - P0",
    "  - Not_Started",
    "aliases:",
    `  - ${name}`,
    "---",
    "",
    `# ${name}`,
    "",
    "",
  ].join("\n");

  const firstLine = new vscode.Position(0, 0);
  editor.edit((builder) => {
    builder.insert(firstLine, snippet);
  });
}

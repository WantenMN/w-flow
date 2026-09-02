import * as vscode from "vscode";
import { parseFrontmatter } from "../shared/frontmatterParser";

export async function insertNoteTemplate() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const document = editor.document;

  if (parseFrontmatter(document.getText())) {
    vscode.window.showInformationMessage("Frontmatter already exists");
    return;
  }

  const now = new Date();
  const y = now.getFullYear().toString();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const h = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const dateStr = `${y}-${m}-${d} ${h}:${min}`;

  const snippet = [
    "---",
    `date: ${dateStr}`,
    "---",
    "",
    "",
  ].join("\n");

  const firstLine = new vscode.Position(0, 0);
  await editor.edit((builder) => {
    builder.insert(firstLine, snippet);
  });
}

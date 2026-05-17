import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { VAULT_PATH } from "../dataView/constants";

export async function createNote() {
  const name = await vscode.window.showInputBox({
    prompt: "Enter note name",
    placeHolder: "My Note",
  });
  if (!name) {
    return;
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  const dateStr = `${year}-${month}-${day} ${hour}:${minute}`;

  const dir = path.join(VAULT_PATH, "99-all", year, `${year}-${month}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${name}.md`);
  if (fs.existsSync(filePath)) {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
    return;
  }

  const content = [
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

  fs.writeFileSync(filePath, content, "utf-8");
  const doc = await vscode.workspace.openTextDocument(filePath);
  const editor = await vscode.window.showTextDocument(doc);
  const lastLine = doc.lineCount - 1;
  const pos = new vscode.Position(lastLine, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));
}

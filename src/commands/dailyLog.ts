import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export async function openDailyLog() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");

  const basePath = path.join(os.homedir(), "repos", "vault", "00-logs");
  const yearPath = path.join(basePath, year);
  const monthPath = path.join(yearPath, `${year}-${month}`);
  const filePath = path.join(monthPath, `${year}-${month}-${day}.md`);
  const currentTime = `${year}-${month}-${day} ${hour}:${minute}`;

  if (!fs.existsSync(monthPath)) {
    fs.mkdirSync(monthPath, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    const content = `---\ndate: ${currentTime}\ntags:\n  - Daily_Log\n---\n\n# ${year}-${month}-${day}\n\n## ${hour}:${minute}\n\n`;
    fs.writeFileSync(filePath, content);
  }

  const document = await vscode.workspace.openTextDocument(filePath);
  const editor = await vscode.window.showTextDocument(document);

  const lastLine = document.lineCount - 1;
  const lastChar = document.lineAt(lastLine).text.length;
  const position = new vscode.Position(lastLine, lastChar);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position));
}

import * as vscode from "vscode";

const TIME_HEADING_RE = /^## \d{2}:\d{2}$/;

export async function insertTime() {
  await vscode.commands.executeCommand("w-flow.openDailyLog");

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const text = document.getText();
  const trimmedText = text.trimEnd();
  const lastNewline = trimmedText.lastIndexOf("\n");
  const lastLine = lastNewline === -1 ? trimmedText : trimmedText.slice(lastNewline + 1);

  if (TIME_HEADING_RE.test(lastLine)) {
    const timeStart = document.positionAt(trimmedText.length - lastLine.length + 3);
    const endPos = document.positionAt(text.length);
    await editor.edit((editBuilder) => {
      editBuilder.replace(new vscode.Range(timeStart, endPos), `${timestamp}\n\n`);
    });
  } else {
    const startOffset = trimmedText.length;
    const endOffset = text.length;
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(endOffset);

    const insertText = `\n\n## ${timestamp}\n\n`;
    await editor.edit((editBuilder) => {
      editBuilder.delete(new vscode.Range(startPos, endPos));
      editBuilder.insert(startPos, insertText);
    });
  }

  const newLastLine = document.lineCount - 1;
  const newLastChar = document.lineAt(newLastLine).text.length;
  const newPosition = new vscode.Position(newLastLine, newLastChar);
  editor.selection = new vscode.Selection(newPosition, newPosition);
  editor.revealRange(new vscode.Range(newPosition, newPosition));
}
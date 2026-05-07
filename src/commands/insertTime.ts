import * as vscode from "vscode";

export async function insertTime() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  // 1. Get the full text and find the end position after trimming trailing whitespace
  const text = document.getText();
  const trimmedText = text.trimEnd();

  // 2. Calculate the position where we want to insert (after trimmed content)
  // We'll replace everything from the trimmed end to the actual end of document
  const startOffset = trimmedText.length;
  const endOffset = text.length;

  const startPos = document.positionAt(startOffset);
  const endPos = document.positionAt(endOffset);
  const rangeToDelete = new vscode.Range(startPos, endPos);

  const insertText = `\n\n## ${timestamp}\n\n`;

  await editor.edit((editBuilder) => {
    // Delete trailing whitespace and insert the new header
    editBuilder.delete(rangeToDelete);
    editBuilder.insert(startPos, insertText);
  });

  // 3. Move cursor to the end
  const newLastLine = document.lineCount - 1;
  const newLastChar = document.lineAt(newLastLine).text.length;
  const newPosition = new vscode.Position(newLastLine, newLastChar);
  editor.selection = new vscode.Selection(newPosition, newPosition);
  editor.revealRange(new vscode.Range(newPosition, newPosition));
}

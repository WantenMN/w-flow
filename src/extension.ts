import * as vscode from "vscode";
import * as path from "path";
import { openDailyLog } from "./commands/dailyLog";
import { insertTime } from "./commands/insertTime";
import { BaseEditorProvider } from "./dataView/baseEditorProvider";
import { VAULT_PATH } from "./dataView/constants";

export function activate(context: vscode.ExtensionContext) {
  // Register custom editor for .base files
  const baseEditorProvider = new BaseEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      BaseEditorProvider.viewType,
      baseEditorProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  // File watchers for auto-indexing
  const mdWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(VAULT_PATH, "**/*.md"),
  );
  mdWatcher.onDidChange((uri) => {
    const rel = path.relative(VAULT_PATH, uri.fsPath);
    baseEditorProvider.engine.onFileChanged(rel);
  });
  mdWatcher.onDidCreate((uri) => {
    const rel = path.relative(VAULT_PATH, uri.fsPath);
    baseEditorProvider.engine.onFileChanged(rel);
  });
  mdWatcher.onDidDelete((uri) => {
    const rel = path.relative(VAULT_PATH, uri.fsPath);
    baseEditorProvider.engine.onFileDeleted(rel);
  });
  context.subscriptions.push(mdWatcher);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("w-flow.openDailyLog", openDailyLog),
    vscode.commands.registerCommand("w-flow.insertTime", insertTime),
    vscode.commands.registerCommand("w-flow.openDataView", async () => {
      const baseFiles = await vscode.workspace.findFiles("*.base");
      if (baseFiles.length > 0) {
        const items = baseFiles.map((f) => ({
          label: path.basename(f.fsPath),
          uri: f,
        }));
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Select a base file to open",
        });
        if (selected) {
          await vscode.commands.executeCommand("vscode.openWith", selected.uri, BaseEditorProvider.viewType);
        }
      } else {
        const name = await vscode.window.showInputBox({
          prompt: "Enter base file name",
          value: "ALL.base",
        });
        if (name) {
          const uri = vscode.Uri.joinPath(vscode.Uri.file(VAULT_PATH), name);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(""));
          await vscode.commands.executeCommand("vscode.openWith", uri, BaseEditorProvider.viewType);
        }
      }
    }),
  );
}

export function deactivate() {}

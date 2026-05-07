import * as vscode from "vscode";
import { openDailyLog } from "./commands/dailyLog";
import { insertTime } from "./commands/insertTime";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("w-flow.openDailyLog", openDailyLog),
    vscode.commands.registerCommand("w-flow.insertTime", insertTime),
  );
}

export function deactivate() {}

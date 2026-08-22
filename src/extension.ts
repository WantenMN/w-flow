import * as vscode from "vscode";
import { openDailyLog } from "./commands/dailyLog";
import { insertTime } from "./commands/insertTime";
import { createNote } from "./commands/createNote";
import { insertNoteTemplate } from "./commands/insertNoteTemplate";
import { CommandsViewProvider } from "./sidebar/commandsView";
import { NotesViewProvider } from "./sidebar/notesView";

export function activate(context: vscode.ExtensionContext) {
  // Register sidebar commands view
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("w-flow.commandsView", new CommandsViewProvider()),
  );

  // Register sidebar notes view
  const notesViewProvider = new NotesViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("w-flow.notesView", notesViewProvider),
    vscode.commands.registerCommand("w-flow.refreshNotes", () => notesViewProvider.refresh()),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("w-flow.openDailyLog", openDailyLog),
    vscode.commands.registerCommand("w-flow.insertTime", insertTime),
    vscode.commands.registerCommand("w-flow.createNote", createNote),
    vscode.commands.registerCommand("w-flow.insertNoteTemplate", insertNoteTemplate),
  );
}

export function deactivate() {}
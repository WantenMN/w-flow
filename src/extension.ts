import * as vscode from "vscode";
import { openDailyLog } from "./commands/dailyLog";
import { insertTime } from "./commands/insertTime";
import { createNote } from "./commands/createNote";
import { insertNoteTemplate } from "./commands/insertNoteTemplate";
import { CommandsViewProvider } from "./sidebar/commandsView";
import { NotesViewProvider } from "./sidebar/notesView";
import { WorksViewProvider } from "./sidebar/worksView";
import { VAULT_PATH } from "./shared/constants";

export function activate(context: vscode.ExtensionContext) {
  // Register sidebar commands view
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("w-flow.commandsView", new CommandsViewProvider()),
  );

  // Register sidebar notes view
  const notesViewProvider = new NotesViewProvider();
  const notesTreeView = vscode.window.createTreeView("w-flow.notesView", {
    treeDataProvider: notesViewProvider,
  });
  const updateNotesCount = async () => {
    notesTreeView.description = String(await notesViewProvider.getCount());
  };
  context.subscriptions.push(
    notesTreeView,
    vscode.commands.registerCommand("w-flow.refreshNotes", async () => {
      notesViewProvider.refresh();
      await updateNotesCount();
    }),
  );
  void updateNotesCount();

  // Register sidebar works view
  const worksViewProvider = new WorksViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("w-flow.worksView", worksViewProvider),
    vscode.commands.registerCommand("w-flow.refreshWorks", () => worksViewProvider.refresh()),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("w-flow.openVault", () =>
      vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(VAULT_PATH), {
        forceNewWindow: false,
      }),
    ),
    vscode.commands.registerCommand("w-flow.openDailyLog", openDailyLog),
    vscode.commands.registerCommand("w-flow.insertTime", insertTime),
    vscode.commands.registerCommand("w-flow.createNote", createNote),
    vscode.commands.registerCommand("w-flow.insertNoteTemplate", insertNoteTemplate),
  );
}

export function deactivate() {}
import * as vscode from "vscode";

class CommandItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly commandId: string,
    icon: vscode.ThemeIcon,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = icon;
    this.command = { command: commandId, title: label };
  }
}

export class CommandsViewProvider implements vscode.TreeDataProvider<CommandItem> {
  private readonly items: CommandItem[] = [
    new CommandItem("Open Daily Log", "w-flow.openDailyLog", new vscode.ThemeIcon("notebook")),
    new CommandItem("Create Note", "w-flow.createNote", new vscode.ThemeIcon("file-add")),
  ];

  getTreeItem(element: CommandItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: CommandItem): CommandItem[] {
    return _element ? [] : this.items;
  }
}
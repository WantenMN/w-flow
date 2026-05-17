import * as vscode from "vscode";
import * as fs from "fs/promises";
import { DataEngine } from "./dataEngine";
import { getBaseEditorHtml } from "./baseEditorHtml";
import { getFilterEditorHtml } from "./filterEditorHtml";
import { parseFilterExpression } from "./filterParser";
import { VAULT_PATH } from "./constants";
import type { TableDataMessage, FilterGroup, FilterNode } from "./types";

interface FilterCondition {
  property: string;
  method: string;
  value: string;
}

interface FilterGroupUI {
  logic: "and" | "or" | "none";
  conditions: FilterCondition[];
}

export class BaseEditorProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = "w-flow.baseEditor";

  public readonly engine: DataEngine;
  private filterPanel: vscode.WebviewPanel | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    const storageUri = context.storageUri ?? context.globalStorageUri;
    this.engine = new DataEngine(VAULT_PATH, storageUri.fsPath);
  }

  async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const webview = webviewPanel.webview;

    webview.options = { enableScripts: true };
    webview.html = getBaseEditorHtml(webview, this.context.extensionUri);

    // Load the .base file content
    let baseContent: string;
    try {
      baseContent = await fs.readFile(document.uri.fsPath, "utf-8");
    } catch {
      baseContent = "";
    }

    // Initialize engine
    this.engine.onTableData = (data: TableDataMessage) => {
      webview.postMessage(data);
    };

    // Handle messages from webview
    webview.onDidReceiveMessage(async (msg) => {
      try {
        switch (msg.type) {
          case "ready":
            await this.engine.initialize();
            await this.engine.loadBaseFromContent(baseContent, document.uri.fsPath);
            webview.postMessage({ type: "baseContent", content: baseContent });
            // Send filter info
            webview.postMessage({
              type: "filterInfo",
              info: this.parseFilterInfo(baseContent),
            });
            break;

          case "changeView":
            await this.engine.setActiveView(msg.viewName);
            // Update filter info for the new view
            webview.postMessage({
              type: "filterInfo",
              info: this.parseFilterInfo(baseContent),
            });
            break;

          case "sortColumn":
            await this.engine.setActiveView(this.engine.getActiveViewName());
            break;

          case "openFile":
            await this.openFile(msg.filePath);
            break;

          case "refresh":
            await this.engine.refresh();
            await this.engine.loadBaseFromContent(baseContent, document.uri.fsPath);
            webview.postMessage({ type: "baseContent", content: baseContent });
            webview.postMessage({
              type: "filterInfo",
              info: this.parseFilterInfo(baseContent),
            });
            break;

          case "openFilterEditor": {
            // Read fresh content from disk to ensure filter editor has latest data
            let freshContent: string;
            try {
              freshContent = await fs.readFile(document.uri.fsPath, "utf-8");
            } catch {
              freshContent = baseContent;
            }
            this.openFilterEditor(webview, freshContent, document.uri);
            break;
          }

          case "openSource":
            await vscode.commands.executeCommand("vscode.openWith", document.uri, "default");
            break;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[w-flow] Editor error: ${errMsg}`);
        webview.postMessage({ type: "showError", message: errMsg });
      }
    });
  }

  private openFilterEditor(mainWebview: vscode.Webview, baseContent: string, uri: vscode.Uri): void {
    if (this.filterPanel) {
      this.filterPanel.reveal(vscode.ViewColumn.Active);
      return;
    }

    this.filterPanel = vscode.window.createWebviewPanel(
      "w-flow.filterEditor",
      "Filter Editor",
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true },
    );

    this.filterPanel.webview.html = getFilterEditorHtml();

    // Parse current filters
    const filterInfo = this.parseFilterInfo(baseContent);
    const activeView = this.engine.getActiveViewName();

    // Send initial data to filter editor
    this.filterPanel.webview.postMessage({
      type: "initFilterEditor",
      globalFilters: filterInfo.global,
      viewFilters: filterInfo.view,
      viewName: activeView,
    });

    // Handle messages from filter editor
    this.filterPanel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "filterEditorReady":
          // Resend initial data
          this.filterPanel?.webview.postMessage({
            type: "initFilterEditor",
            globalFilters: filterInfo.global,
            viewFilters: filterInfo.view,
            viewName: activeView,
          });
          break;

        case "saveFilters":
          console.log("[w-flow] Saving filters:", {
            globalFilters: msg.globalFilters,
            viewFilters: msg.viewFilters,
            viewName: msg.viewName,
          });
          baseContent = this.buildBaseContent(baseContent, msg.globalFilters, msg.viewFilters, msg.viewName);
          console.log("[w-flow] New base content:", baseContent);
          await fs.writeFile(uri.fsPath, baseContent, "utf-8");
          await this.engine.loadBaseFromContent(baseContent, uri.fsPath);
          mainWebview.postMessage({ type: "baseContent", content: baseContent });
          mainWebview.postMessage({
            type: "filterInfo",
            info: this.parseFilterInfo(baseContent),
          });
          this.filterPanel?.dispose();
          break;

        case "cancelFilterEditor":
          this.filterPanel?.dispose();
          break;
      }
    });

    this.filterPanel.onDidDispose(() => {
      this.filterPanel = null;
    });
  }

  private parseFilterInfo(content: string): { global: FilterGroupUI[]; view: FilterGroupUI[] } {
    if (!content.trim()) {
      return { global: [], view: [] };
    }

    try {
      const yaml = require("yaml");
      const raw = yaml.parse(content);

      const global = this.extractFilterGroups(raw?.filters);
      const viewName = this.engine.getActiveViewName();
      let view: FilterGroupUI[] = [];

      if (raw?.views && Array.isArray(raw.views)) {
        const currentView = raw.views.find((v: Record<string, unknown>) => v.name === viewName);
        if (currentView?.filters) {
          view = this.extractFilterGroups(currentView.filters);
        }
      }

      return { global, view };
    } catch {
      return { global: [], view: [] };
    }
  }

  private extractFilterGroups(filters: unknown): FilterGroupUI[] {
    if (!filters || typeof filters !== "object") {
      return [];
    }

    const groups: FilterGroupUI[] = [];
    const obj = filters as Record<string, unknown>;

    for (const logic of ["and", "or", "not"]) {
      if (Array.isArray(obj[logic])) {
        const conditions: FilterCondition[] = [];
        for (const item of obj[logic]) {
          if (typeof item === "string") {
            const parsed = this.parseConditionString(item);
            if (parsed) {
              conditions.push(parsed);
            }
          } else if (typeof item === "object" && item !== null) {
            // Nested group (e.g., not: [...])
            const nestedGroups = this.extractFilterGroups(item);
            for (const nested of nestedGroups) {
              conditions.push(...nested.conditions);
            }
          }
        }
        if (conditions.length > 0) {
          // Map "not" to "none" for the UI
          const uiLogic = logic === "not" ? "none" : (logic as "and" | "or");
          groups.push({ logic: uiLogic, conditions });
        }
      }
    }

    return groups;
  }

  private parseConditionString(expr: string): FilterCondition | null {
    // Use the recursive descent parser instead of regex
    let cleanExpr = expr.trim();

    // Remove surrounding quotes if present (YAML may add them)
    if ((cleanExpr.startsWith("'") && cleanExpr.endsWith("'")) ||
        (cleanExpr.startsWith('"') && cleanExpr.endsWith('"'))) {
      cleanExpr = cleanExpr.slice(1, -1).trim();
    }

    try {
      const node = parseFilterExpression(cleanExpr);
      return this.astNodeToCondition(node);
    } catch (err) {
      console.warn(`[w-flow] Failed to parse filter expression: "${cleanExpr}"`, err);
      return null;
    }
  }

  private astNodeToCondition(node: FilterNode): FilterCondition | null {
    // Handle negated node
    if (node.kind === "not") {
      const inner = this.astNodeToCondition(node.child);
      if (inner) {
        // Prefix method with ! to indicate negation
        if (!inner.method.startsWith("!")) {
          inner.method = `!${inner.method}`;
        }
        return inner;
      }
      return null;
    }

    // Handle method call
    if (node.kind === "method") {
      return {
        property: node.property,
        method: node.method,
        value: node.args.join(", "),
      };
    }

    // Handle comparison
    if (node.kind === "comparison") {
      return {
        property: node.property,
        method: node.operator,
        value: node.value,
      };
    }

    return null;
  }

  private buildBaseContent(
    existingContent: string,
    globalFilters: FilterGroupUI[],
    viewFilters: FilterGroupUI[],
    viewName: string,
  ): string {
    let raw: Record<string, unknown> = {};

    if (existingContent.trim()) {
      try {
        const yaml = require("yaml");
        raw = yaml.parse(existingContent) || {};
      } catch {
        raw = {};
      }
    }

    // Build global filters - preserve all other top-level keys (formulas, properties, etc.)
    const globalGroup = this.buildFilterGroup(globalFilters);
    if (globalGroup) {
      raw.filters = globalGroup;
    } else {
      delete raw.filters;
    }

    // Build view filters
    if (!raw.views || !Array.isArray(raw.views)) {
      raw.views = [{ type: "table", name: viewName || "ALL", order: ["file.name", "file.tags", "status", "date"], sort: [{ property: "date", direction: "DESC" }] }];
    }

    const viewIndex = (raw.views as Record<string, unknown>[]).findIndex(v => v.name === viewName);
    if (viewIndex >= 0) {
      const viewGroup = this.buildFilterGroup(viewFilters);
      if (viewGroup) {
        (raw.views as Record<string, unknown>[])[viewIndex].filters = viewGroup;
      } else {
        delete (raw.views as Record<string, unknown>[])[viewIndex].filters;
      }
    }

    const yaml = require("yaml");
    return yaml.stringify(raw, { lineWidth: -1 });
  }

  private buildFilterGroup(groups: FilterGroupUI[]): FilterGroup | undefined {
    if (groups.length === 0) {
      return undefined;
    }

    if (groups.length === 1) {
      return this.buildSingleGroup(groups[0]);
    }

    // Multiple groups: nest them under "and" so each group's logic is preserved
    const nested: FilterGroup[] = [];
    for (const group of groups) {
      const built = this.buildSingleGroup(group);
      if (built) {
        nested.push(built);
      }
    }
    if (nested.length === 0) {
      return undefined;
    }
    if (nested.length === 1) {
      return nested[0];
    }
    return { and: nested };
  }

  private buildSingleGroup(group: FilterGroupUI): FilterGroup | undefined {
    if (group.conditions.length === 0) {
      return undefined;
    }

    const conditions: string[] = [];
    for (const cond of group.conditions) {
      let expr = "";
      if (cond.method.startsWith("!")) {
        expr = `!${cond.property}.${cond.method.slice(1)}("${cond.value}")`;
      } else if (["!=", "==", ">", "<", ">=", "<="].includes(cond.method)) {
        expr = `${cond.property} ${cond.method} "${cond.value}"`;
      } else {
        expr = `${cond.property}.${cond.method}("${cond.value}")`;
      }
      conditions.push(expr);
    }

    if (group.logic === "none") {
      return { not: [{ and: conditions }] };
    }

    return { [group.logic]: conditions };
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    } catch {
      vscode.window.showErrorMessage(`Cannot open file: ${filePath}`);
    }
  }
}

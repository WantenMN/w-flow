import * as vscode from "vscode";

export function getBaseEditorHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    .header h2 {
      font-size: 14px;
      font-weight: 600;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 4px 12px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* Main layout */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Filter bar */
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-editorWidget-background);
      flex-shrink: 0;
    }
    .filter-bar .filter-summary {
      flex: 1;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .filter-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 3px;
      font-size: 11px;
      margin-right: 4px;
    }

    /* View tabs */
    .view-tabs {
      display: flex;
      gap: 0;
      padding: 0 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    .view-tab {
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      font-size: 13px;
      opacity: 0.7;
    }
    .view-tab:hover { opacity: 1; }
    .view-tab.active {
      opacity: 1;
      border-bottom-color: var(--vscode-focusBorder);
    }

    /* Table */
    .table-container {
      flex: 1;
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--vscode-editorStickyScroll-background);
    }
    th {
      text-align: left;
      padding: 6px 12px;
      font-weight: 600;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th:hover {
      background: var(--vscode-list-hoverBackground);
    }
    th .sort-indicator {
      margin-left: 4px;
      font-size: 10px;
      opacity: 0.6;
    }
    td {
      padding: 4px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
    }
    tr.data-row {
      cursor: pointer;
    }
    tr.data-row:hover {
      background: var(--vscode-list-hoverBackground);
    }

    /* Status bar */
    .status-bar {
      padding: 4px 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-statusBar-background);
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--vscode-descriptionForeground);
      padding: 40px;
      text-align: center;
    }
    .empty-state p {
      margin-top: 8px;
      font-size: 12px;
    }

    /* Error */
    .error {
      color: var(--vscode-errorForeground);
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 8px 12px;
      margin: 12px;
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Base Editor</h2>
    <div class="header-actions">
      <button class="btn btn-secondary" id="filterBtn">Filters</button>
      <button class="btn btn-secondary" id="refreshBtn">Refresh</button>
      <button class="btn btn-secondary" id="sourceBtn">View Source</button>
    </div>
  </div>

  <div class="main">
    <div class="filter-bar">
      <span class="filter-summary" id="filterSummary">No filters</span>
    </div>

    <div class="view-tabs" id="viewTabs"></div>

    <div class="table-container" id="tableContainer">
      <div class="empty-state">
        <div>Loading...</div>
        <p>Scanning vault files</p>
      </div>
    </div>
  </div>

  <div class="status-bar">
    <span id="fileCount">0 files</span>
    <span id="filterStatus">No filters applied</span>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentData = null;
    let activeSortProperty = null;
    let activeSortDirection = 'ASC';
    let baseContent = '';
    let filterInfo = { global: [], view: [] };

    // Message handler
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'updateTable':
          currentData = msg;
          renderTable(msg);
          break;
        case 'baseContent':
          baseContent = msg.content;
          break;
        case 'filterInfo':
          filterInfo = msg.info;
          renderFilterSummary();
          break;
        case 'showError':
          showError(msg.message);
          break;
      }
    });

    // Button handlers
    document.getElementById('filterBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openFilterEditor' });
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    document.getElementById('sourceBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSource' });
    });

    function renderFilterSummary() {
      const summary = document.getElementById('filterSummary');
      const badges = [];

      if (filterInfo.global && filterInfo.global.length > 0) {
        badges.push('<span class="filter-badge">Global: ' + filterInfo.global.length + ' groups</span>');
      }
      if (filterInfo.view && filterInfo.view.length > 0) {
        badges.push('<span class="filter-badge">View: ' + filterInfo.view.length + ' groups</span>');
      }

      if (badges.length === 0) {
        summary.innerHTML = '<span style="color: var(--vscode-descriptionForeground)">No filters applied - showing all files</span>';
      } else {
        summary.innerHTML = badges.join('');
      }
    }

    function renderTable(data) {
      // Update view tabs
      const tabsContainer = document.getElementById('viewTabs');
      tabsContainer.innerHTML = '';
      for (const tab of data.viewTabs) {
        const div = document.createElement('div');
        div.className = 'view-tab' + (tab === data.activeView ? ' active' : '');
        div.textContent = tab;
        div.addEventListener('click', () => {
          vscode.postMessage({ type: 'changeView', viewName: tab });
        });
        tabsContainer.appendChild(div);
      }

      // Update table
      const container = document.getElementById('tableContainer');
      if (!data.columns || data.columns.length === 0 || !data.rows || data.rows.length === 0) {
        container.innerHTML = '<div class="empty-state"><div>No matching files</div><p>Try adjusting your filters</p></div>';
        document.getElementById('fileCount').textContent = '0 files';
        return;
      }

      container.innerHTML = '';
      const table = document.createElement('table');

      // Column widths
      const colgroup = document.createElement('colgroup');
      for (const col of data.columns) {
        const colEl = document.createElement('col');
        if (col.width) { colEl.style.width = col.width + 'px'; }
        colgroup.appendChild(colEl);
      }
      table.appendChild(colgroup);

      // Header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const col of data.columns) {
        const th = document.createElement('th');
        th.textContent = col.label;
        if (activeSortProperty === col.key) {
          const indicator = document.createElement('span');
          indicator.className = 'sort-indicator';
          indicator.textContent = activeSortDirection === 'ASC' ? '\\u25B2' : '\\u25BC';
          th.appendChild(indicator);
        }
        th.addEventListener('click', () => {
          if (activeSortProperty === col.key) {
            activeSortDirection = activeSortDirection === 'ASC' ? 'DESC' : 'ASC';
          } else {
            activeSortProperty = col.key;
            activeSortDirection = 'ASC';
          }
          vscode.postMessage({ type: 'sortColumn', property: col.key, direction: activeSortDirection });
        });
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body
      const tbody = document.createElement('tbody');
      for (const row of data.rows) {
        const tr = document.createElement('tr');
        tr.className = 'data-row';
        for (const col of data.columns) {
          const td = document.createElement('td');
          td.textContent = row.cells[col.key] || '';
          td.title = row.cells[col.key] || '';
          tr.appendChild(td);
        }
        tr.addEventListener('click', () => {
          vscode.postMessage({ type: 'openFile', filePath: row.filePath });
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);

      document.getElementById('fileCount').textContent = data.rows.length + ' files';
      document.getElementById('filterStatus').textContent = data.viewTabs.length > 0 ? data.activeView + ' view' : 'No view selected';
    }

    function showError(message) {
      const container = document.getElementById('tableContainer');
      container.innerHTML = '<div class="error">' + message + '</div>';
    }

    // Ready
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

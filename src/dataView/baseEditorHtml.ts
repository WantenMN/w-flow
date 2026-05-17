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

    /* Column picker */
    .col-picker-wrap {
      position: relative;
    }
    .col-picker-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      padding: 4px 0;
      min-width: 180px;
      max-height: 320px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .col-picker-dropdown.open { display: block; }
    .col-picker-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }
    .col-picker-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .col-picker-item input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
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
      position: relative;
    }
    th:hover {
      background: var(--vscode-list-hoverBackground);
    }
    th .sort-indicator {
      margin-left: 4px;
      font-size: 10px;
      opacity: 0.6;
    }
    /* Drag state */
    th.drag-over-left { box-shadow: inset 2px 0 0 var(--vscode-focusBorder); }
    th.drag-over-right { box-shadow: inset -2px 0 0 var(--vscode-focusBorder); }
    th.dragging { opacity: 0.4; }

    /* Resize handle */
    th .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 5px;
      height: 100%;
      cursor: col-resize;
      z-index: 2;
    }
    th .resize-handle:hover,
    th .resize-handle.active {
      background: var(--vscode-focusBorder);
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
      <div class="col-picker-wrap">
        <button class="btn btn-secondary" id="colPickerBtn">Columns</button>
        <div class="col-picker-dropdown" id="colPickerDropdown"></div>
      </div>
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
    let baseContent = '';
    let filterInfo = { global: [], view: [] };
    let allProperties = [];
    let currentOrder = [];
    let currentSort = [];

    // --- Message handler ---
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'updateTable':
          currentData = msg;
          allProperties = msg.allProperties || [];
          currentOrder = msg.columns.map(c => c.key);
          currentSort = msg.sort || [];
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

    // --- Button handlers ---
    document.getElementById('filterBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openFilterEditor' });
    });
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });
    document.getElementById('sourceBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSource' });
    });

    // --- Column picker ---
    const colPickerBtn = document.getElementById('colPickerBtn');
    const colPickerDropdown = document.getElementById('colPickerDropdown');

    colPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderColPicker();
      colPickerDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      colPickerDropdown.classList.remove('open');
    });

    colPickerDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    function renderColPicker() {
      colPickerDropdown.innerHTML = '';
      for (const prop of allProperties) {
        const item = document.createElement('label');
        item.className = 'col-picker-item';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = currentOrder.includes(prop);
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!currentOrder.includes(prop)) {
              currentOrder.push(prop);
            }
          } else {
            currentOrder = currentOrder.filter(k => k !== prop);
          }
          vscode.postMessage({ type: 'updateViewConfig', config: { order: currentOrder } });
        });
        item.appendChild(cb);
        item.appendChild(document.createTextNode(formatLabel(prop)));
        colPickerDropdown.appendChild(item);
      }
    }

    function formatLabel(key) {
      const parts = key.split('.');
      return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
    }

    // --- Filter summary ---
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

    // --- Table rendering ---
    function renderTable(data) {
      // View tabs
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

      // Table
      const container = document.getElementById('tableContainer');
      if (!data.columns || data.columns.length === 0 || !data.rows || data.rows.length === 0) {
        container.innerHTML = '<div class="empty-state"><div>No matching files</div><p>Try adjusting your filters</p></div>';
        document.getElementById('fileCount').textContent = '0 files';
        return;
      }

      container.innerHTML = '';
      const table = document.createElement('table');

      // Colgroup
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
      let dragSrcIndex = -1;

      for (let i = 0; i < data.columns.length; i++) {
        const col = data.columns[i];
        const th = document.createElement('th');
        th.draggable = true;
        th.dataset.colIndex = i;
        th.textContent = col.label;

        // Drag events for reordering
        th.addEventListener('dragstart', (e) => {
          dragSrcIndex = i;
          th.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', col.key);
        });
        th.addEventListener('dragend', () => {
          th.classList.remove('dragging');
          headerRow.querySelectorAll('th').forEach(h => {
            h.classList.remove('drag-over-left', 'drag-over-right');
          });
        });
        th.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const rect = th.getBoundingClientRect();
          const mid = rect.left + rect.width / 2;
          headerRow.querySelectorAll('th').forEach(h => {
            h.classList.remove('drag-over-left', 'drag-over-right');
          });
          if (e.clientX < mid) {
            th.classList.add('drag-over-left');
          } else {
            th.classList.add('drag-over-right');
          }
        });
        th.addEventListener('dragleave', () => {
          th.classList.remove('drag-over-left', 'drag-over-right');
        });
        th.addEventListener('drop', (e) => {
          e.preventDefault();
          th.classList.remove('drag-over-left', 'drag-over-right');
          if (dragSrcIndex < 0 || dragSrcIndex === i) return;
          const rect = th.getBoundingClientRect();
          const mid = rect.left + rect.width / 2;
          let insertIndex = e.clientX < mid ? i : i + 1;
          if (dragSrcIndex < insertIndex) insertIndex--;
          // Reorder
          const moved = currentOrder.splice(dragSrcIndex, 1)[0];
          currentOrder.splice(insertIndex, 0, moved);
          vscode.postMessage({ type: 'updateViewConfig', config: { order: currentOrder } });
          dragSrcIndex = -1;
        });

        // Sort indicator from server data
        const sortEntry = currentSort.find(s => s.property === col.key);
        if (sortEntry) {
          const indicator = document.createElement('span');
          indicator.className = 'sort-indicator';
          indicator.textContent = sortEntry.direction === 'ASC' ? '\\u25B2' : '\\u25BC';
          th.appendChild(indicator);
        }

        // Sort click
        th.addEventListener('click', (e) => {
          if (e.target.classList.contains('resize-handle')) return;
          const existing = currentSort.find(s => s.property === col.key);
          let newSort;
          if (existing) {
            const newDir = existing.direction === 'ASC' ? 'DESC' : 'ASC';
            newSort = [{ property: col.key, direction: newDir }];
          } else {
            newSort = [{ property: col.key, direction: 'ASC' }];
          }
          vscode.postMessage({ type: 'sortColumn', property: col.key, direction: newSort[0].direction });
        });

        // Resize handle
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handle.classList.add('active');
          const startX = e.clientX;
          const startWidth = col.width || th.offsetWidth;
          const colEl = colgroup.children[i];

          const onMove = (ev) => {
            const delta = ev.clientX - startX;
            const newWidth = Math.max(40, startWidth + delta);
            colEl.style.width = newWidth + 'px';
          };
          const onUp = (ev) => {
            handle.classList.remove('active');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const delta = ev.clientX - startX;
            const newWidth = Math.max(40, startWidth + delta);
            vscode.postMessage({ type: 'updateViewConfig', config: { columnSize: { [col.key]: newWidth } } });
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        th.appendChild(handle);

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

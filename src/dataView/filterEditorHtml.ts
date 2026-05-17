export function getFilterEditorHtml(): string {
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
      padding: 16px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--vscode-foreground);
    }

    h3 {
      font-size: 13px;
      font-weight: 600;
      margin: 16px 0 8px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section {
      margin-bottom: 20px;
      padding: 12px;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    /* Logic group */
    .logic-group {
      margin-bottom: 12px;
      padding: 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }

    .logic-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .logic-select {
      padding: 4px 8px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      font-size: 12px;
      font-family: inherit;
    }

    /* Filter condition */
    .filter-condition {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      padding: 4px;
      background: var(--vscode-editorWidget-background);
      border-radius: 3px;
    }

    .filter-condition select,
    .filter-condition input {
      padding: 3px 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-size: 12px;
      font-family: inherit;
    }

    .filter-condition select {
      min-width: 80px;
    }

    .filter-condition input {
      flex: 1;
      min-width: 100px;
    }

    .remove-btn {
      background: transparent;
      color: var(--vscode-errorForeground);
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      font-size: 14px;
      line-height: 1;
      border-radius: 2px;
    }
    .remove-btn:hover {
      background: var(--vscode-inputValidation-errorBackground);
    }

    /* Buttons */
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
    .btn-link {
      background: transparent;
      color: var(--vscode-textLink-foreground);
      border: none;
      padding: 4px 8px;
    }
    .btn-link:hover {
      text-decoration: underline;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border);
    }
  </style>
</head>
<body>
  <h2>Filter Editor</h2>

  <div class="section">
    <div class="section-header">
      <h3>Global Filters</h3>
      <button class="btn-link" id="addGroupGlobal">+ Add Group</button>
    </div>
    <div id="globalFilters"></div>
  </div>

  <div class="section">
    <div class="section-header">
      <h3>View Filters: <span id="viewNameDisplay">-</span></h3>
      <button class="btn-link" id="addGroupView">+ Add Group</button>
    </div>
    <div id="viewFilters"></div>
  </div>

  <div class="actions">
    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
    <button class="btn btn-primary" id="saveBtn">Save</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let globalFilterGroups = [];
    let viewFilterGroups = [];
    let currentViewName = '';

    // Message handler
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'initFilterEditor') {
        globalFilterGroups = msg.globalFilters || [];
        viewFilterGroups = msg.viewFilters || [];
        currentViewName = msg.viewName || '';
        document.getElementById('viewNameDisplay').textContent = currentViewName;
        renderAll();
      }
    });

    // Add group buttons
    document.getElementById('addGroupGlobal').addEventListener('click', () => {
      globalFilterGroups.push({ logic: 'and', conditions: [{ property: 'file.name', method: 'contains', value: '' }] });
      renderGlobalFilters();
    });

    document.getElementById('addGroupView').addEventListener('click', () => {
      viewFilterGroups.push({ logic: 'and', conditions: [{ property: 'file.name', method: 'contains', value: '' }] });
      renderViewFilters();
    });

    // Cancel/Save
    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancelFilterEditor' });
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      collectValues();
      vscode.postMessage({
        type: 'saveFilters',
        globalFilters: globalFilterGroups,
        viewFilters: viewFilterGroups,
        viewName: currentViewName
      });
    });

    function renderAll() {
      renderGlobalFilters();
      renderViewFilters();
    }

    function renderGlobalFilters() {
      const container = document.getElementById('globalFilters');
      container.innerHTML = '';
      globalFilterGroups.forEach((group, gi) => {
        container.appendChild(createGroupElement(group, gi, 'global'));
      });
      if (globalFilterGroups.length === 0) {
        container.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-size: 12px;">No global filters</div>';
      }
    }

    function renderViewFilters() {
      const container = document.getElementById('viewFilters');
      container.innerHTML = '';
      viewFilterGroups.forEach((group, gi) => {
        container.appendChild(createGroupElement(group, gi, 'view'));
      });
      if (viewFilterGroups.length === 0) {
        container.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-size: 12px;">No view filters</div>';
      }
    }

    function createGroupElement(group, groupIndex, scope) {
      const div = document.createElement('div');
      div.className = 'logic-group';

      // Header with logic selector
      const header = document.createElement('div');
      header.className = 'logic-group-header';

      const logicSelect = document.createElement('select');
      logicSelect.className = 'logic-select';
      logicSelect.dataset.scope = scope;
      logicSelect.dataset.groupIndex = groupIndex;
      const logicOptions = [
        { value: 'and', label: 'AND (all are true)' },
        { value: 'or', label: 'OR (any are true)' },
        { value: 'none', label: 'NONE (none are true)' }
      ];
      logicOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (group.logic === opt.value) option.selected = true;
        logicSelect.appendChild(option);
      });
      header.appendChild(logicSelect);

      const removeGroupBtn = document.createElement('button');
      removeGroupBtn.className = 'remove-btn';
      removeGroupBtn.textContent = '×';
      removeGroupBtn.title = 'Remove group';
      removeGroupBtn.addEventListener('click', () => {
        if (scope === 'global') {
          globalFilterGroups.splice(groupIndex, 1);
          renderGlobalFilters();
        } else {
          viewFilterGroups.splice(groupIndex, 1);
          renderViewFilters();
        }
      });
      header.appendChild(removeGroupBtn);
      div.appendChild(header);

      // Conditions
      group.conditions.forEach((cond, ci) => {
        div.appendChild(createConditionElement(cond, scope, groupIndex, ci));
      });

      // Add condition button
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-link';
      addBtn.textContent = '+ Add Condition';
      addBtn.addEventListener('click', () => {
        group.conditions.push({ property: 'file.name', method: 'contains', value: '' });
        if (scope === 'global') renderGlobalFilters();
        else renderViewFilters();
      });
      div.appendChild(addBtn);

      return div;
    }

    function createConditionElement(cond, scope, groupIndex, condIndex) {
      const div = document.createElement('div');
      div.className = 'filter-condition';

      // Property selector
      const propSelect = document.createElement('select');
      propSelect.dataset.scope = scope;
      propSelect.dataset.groupIndex = groupIndex;
      propSelect.dataset.condIndex = condIndex;
      propSelect.dataset.field = 'property';
      const properties = [
        'file.name', 'file.folder', 'file.ext', 'file.size', 'file.tags',
        'status', 'date', 'tags', 'desc'
      ];
      properties.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        if (cond.property === p) option.selected = true;
        propSelect.appendChild(option);
      });
      div.appendChild(propSelect);

      // Method selector
      const methodSelect = document.createElement('select');
      methodSelect.dataset.scope = scope;
      methodSelect.dataset.groupIndex = groupIndex;
      methodSelect.dataset.condIndex = condIndex;
      methodSelect.dataset.field = 'method';
      const methods = [
        { value: 'contains', label: 'contains' },
        { value: 'containsAny', label: 'contains any' },
        { value: 'equals', label: 'equals' },
        { value: 'startsWith', label: 'starts with' },
        { value: 'endsWith', label: 'ends with' },
        { value: 'inFolder', label: 'in folder' },
        { value: 'hasLink', label: 'has link' }
      ];
      methods.forEach(m => {
        const option = document.createElement('option');
        option.value = m.value;
        option.textContent = m.label;
        if (cond.method === m.value) option.selected = true;
        methodSelect.appendChild(option);
      });
      div.appendChild(methodSelect);

      // Value input
      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.placeholder = 'value';
      valueInput.value = cond.value || '';
      valueInput.dataset.scope = scope;
      valueInput.dataset.groupIndex = groupIndex;
      valueInput.dataset.condIndex = condIndex;
      valueInput.dataset.field = 'value';
      div.appendChild(valueInput);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        const groups = scope === 'global' ? globalFilterGroups : viewFilterGroups;
        groups[groupIndex].conditions.splice(condIndex, 1);
        if (groups[groupIndex].conditions.length === 0) {
          groups.splice(groupIndex, 1);
        }
        if (scope === 'global') renderGlobalFilters();
        else renderViewFilters();
      });
      div.appendChild(removeBtn);

      return div;
    }

    function collectValues() {
      // Collect logic selects
      document.querySelectorAll('.logic-select').forEach(select => {
        const scope = select.dataset.scope;
        const gi = parseInt(select.dataset.groupIndex);
        const groups = scope === 'global' ? globalFilterGroups : viewFilterGroups;
        if (groups[gi]) groups[gi].logic = select.value;
      });

      // Collect condition fields
      document.querySelectorAll('.filter-condition select, .filter-condition input').forEach(el => {
        const scope = el.dataset.scope;
        const gi = parseInt(el.dataset.groupIndex);
        const ci = parseInt(el.dataset.condIndex);
        const field = el.dataset.field;
        const groups = scope === 'global' ? globalFilterGroups : viewFilterGroups;
        if (groups[gi] && groups[gi].conditions[ci]) {
          groups[gi].conditions[ci][field] = el.value;
        }
      });
    }

    // Ready
    vscode.postMessage({ type: 'filterEditorReady' });
  </script>
</body>
</html>`;
}

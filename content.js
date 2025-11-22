// --- State & Constants ---
let isInspectorActive = false;
let hoveredElement = null;
let selectedElement = null;
let overlayHost = null;
let overlayRoot = null;

// --- Styles ---
const INSPECTOR_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 2147483647;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  /* Highlighter */
  .highlighter {
    position: fixed;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    pointer-events: none;
    z-index: 2147483646;
    display: none;
    box-sizing: border-box;
  }
  .highlighter-label {
    position: absolute;
    bottom: 100%;
    left: -2px;
    background: #3b82f6;
    color: white;
    padding: 2px 6px;
    font-size: 11px;
    border-radius: 2px 2px 0 0;
    white-space: nowrap;
    pointer-events: none;
    font-family: monospace;
  }
  .highlighter-label.bottom-flipped {
    bottom: auto;
    top: 100%;
    border-radius: 0 0 2px 2px;
  }

  /* Panel */
  .inspector-panel {
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    width: 340px;
    pointer-events: auto;
    display: none;
    flex-direction: column;
    color: #1f2937;
    font-size: 13px;
    overflow: hidden;
  }
  .inspector-panel.visible { display: flex; }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  .tag-name { font-weight: 700; color: #db2777; font-family: monospace; }
  .close-btn { cursor: pointer; background: none; border: none; font-size: 18px; color: #9ca3af; }
  .close-btn:hover { color: #4b5563; }

  /* Tabs */
  .tabs { display: flex; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; }
  .tab {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .tab:hover { color: #374151; background: #e5e7eb; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: white; }

  /* Content Areas */
  .tab-content { display: none; padding: 16px; max-height: 300px; overflow-y: auto; }
  .tab-content.active { display: block; }

  /* -- CLASSES TAB -- */
  .class-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .class-chip {
    background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
    border-radius: 4px; padding: 2px 6px; font-family: monospace;
    display: flex; align-items: center; gap: 6px;
  }
  .delete-x { cursor: pointer; font-weight: bold; color: #60a5fa; }
  .delete-x:hover { color: #2563eb; }

  .input-wrapper { position: relative; }
  .input-row { display: flex; gap: 8px; }
  input[type="text"] {
    flex: 1; border: 1px solid #d1d5db; border-radius: 4px;
    padding: 6px 8px; outline: none; font-family: monospace;
  }
  input[type="text"]:focus { border-color: #3b82f6; }
  button.action-btn {
    background: #3b82f6; color: white; border: none; border-radius: 4px;
    padding: 6px 12px; cursor: pointer; font-weight: 500;
  }
  button.action-btn:hover { background: #2563eb; }
  button.secondary-btn { background: #f3f4f6; color: #374151; width: 100%; margin-top: 8px; }
  button.secondary-btn:hover { background: #e5e7eb; }

  /* Autocomplete Dropdown */
  .suggestions {
    position: absolute; top: 100%; left: 0; right: 0;
    background: white; border: 1px solid #e5e7eb; border-radius: 0 0 4px 4px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    max-height: 150px; overflow-y: auto; z-index: 10; display: none;
  }
  .suggestion-item {
    padding: 6px 8px; cursor: pointer; font-family: monospace;
  }
  .suggestion-item:hover { background: #eff6ff; color: #1d4ed8; }
  .suggestion-match { font-weight: bold; color: #3b82f6; }

  /* -- COMPUTED TAB -- */
  .computed-row {
    display: flex; justify-content: space-between;
    padding: 4px 0; border-bottom: 1px solid #f3f4f6;
  }
  .computed-row:last-child { border-bottom: none; }
  .prop-name { color: #6b7280; }
  .prop-value { font-family: monospace; color: #111827; max-width: 180px; text-align: right; }

  /* -- COLORS TAB -- */
  .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .color-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px; border: 1px solid #e5e7eb; border-radius: 6px;
    cursor: pointer; transition: background 0.1s;
  }
  .color-item:hover { background: #f9fafb; border-color: #d1d5db; }
  .swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0;}
  .color-info { display: flex; flex-direction: column; overflow: hidden; }
  .color-hex { font-family: monospace; font-weight: bold; color: #374151; font-size: 12px; }
  .color-prop { font-size: 10px; color: #9ca3af; text-transform: uppercase; }
`;

// --- Initialization ---

function init() {
    if (overlayHost) return;

    overlayHost = document.createElement('div');
    overlayHost.id = 'class-inspector-host';
    document.body.appendChild(overlayHost);
    overlayRoot = overlayHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = INSPECTOR_STYLES;
    overlayRoot.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `
    <!-- Highlighter -->
    <div id="highlighter" class="highlighter">
      <span id="highlightLabel" class="highlighter-label"></span>
    </div>

    <!-- Main Panel -->
    <div id="panel" class="inspector-panel">
      <div class="header">
        <span class="tag-name" id="tagName">div</span>
        <button class="close-btn" id="closeBtn">&times;</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <div class="tab active" data-tab="classes">Classes</div>
        <div class="tab" data-tab="computed">Computed</div>
        <div class="tab" data-tab="colors">Colors</div>
      </div>

      <!-- Tab 1: Editor -->
      <div id="tab-classes" class="tab-content active">
        <div class="class-list" id="classList"></div>
        <div class="input-wrapper">
          <div class="input-row">
            <input type="text" id="addClassInput" placeholder="Add Tailwind class..." autocomplete="off">
            <button id="addBtn" class="action-btn">Add</button>
          </div>
          <div id="suggestions" class="suggestions"></div>
        </div>
        <button id="copyBtn" class="action-btn secondary-btn">Copy All Classes</button>
      </div>

      <!-- Tab 2: Computed Styles -->
      <div id="tab-computed" class="tab-content">
        <!-- Injected via JS -->
      </div>

      <!-- Tab 3: Colors -->
      <div id="tab-colors" class="tab-content">
        <div class="color-grid" id="colorGrid"></div>
      </div>
    </div>
  `;
    overlayRoot.appendChild(container);

    setupUIEvents();
}

function setupUIEvents() {
    const panel = overlayRoot.getElementById('panel');
    const closeBtn = overlayRoot.getElementById('closeBtn');
    const tabs = overlayRoot.querySelectorAll('.tab');
    const tabContents = overlayRoot.querySelectorAll('.tab-content');

    // Input
    const input = overlayRoot.getElementById('addClassInput');
    const addBtn = overlayRoot.getElementById('addBtn');
    const copyBtn = overlayRoot.getElementById('copyBtn');

    // Close
    closeBtn.addEventListener('click', () => {
        panel.classList.remove('visible');
        selectedElement = null;
        hideHighlighter();
    });

    // Tabs Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            overlayRoot.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });


    // Add Class
    const addClass = () => {
        if (!selectedElement || !input.value.trim()) return;
        const newClasses = input.value.split(' ').filter(c => c.trim().length > 0);
        selectedElement.classList.add(...newClasses);
        input.value = '';
        renderClassList(selectedElement);
        renderComputedStyles(selectedElement); // Update computed in case layout changed
        highlightElement(selectedElement);
    };

    addBtn.addEventListener('click', addClass);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addClass();
    });

    // Copy
    copyBtn.addEventListener('click', () => {
        if (!selectedElement) return;
        navigator.clipboard.writeText(selectedElement.className).then(() => {
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = original, 1500);
        });
    });
}

// --- Core Logic ---

function handleMouseOver(e) {
    if (!isInspectorActive || selectedElement) return;
    if (e.target === overlayHost) return;
    hoveredElement = e.target;
    highlightElement(hoveredElement);
}

function handleClick(e) {
    if (!isInspectorActive) return;
    if (e.target === overlayHost) return;

    e.preventDefault();
    e.stopPropagation();

    if (selectedElement === e.target) return; // Already selected
    selectedElement = e.target;

    highlightElement(selectedElement);
    openEditor(selectedElement);
}

function highlightElement(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const highlighter = overlayRoot.getElementById('highlighter');
    const label = overlayRoot.getElementById('highlightLabel');

    highlighter.style.display = 'block';
    highlighter.style.width = rect.width + 'px';
    highlighter.style.height = rect.height + 'px';
    highlighter.style.top = rect.top + 'px';
    highlighter.style.left = rect.left + 'px';

    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = Array.from(el.classList).slice(0,3).map(c => `.${c}`).join('');

    label.textContent = `${tag}${id}${classes} | ${Math.round(rect.width)}×${Math.round(rect.height)}`;

    if (rect.top < 25) label.classList.add('bottom-flipped');
    else label.classList.remove('bottom-flipped');
}

function hideHighlighter() {
    const highlighter = overlayRoot.getElementById('highlighter');
    if(highlighter) highlighter.style.display = 'none';
}

function openEditor(el) {
    const panel = overlayRoot.getElementById('panel');
    overlayRoot.getElementById('tagName').textContent = `<${el.tagName.toLowerCase()}>`;

    // Render content for all tabs
    renderClassList(el);
    renderComputedStyles(el);
    renderColorPalette(el);

    panel.classList.add('visible');

    // Smart Positioning
    const rect = el.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    let top = rect.bottom + 10;
    let left = rect.left;

    if (top + panelRect.height > window.innerHeight) {
        top = rect.top - panelRect.height - 10;
        if (top < 0) top = window.innerHeight - panelRect.height - 10;
    }
    if (top < 10) top = 10;
    if (left + panelRect.width > window.innerWidth) left = window.innerWidth - panelRect.width - 10;
    if (left < 10) left = 10;

    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
}

// --- Renderers ---

function renderClassList(el) {
    const container = overlayRoot.getElementById('classList');
    container.innerHTML = '';
    const classes = Array.from(el.classList);

    if (classes.length === 0) {
        container.innerHTML = '<span style="color:#9ca3af;">No classes</span>';
        return;
    }

    classes.forEach(cls => {
        const chip = document.createElement('div');
        chip.className = 'class-chip';
        chip.innerHTML = `<span>${cls}</span><span class="delete-x">&times;</span>`;
        chip.querySelector('.delete-x').onclick = (e) => {
            e.stopPropagation();
            el.classList.remove(cls);
            renderClassList(el);
            renderComputedStyles(el);
            highlightElement(el);
        };
        container.appendChild(chip);
    });
}

function renderComputedStyles(el) {
    const container = overlayRoot.getElementById('tab-computed');
    const style = window.getComputedStyle(el);

    const props = [
        'font-size', 'font-weight', 'font-family', 'color',
        'margin', 'padding',
        'width', 'height', 'display', 'position',
        'background-color', 'border-radius', 'box-shadow'
    ];

    container.innerHTML = props.map(p => {
        const val = style.getPropertyValue(p);
        if (!val || val === 'none' || val === '0px' || val === 'rgba(0, 0, 0, 0)') return '';
        return `
      <div class="computed-row">
        <span class="prop-name">${p}</span>
        <span class="prop-value" title="${val}">${val}</span>
      </div>
    `;
    }).join('');

    if (container.innerHTML.trim() === '') {
        container.innerHTML = '<div style="text-align:center;color:#9ca3af">No notable styles</div>';
    }
}

function renderColorPalette(el) {
    const container = overlayRoot.getElementById('colorGrid');
    const style = window.getComputedStyle(el);

    const colorProps = [
        { prop: 'color', label: 'Text' },
        { prop: 'background-color', label: 'Bg' },
        { prop: 'border-color', label: 'Border' },
        { prop: 'outline-color', label: 'Outline' }
    ];

    const colors = [];

    colorProps.forEach(cp => {
        const val = style.getPropertyValue(cp.prop);
        // Filter out transparent/default colors
        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'rgb(0, 0, 0)') {
            // Convert rgb to hex for better UX? kept as rgb for simplicity/accuracy
            colors.push({ ...cp, val });
        }
    });

    if (colors.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ca3af">No visible colors found</div>';
        return;
    }

    container.innerHTML = colors.map(c => `
    <div class="color-item" title="Click to copy ${c.val}">
      <div class="swatch" style="background-color: ${c.val}"></div>
      <div class="color-info">
        <span class="color-hex">${c.val}</span>
        <span class="color-prop">${c.label}</span>
      </div>
    </div>
  `).join('');

    // Add click-to-copy
    container.querySelectorAll('.color-item').forEach(item => {
        item.addEventListener('click', () => {
            const colorVal = item.querySelector('.color-hex').textContent;
            navigator.clipboard.writeText(colorVal).then(() => {
                const original = item.querySelector('.color-prop').textContent;
                item.querySelector('.color-prop').textContent = 'COPIED!';
                setTimeout(() => item.querySelector('.color-prop').textContent = original, 1000);
            });
        });
    });
}

// --- Global Listeners ---

function enableInspector() {
    isInspectorActive = true;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    init();
}

function disableInspector() {
    isInspectorActive = false;
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('click', handleClick, true);
    selectedElement = null;
    hoveredElement = null;
    if (overlayRoot) {
        overlayRoot.getElementById('panel').classList.remove('visible');
        hideHighlighter();
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleInspector") {
        if (request.isActive) enableInspector();
        else disableInspector();
        sendResponse({ success: true });
    }
    else if (request.action === "getStatus") {
        sendResponse({ isActive: isInspectorActive });
    }
});
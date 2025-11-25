// --- State & Constants ---
let isInspectorActive = false;
let hoveredElement = null;
let selectedElement = null;
let overlayHost = null;
let overlayRoot = null;

// --- Styles (Premium Dark Theme) ---
const INSPECTOR_STYLES = `
  :host {
    all: initial;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    z-index: 2147483647;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  /* Highlighter & Box Model */
  .highlighter {
    position: fixed;
    border: 2px solid #6366f1; /* Deeper Indigo border */
    background: rgba(99, 102, 241, 0.1); 
    pointer-events: none;
    z-index: 2147483646;
    display: none;
    box-sizing: border-box;
    transition: all 100ms ease-out; /* Smoother highlighting */
  }
  
  /* Box Model Overlays (Same colors, slightly higher opacity) */
  .box-margin {
    position: absolute;
    border-style: solid;
    border-color: rgba(251, 146, 60, 0.5); /* Orange for Margin */
    box-sizing: content-box;
    pointer-events: none;
  }
  .box-padding {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    border-style: solid;
    border-color: rgba(52, 211, 153, 0.5); /* Emerald Green for Padding */
    box-sizing: border-box;
    pointer-events: none;
  }

  /* Label */
  .highlighter-label {
    position: absolute;
    bottom: 100%;
    left: -2px;
    background: #4338ca; /* Darker Indigo */
    color: white;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 6px 6px 0 0;
    white-space: nowrap;
    pointer-events: none;
    font-family: 'Inter', monospace;
    z-index: 10;
  }
  .highlighter-label.bottom-flipped {
    bottom: auto;
    top: 100%;
    border-radius: 0 0 6px 6px;
  }

  /* Panel - Premium Look */
  .inspector-panel {
    position: fixed;
    background: #1f2937; /* Dark Gray */
    border: 1px solid #374151; /* Subtle dark border */
    /* Stronger, more refined shadow */
    box-shadow: 
      0 15px 30px -5px rgba(0, 0, 0, 0.5), /* Deep shadow */
      0 0 0 1px rgba(255, 255, 255, 0.05); /* Outer subtle glow */
    border-radius: 12px;
    width: 360px; /* Slightly wider */
    pointer-events: auto;
    display: none;
    flex-direction: column;
    color: #e5e7eb; /* Light text */
    font-size: 14px;
    overflow: hidden;
  }
  .inspector-panel.visible { display: flex; }

  /* Header & Breadcrumbs */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: #111827; /* Darker Header */
    border-bottom: 1px solid #374151;
  }
  .breadcrumbs {
    display: flex;
    gap: 6px;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    font-family: monospace;
    font-size: 12px;
  }
  .crumb {
    color: #9ca3af;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .crumb:hover { background: #374151; color: #f3f4f6; }
  .crumb.active {
    font-weight: 600;
    color: #fce7f3; /* Light pink/white */
    background: #4338ca; /* Deep Indigo background */
    padding: 2px 8px;
  }
  .separator { color: #6b7280; font-size: 10px; }
  .close-btn { 
    cursor: pointer; background: none; border: none; font-size: 20px; 
    color: #9ca3af; 
    transition: color 0.15s;
  }
  .close-btn:hover { color: #f3f4f6; }

  /* Tabs */
  .tabs { display: flex; background: #111827; border-bottom: 1px solid #374151; }
  .tab {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    cursor: pointer;
    font-weight: 500;
    color: #9ca3af;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
  }
  .tab:hover { color: #f3f4f6; background: #374151; }
  .tab.active { 
    color: #818cf8; /* Lighter Indigo for accent */
    border-bottom-color: #6366f1; /* Deep Indigo underline */ 
    background: #1f2937; 
  }

  /* Content Areas */
  .tab-content { display: none; padding: 16px; max-height: 300px; overflow-y: auto; }
  .tab-content.active { display: block; }
  /* Custom scrollbar for dark theme */
  .tab-content::-webkit-scrollbar { width: 6px; }
  .tab-content::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 3px; }
  .tab-content::-webkit-scrollbar-track { background-color: #1f2937; }


  /* Classes Tab */
  .group-label {
    font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 600;
    margin: 12px 0 6px 0; letter-spacing: 1px;
    border-bottom: 1px dashed #374151;
    padding-bottom: 4px;
  }
  .group-label:first-child { margin-top: 0; }
  
  .class-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .class-chip {
    background: #374151; /* Dark chip background */
    color: #a5b4fc; /* Light blue text */
    border: 1px solid #4b5563;
    border-radius: 6px; 
    padding: 3px 8px; 
    font-family: monospace;
    font-size: 13px;
    display: flex; align-items: center; gap: 8px;
    transition: background 0.1s;
  }
  .class-chip:hover { background: #4b5563; }
  .delete-x { cursor: pointer; font-weight: bold; color: #fca5a5; } /* Light Red for delete */
  .delete-x:hover { color: #f87171; }

  /* Input Area & Toolbar */
  .controls-area {
    margin-top: 16px; border-top: 1px solid #374151; padding-top: 16px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .input-row { display: flex; gap: 8px; align-items: center; }
  
  input[type="text"] {
    flex: 1; border: 1px solid #4b5563; border-radius: 6px;
    padding: 8px 10px; outline: none; font-family: monospace;
    background: #111827; /* Dark input field */
    color: #f3f4f6;
    transition: border-color 0.2s;
  }
  input[type="text"]:focus { border-color: #6366f1; box-shadow: 0 0 0 1px #6366f1; }
  
  /* Action Button - Primary */
  button.action-btn {
    background: #6366f1; /* Vibrant Indigo */
    color: white; 
    border: none; 
    border-radius: 6px;
    padding: 0 16px; 
    height: 38px;
    cursor: pointer; 
    font-weight: 600; 
    font-size: 13px;
    transition: background 0.2s, transform 0.1s;
  }
  button.action-btn:hover { background: #4f46e5; }
  button.action-btn:active { transform: scale(0.98); }

  /* Footer Actions */
  .footer-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
  button.secondary-btn { 
    background: #374151; /* Secondary Dark Button */
    color: #e5e7eb; 
    border: 1px solid #4b5563;
    border-radius: 6px; 
    padding: 8px; 
    cursor: pointer; 
    font-size: 12px; 
    font-weight: 500;
    transition: background 0.2s, border-color 0.2s;
  }
  button.secondary-btn:hover { background: #4b5563; border-color: #6b7280; }

  /* Colors & Computed */
  .computed-row { 
    display: flex; 
    justify-content: space-between; 
    padding: 6px 0; 
    border-bottom: 1px solid #374151; 
  }
  .computed-row:last-child { border-bottom: none; }
  .prop-name { color: #9ca3af; font-size: 13px; }
  .prop-value { font-family: monospace; color: #f3f4f6; max-width: 180px; text-align: right; font-size: 13px; }

  .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .color-item {
    display: flex; align-items: center; gap: 10px; padding: 8px; 
    background: #2b3543; /* Darker item background */
    border: 1px solid #374151;
    border-radius: 8px; 
    cursor: pointer; 
    transition: background 0.1s, border-color 0.1s;
  }
  .color-item:hover { background: #374151; border-color: #4b5563; }
  .swatch { width: 30px; height: 30px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;}
  .color-info { display: flex; flex-direction: column; overflow: hidden; }
  .color-hex { font-family: monospace; font-weight: 700; color: #f3f4f6; font-size: 14px; }
  .color-prop { font-size: 10px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.5px; }
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
      <div id="boxMargin" class="box-margin"></div>
      <div id="boxPadding" class="box-padding"></div>
      <span id="highlightLabel" class="highlighter-label"></span>
    </div>

    <!-- Main Panel -->
    <div id="panel" class="inspector-panel">
      <div class="header">
        <div class="breadcrumbs" id="breadcrumbs"></div>
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
        <div id="groupedClassList"></div>
        
        <div class="controls-area">
          <div class="input-row">
            <input type="text" id="addClassInput" placeholder="Add class (e.g., p-4 bg-red-500)..." autocomplete="off">
            <button id="addBtn" class="action-btn">Apply</button>
          </div>
          <div class="footer-actions">
            <button id="copyClassesBtn" class="secondary-btn">Copy Classes</button>
            <button id="copyJsxBtn" class="secondary-btn">Copy JSX</button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Computed Styles -->
      <div id="tab-computed" class="tab-content"></div>

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

    const input = overlayRoot.getElementById('addClassInput');
    const addBtn = overlayRoot.getElementById('addBtn');
    const copyClassesBtn = overlayRoot.getElementById('copyClassesBtn');
    const copyJsxBtn = overlayRoot.getElementById('copyJsxBtn');

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('visible');
        selectedElement = null;
        hideHighlighter();
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            overlayRoot.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // --- Action Logic ---

    const addClass = () => {
        if (!selectedElement || !input.value.trim()) return;
        // Use replace to ensure existing classes are overwritten/modified if input contains the full set
        const newClasses = input.value.split(' ').filter(c => c.trim().length > 0);

        // Simplistic application: use the input value to entirely replace classes for now
        // NOTE: For true add/remove behavior, we should parse existing classes vs new input.
        // For this demonstration, we'll simply add the new classes for simplicity.
        selectedElement.classList.add(...newClasses);
        input.value = '';

        refreshUI(selectedElement);
    };

    addBtn.addEventListener('click', addClass);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addClass(); });

    // Copy Buttons
    copyClassesBtn.addEventListener('click', () => {
        if (!selectedElement) return;
        copyToClipboard(selectedElement.className, copyClassesBtn);
    });

    copyJsxBtn.addEventListener('click', () => {
        if (!selectedElement) return;
        const jsx = convertToJSX(selectedElement.outerHTML);
        copyToClipboard(jsx, copyJsxBtn);
    });
}

// --- Core Logic & Highlighting ---

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

    if (selectedElement === e.target) return;

    selectedElement = e.target;

    highlightElement(selectedElement);
    openEditor(selectedElement);
}

function highlightElement(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    const highlighter = overlayRoot.getElementById('highlighter');
    const label = overlayRoot.getElementById('highlightLabel');
    const boxMargin = overlayRoot.getElementById('boxMargin');
    const boxPadding = overlayRoot.getElementById('boxPadding');

    highlighter.style.display = 'block';
    highlighter.style.width = rect.width + 'px';
    highlighter.style.height = rect.height + 'px';
    highlighter.style.top = rect.top + 'px';
    highlighter.style.left = rect.left + 'px';

    // --- Visual Box Model Logic ---
    const mt = parseFloat(style.marginTop) || 0;
    const mr = parseFloat(style.marginRight) || 0;
    const mb = parseFloat(style.marginBottom) || 0;
    const ml = parseFloat(style.marginLeft) || 0;

    boxMargin.style.top = `-${mt}px`;
    boxMargin.style.left = `-${ml}px`;
    boxMargin.style.right = `-${mr}px`;
    boxMargin.style.bottom = `-${mb}px`;
    boxMargin.style.borderTopWidth = `${mt}px`;
    boxMargin.style.borderRightWidth = `${mr}px`;
    boxMargin.style.borderBottomWidth = `${mb}px`;
    boxMargin.style.borderLeftWidth = `${ml}px`;

    const pt = parseFloat(style.paddingTop) || 0;
    const pr = parseFloat(style.paddingRight) || 0;
    const pb = parseFloat(style.paddingBottom) || 0;
    const pl = parseFloat(style.paddingLeft) || 0;

    boxPadding.style.borderTopWidth = `${pt}px`;
    boxPadding.style.borderRightWidth = `${pr}px`;
    boxPadding.style.borderBottomWidth = `${pb}px`;
    boxPadding.style.borderLeftWidth = `${pl}px`;

    // Label
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
    refreshUI(el);
    panel.classList.add('visible');

    // Smart Positioning
    const rect = el.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    let top = rect.bottom + 15; // Increased margin
    let left = rect.left;

    if (top + panelRect.height > window.innerHeight) {
        top = rect.top - panelRect.height - 15; // Increased margin
        if (top < 0) top = window.innerHeight - panelRect.height - 15;
    }
    if (top < 15) top = 15;
    if (left + panelRect.width > window.innerWidth) left = window.innerWidth - panelRect.width - 15;
    if (left < 15) left = 15;

    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
}

function refreshUI(el) {
    renderBreadcrumbs(el);
    renderClassList(el);
    renderComputedStyles(el);
    renderColorPalette(el);
    highlightElement(el); // Re-calculate boxes if layout changed
}

// --- Renderers ---

function renderBreadcrumbs(el) {
    const container = overlayRoot.getElementById('breadcrumbs');
    container.innerHTML = '';
    let path = [el];
    let curr = el.parentElement;
    if (curr) { path.unshift(curr); if (curr.parentElement) path.unshift(curr.parentElement); }

    path.forEach((node, idx) => {
        const isLast = idx === path.length - 1;
        const span = document.createElement('span');
        span.className = isLast ? 'crumb active' : 'crumb';
        span.textContent = node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '');
        if (!isLast) {
            span.onclick = () => {
                selectedElement = node;
                highlightElement(selectedElement);
                openEditor(selectedElement);
            };
        }
        container.appendChild(span);
        if (!isLast) {
            const sep = document.createElement('span');
            sep.className = 'separator';
            sep.textContent = ' > ';
            container.appendChild(sep);
        }
    });
}

function renderClassList(el) {
    const container = overlayRoot.getElementById('groupedClassList');
    container.innerHTML = '';
    const classes = Array.from(el.classList);

    if (classes.length === 0) {
        container.innerHTML = '<span style="color:#6b7280; font-style: italic;">No CSS / SCC classes found on this element.</span>';
        return;
    }

    const groups = {
        'Layout & Spacing': [], 'Typography': [], 'Colors & Background': [], 'Interactivity': [], 'Responsiveness': [], 'Other': []
    };

    classes.forEach(cls => {
        // Check for Responsive prefixes first
        if (cls.match(/^(sm:|md:|lg:|xl:|2xl:)/)) groups['Responsiveness'].push(cls);
        // Check for Interaction states
        else if (cls.includes('hover:') || cls.includes('focus:') || cls.includes('active:')) groups['Interactivity'].push(cls);
        // Check for Typesetting
        else if (cls.match(/^(text-|font-|leading-|tracking-|italic|normal-case)/)) groups['Typography'].push(cls);
        // Check for Colors/Visuals
        else if (cls.match(/^(bg-|text-|border-|shadow-|ring-|fill-|stroke-)/)) groups['Colors & Background'].push(cls);
        // Check for Layout/Spacing
        else if (cls.match(/^(p-|m-|w-|h-|flex|grid|gap-|justify-|items-|absolute|relative|fixed|z-|overflow-|block|inline)/)) groups['Layout & Spacing'].push(cls);
        // Everything else
        else groups['Other'].push(cls);
    });

    Object.entries(groups).forEach(([label, groupClasses]) => {
        if (groupClasses.length === 0) return;
        const groupLabel = document.createElement('div');
        groupLabel.className = 'group-label';
        groupLabel.textContent = label;
        container.appendChild(groupLabel);

        const list = document.createElement('div');
        list.className = 'class-list';
        groupClasses.forEach(cls => {
            const chip = document.createElement('div');
            chip.className = 'class-chip';
            chip.innerHTML = `<span>${cls}</span><span class="delete-x">&times;</span>`;
            chip.querySelector('.delete-x').onclick = (e) => {
                e.stopPropagation();
                el.classList.remove(cls);
                refreshUI(el);
            };
            list.appendChild(chip);
        });
        container.appendChild(list);
    });
}

function renderComputedStyles(el) {
    const container = overlayRoot.getElementById('tab-computed');
    const style = window.getComputedStyle(el);
    const props = ['font-size', 'font-weight', 'font-family', 'color', 'margin', 'padding', 'width', 'height', 'display', 'position', 'background-color', 'border-radius', 'box-shadow', 'z-index'];

    container.innerHTML = props.map(p => {
        const val = style.getPropertyValue(p);
        if (!val || val === 'none' || val === '0px' || val === 'rgba(0, 0, 0, 0)' || val === 'auto' || val === 'normal') return '';
        return `<div class="computed-row"><span class="prop-name">${p}</span><span class="prop-value" title="${val}">${val}</span></div>`;
    }).join('');
}

function renderColorPalette(el) {
    const container = overlayRoot.getElementById('colorGrid');
    const style = window.getComputedStyle(el);
    const colorProps = [{ prop: 'color', label: 'Text' }, { prop: 'background-color', label: 'Bg' }, { prop: 'border-color', label: 'Border' }];
    const colors = [];

    colorProps.forEach(cp => {
        const val = style.getPropertyValue(cp.prop);
        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'rgb(0, 0, 0)') colors.push({ ...cp, val });
    });

    if (colors.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#6b7280; font-style: italic;">No computed colors detected.</div>';
        return;
    }

    container.innerHTML = colors.map(c => `
    <div class="color-item" title="Click to copy ${c.val}">
      <div class="swatch" style="background-color: ${c.val}"></div>
      <div class="color-info"><span class="color-hex">${c.val}</span><span class="color-prop">${c.label}</span></div>
    </div>
  `).join('');

    container.querySelectorAll('.color-item').forEach(item => {
        item.addEventListener('click', () => copyToClipboard(item.querySelector('.color-hex').textContent, item.querySelector('.color-prop')));
    });
}

// --- Helpers ---

function copyToClipboard(text, btnElement) {
    // Use a temporary visual feedback for both button types
    const isButton = btnElement.tagName.toLowerCase() === 'button';
    const original = btnElement.textContent;

    navigator.clipboard.writeText(text).then(() => {
        if (isButton) {
            btnElement.textContent = 'Copied!';
            btnElement.style.backgroundColor = '#10b981'; // Green accent
            setTimeout(() => {
                btnElement.textContent = original;
                btnElement.style.backgroundColor = ''; // Revert to CSS
            }, 1500);
        } else {
            // For color chips
            const originalColor = btnElement.style.color;
            btnElement.style.color = '#10b981';
            btnElement.textContent = 'COPIED';
            setTimeout(() => {
                btnElement.style.color = originalColor;
                btnElement.textContent = original;
            }, 1500);
        }
    });
}

function convertToJSX(html) {
    let jsx = html.replace(/\sclass=/g, ' className=');
    jsx = jsx.replace(/\sfor=/g, ' htmlFor=');
    jsx = jsx.replace(/\stabindex=/g, ' tabIndex=');
    // Simple self-closing tag fix
    const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    jsx = jsx.replace(/<(\w+)([^>]*)(?<!\/)>/g, (match, tag, attrs) => {
        if (voidTags.includes(tag)) return `<${tag}${attrs} />`;
        return match;
    });
    // Note: JSX conversion handles class -> className
    return jsx;
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
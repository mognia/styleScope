// --- State & Constants ---
let isInspectorActive = false;
let hoveredElement = null;
let selectedElement = null;
let overlayHost = null; // The Shadow DOM container
let overlayRoot = null; // The Shadow Root

// --- Styles for the Inspector UI (Injected into Shadow DOM) ---
const INSPECTOR_STYLES = `
  :host {
    all: initial;
    font-family: Consolas, Menlo, Monaco, "Courier New", monospace; /* Code font for technical feel */
    z-index: 2147483647;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  /* --- Highlighter Overlay --- */
  .highlighter {
    position: fixed;
    border: 2px solid #3b82f6; /* Tailwind Blue 500 */
    background: rgba(59, 130, 246, 0.1);
    pointer-events: none; /* Crucial: Clicks must pass through */
    z-index: 2147483646;
    display: none;
    transition: all 0.05s ease-out; /* Slight smooth transition */
    box-sizing: border-box;
  }

  /* The tag/class label attached to the highlighter */
  .highlighter-label {
    position: absolute;
    bottom: 100%; /* Default: sits on top of the border */
    left: -2px; /* Align with border */
    background: #3b82f6;
    color: white;
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.2;
    border-radius: 2px 2px 0 0;
    white-space: nowrap;
    box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
    pointer-events: none;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Flip label to bottom if at top of screen */
  .highlighter-label.bottom-flipped {
    bottom: auto;
    top: 100%;
    border-radius: 0 0 2px 2px;
  }

  /* Label text components */
  .hl-tag { color: #ffdfdf; font-weight: bold; }
  .hl-id { color: #fbbf24; } /* Amber */
  .hl-dim { color: #e0e7ff; opacity: 0.8; margin-left: 6px; font-weight: normal; }

  /* --- Editor Panel --- */
  .inspector-panel {
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border-radius: 8px;
    padding: 16px;
    width: 320px;
    pointer-events: auto; /* Re-enable clicks */
    display: none;
    flex-direction: column;
    gap: 12px;
    color: #1f2937;
    font-family: system-ui, sans-serif; /* Regular font for UI */
    font-size: 14px;
  }
  
  .inspector-panel.visible { display: flex; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 8px;
  }
  
  .tag-name {
    font-weight: 700;
    color: #db2777;
    text-transform: lowercase;
    font-family: monospace;
  }

  .close-btn {
    cursor: pointer;
    background: none;
    border: none;
    font-size: 18px;
    color: #9ca3af;
    line-height: 1;
  }
  .close-btn:hover { color: #4b5563; }

  /* Class List Area */
  .class-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
  }

  /* Scrollbar prettification */
  .class-list::-webkit-scrollbar { width: 6px; }
  .class-list::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 3px; }

  .class-chip {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    font-family: monospace;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    transition: background 0.1s;
  }
  
  .class-chip:hover { background: #dbeafe; border-color: #93c5fd; }

  .delete-x {
    cursor: pointer;
    font-weight: bold;
    color: #60a5fa;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
  .delete-x:hover { background: #2563eb; color: white; }

  /* Inputs */
  .input-row { display: flex; gap: 8px; }
  
  input[type="text"] {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 13px;
    outline: none;
    font-family: monospace;
  }
  input[type="text"]:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }

  button.action-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-weight: 500;
    font-size: 12px;
    transition: background 0.1s;
  }
  button.action-btn:hover { background: #2563eb; }
  
  button.secondary-btn { background: #f3f4f6; color: #374151; }
  button.secondary-btn:hover { background: #e5e7eb; }
`;

// --- Initialization ---

function init() {
    if (overlayHost) return;

    overlayHost = document.createElement('div');
    overlayHost.id = 'tailwind-inspector-host';
    document.body.appendChild(overlayHost);
    overlayRoot = overlayHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = INSPECTOR_STYLES;
    overlayRoot.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `
    <div id="highlighter" class="highlighter">
      <span id="highlightLabel" class="highlighter-label"></span>
    </div>
    <div id="panel" class="inspector-panel">
      <div class="header">
        <span class="tag-name" id="tagName">div</span>
        <button class="close-btn" id="closeBtn" title="Close Inspector">&times;</button>
      </div>
      <div class="class-list" id="classList"></div>
      <div class="input-row">
        <input type="text" id="addClassInput" placeholder="Add classes...">
        <button id="addBtn" class="action-btn">Add</button>
      </div>
      <div class="input-row" style="margin-top:8px;">
        <button id="copyBtn" class="action-btn secondary-btn" style="width:100%">Copy All Classes</button>
      </div>
    </div>
  `;
    overlayRoot.appendChild(container);

    setupUIEvents();
}

function setupUIEvents() {
    const panel = overlayRoot.getElementById('panel');
    const closeBtn = overlayRoot.getElementById('closeBtn');
    const addBtn = overlayRoot.getElementById('addBtn');
    const input = overlayRoot.getElementById('addClassInput');
    const copyBtn = overlayRoot.getElementById('copyBtn');

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('visible');
        selectedElement = null;
        hideHighlighter();
    });

    const addClass = () => {
        if (!selectedElement || !input.value.trim()) return;
        const newClasses = input.value.split(' ').filter(c => c.trim().length > 0);
        selectedElement.classList.add(...newClasses);
        input.value = '';
        renderClassList(selectedElement);
        // Also update highlighter label if needed
        highlightElement(selectedElement);
    };

    addBtn.addEventListener('click', addClass);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addClass();
    });

    copyBtn.addEventListener('click', () => {
        if (!selectedElement) return;
        navigator.clipboard.writeText(selectedElement.className).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 1500);
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

    // If clicking the currently selected thing, do nothing (or maybe close it)
    if (selectedElement === e.target) return;

    selectedElement = e.target;
    highlightElement(selectedElement); // Ensure highlight stays locked
    openEditor(selectedElement);
}

function highlightElement(el) {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const highlighter = overlayRoot.getElementById('highlighter');
    const label = overlayRoot.getElementById('highlightLabel');

    // Position Box
    highlighter.style.display = 'block';
    highlighter.style.width = rect.width + 'px';
    highlighter.style.height = rect.height + 'px';
    highlighter.style.top = rect.top + 'px';
    highlighter.style.left = rect.left + 'px';

    // Build Label Content: tag#id.class.class | w x h
    let tagHtml = `<span class="hl-tag">${el.tagName.toLowerCase()}</span>`;
    if (el.id) tagHtml += `<span class="hl-id">#${el.id}</span>`;

    // Get first 3 classes for preview
    const classes = Array.from(el.classList);
    let classText = classes.length > 0 ? '.' + classes.slice(0, 3).join('.') : '';
    if (classes.length > 3) classText += '...';

    const dimensions = ` <span class="hl-dim">${Math.round(rect.width)}×${Math.round(rect.height)}</span>`;

    label.innerHTML = `${tagHtml}${classText}${dimensions}`;

    // Smart Label Positioning (Flip if close to top)
    if (rect.top < 25) {
        label.classList.add('bottom-flipped');
    } else {
        label.classList.remove('bottom-flipped');
    }
}

function hideHighlighter() {
    const highlighter = overlayRoot.getElementById('highlighter');
    if(highlighter) highlighter.style.display = 'none';
}

function openEditor(el) {
    const panel = overlayRoot.getElementById('panel');
    const tagNameDisplay = overlayRoot.getElementById('tagName');

    tagNameDisplay.textContent = `<${el.tagName.toLowerCase()}>`;
    renderClassList(el);

    panel.classList.add('visible');

    // --- Smart Positioning for Panel ---
    const rect = el.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    // Default: Below and aligned left
    let top = rect.bottom + 10;
    let left = rect.left;

    // Check Bottom Edge
    if (top + panelRect.height > window.innerHeight) {
        // Not enough space below, try above
        top = rect.top - panelRect.height - 10;

        // If above is also cut off (element is huge or screen is small), pin to bottom of screen
        if (top < 0) {
            top = window.innerHeight - panelRect.height - 10;
        }
    }

    // Check Top Edge (simple clamp)
    if (top < 10) top = 10;

    // Check Right Edge
    if (left + panelRect.width > window.innerWidth) {
        left = window.innerWidth - panelRect.width - 10;
    }

    // Check Left Edge
    if (left < 10) left = 10;

    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
}

function renderClassList(el) {
    const container = overlayRoot.getElementById('classList');
    container.innerHTML = '';

    const classes = Array.from(el.classList);

    if (classes.length === 0) {
        container.innerHTML = '<span style="color:#9ca3af; font-style:italic; font-size:12px;">No classes applied</span>';
        return;
    }

    classes.forEach(cls => {
        const chip = document.createElement('div');
        chip.className = 'class-chip';

        const text = document.createElement('span');
        text.textContent = cls;

        // Double click to edit (optional enhancements could go here)

        const del = document.createElement('span');
        del.className = 'delete-x';
        del.innerHTML = '&times;';
        del.title = 'Remove class';
        del.onclick = (e) => {
            e.stopPropagation(); // Prevent panel close
            el.classList.remove(cls);
            renderClassList(el);
            highlightElement(el); // Update highlighter label
        };

        chip.appendChild(text);
        chip.appendChild(del);
        container.appendChild(chip);
    });
}

// --- Event Listeners ---

function enableInspector() {
    isInspectorActive = true;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('click', handleClick, true);
    // We don't change cursor globally anymore to avoid annoying flicker interactions
    // Just rely on the highlighter to show status
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

// --- Messaging ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleInspector") {
        if (request.isActive) enableInspector();
        else disableInspector();
    } else if (request.action === "getStatus") {
        sendResponse({ isActive: isInspectorActive });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleInspector');
    const statusText = document.getElementById('statusText');

    // Load saved state
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, (response) => {
            if (chrome.runtime.lastError) return; // Script might not be ready
            if (response && response.isActive) {
                toggle.checked = true;
                statusText.textContent = "Inspector ON";
                statusText.style.color = "#3b82f6";
            }
        });
    });

    toggle.addEventListener('change', () => {
        const isActive = toggle.checked;
        statusText.textContent = isActive ? "Inspector ON" : "Inspector Off";
        statusText.style.color = isActive ? "#3b82f6" : "#1f2937";

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "toggleInspector",
                isActive: isActive
            });
        });
    });
});
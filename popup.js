document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleInspector');
    const statusText = document.getElementById('statusText');

    // --- Helper: Update UI Text/Colors ---
    function updateUI(isActive) {
        toggle.checked = isActive;
        statusText.textContent = isActive ? "Inspector ON" : "Inspector Off";
        statusText.style.color = isActive ? "#3b82f6" : "#1f2937";
    }

    // --- Step 1: Check Initial Status ---
    // We ping the tab to see if content.js is already there and active.
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0] || !tabs[0].id) return;

        chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, (response) => {
            // If we get a response, the script is there. Update UI.
            if (!chrome.runtime.lastError && response) {
                updateUI(response.isActive);
            } else {
                // If runtime.lastError exists, it means content.js IS NOT injected yet.
                // So the inspector is definitely OFF.
                updateUI(false);
            }
        });
    });

    // --- Step 2: Handle Toggle Switch ---
    toggle.addEventListener('change', async () => {
        const isTurningOn = toggle.checked;
        updateUI(isTurningOn); // Optimistic UI update

        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const tab = tabs[0];
        if (!tab) return;

        if (isTurningOn) {
            // User wants to Turn ON.
            // Try to verify if script exists first to avoid double injection
            chrome.tabs.sendMessage(tab.id, {action: "getStatus"}, async (response) => {

                if (chrome.runtime.lastError) {
                    // Script NOT found. We must INJECT it now.
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js']
                        });
                        // After injection, allow a tiny delay for script to init, then activate
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", isActive: true });
                        }, 50);
                    } catch (err) {
                        console.error("Injection failed (likely restricted page like chrome://)", err);
                        statusText.textContent = "Restricted Page";
                        statusText.style.color = "red";
                        toggle.checked = false;
                    }
                } else {
                    // Script WAS found. Just toggle it ON.
                    chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", isActive: true });
                }
            });

        } else {
            // User wants to Turn OFF.
            // Just send the message. If script isn't there, it doesn't matter (it's off anyway).
            chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", isActive: false });
        }
    });
});
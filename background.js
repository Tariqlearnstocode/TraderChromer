// Background script for Trading AI Assistant
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'analysisResult') {
        // Forward analysis results to popup if it's open
        chrome.runtime.sendMessage(message).catch(() => {
            // Popup might be closed, that's okay
        });
    } else if (message.type === 'captureScreen') {
        console.log('Background: Capturing screenshot for area:', message.area);
        
        // Capture the visible tab
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (screenshot) => {
            if (chrome.runtime.lastError) {
                console.error('Screenshot capture error:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                console.log('Background: Screenshot captured successfully, size:', screenshot.length);
                sendResponse({ screenshot: screenshot });
            }
        });
        return true; // Keep the message channel open for async response
    }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Trading AI Assistant installed');
    }
});
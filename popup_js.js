// Popup script for Trading AI Assistant
class TradingAssistantPopup {
    constructor() {
        this.isCapturing = false;
        this.captureInterval = null;
        this.selectedArea = null;
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        document.getElementById('selectArea').addEventListener('click', () => this.selectArea());
        document.getElementById('startCapture').addEventListener('click', () => this.startCapture());
        document.getElementById('stopCapture').addEventListener('click', () => this.stopCapture());
        
        // Save settings on change
        ['apiKey', 'position', 'strategy', 'interval'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveSettings());
        });
    }

    async loadSettings() {
        const settings = await chrome.storage.local.get(['apiKey', 'position', 'strategy', 'interval', 'selectedArea']);
        
        if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
        if (settings.position) document.getElementById('position').value = settings.position;
        if (settings.strategy) document.getElementById('strategy').value = settings.strategy;
        if (settings.interval) document.getElementById('interval').value = settings.interval;
        if (settings.selectedArea) this.selectedArea = settings.selectedArea;
    }

    async saveSettings() {
        const settings = {
            apiKey: document.getElementById('apiKey').value,
            position: document.getElementById('position').value,
            strategy: document.getElementById('strategy').value,
            interval: parseInt(document.getElementById('interval').value)
        };
        
        await chrome.storage.local.set(settings);
    }

    async selectArea() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script to activate area selector
            await chrome.tabs.sendMessage(tab.id, { type: 'selectArea' });
            
            // Close popup to allow selection
            window.close();
        } catch (error) {
            console.error('Error selecting area:', error);
            alert('Failed to select area. Please try again.');
        }
    }

    async startCapture() {
        if (!this.validateSettings()) return;
        
        this.isCapturing = true;
        this.updateUI();
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const interval = parseInt(document.getElementById('interval').value) * 1000;
            
            // Send message to content script to start capturing
            await chrome.tabs.sendMessage(tab.id, { type: 'startCapture', interval: interval });
            
            this.updateStatus('Capturing screenshots...');
            
        } catch (error) {
            console.error('Error starting capture:', error);
            this.stopCapture();
            alert('Failed to start capture. Please try again.');
        }
    }

    async stopCapture() {
        this.isCapturing = false;
        this.updateUI();
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script to stop capturing
            await chrome.tabs.sendMessage(tab.id, { type: 'stopCapture' });
            
            this.updateStatus('Capture stopped');
            
        } catch (error) {
            console.error('Error stopping capture:', error);
        }
    }

    validateSettings() {
        const apiKey = document.getElementById('apiKey').value;
        
        if (!apiKey) {
            alert('Please enter your OpenAI API key');
            return false;
        }
        
        if (!apiKey.startsWith('sk-')) {
            alert('Please enter a valid OpenAI API key (starts with sk-)');
            return false;
        }
        
        return true;
    }

    updateUI() {
        const startBtn = document.getElementById('startCapture');
        const stopBtn = document.getElementById('stopCapture');
        const selectBtn = document.getElementById('selectArea');
        
        if (this.isCapturing) {
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            selectBtn.disabled = true;
        } else {
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            selectBtn.disabled = false;
        }
    }

    updateStatus(message) {
        const status = document.getElementById('status');
        status.textContent = `Status: ${message}`;
        status.className = this.isCapturing ? 'status active' : 'status inactive';
    }
}

// Listen for analysis results
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'analysisResult') {
        displayAnalysis(message.data);
    }
});

function displayAnalysis(analysis) {
    const analysisDiv = document.getElementById('analysis');
    const contentDiv = document.getElementById('analysisContent');
    
    contentDiv.innerHTML = `
        <div class="case long">
            <h4>Long Case:</h4>
            <p>${analysis.longCase}</p>
        </div>
        <div class="case short">
            <h4>Short Case:</h4>
            <p>${analysis.shortCase}</p>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #888;">
            Last updated: ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    analysisDiv.classList.remove('hidden');
}

// Initialize popup
new TradingAssistantPopup();
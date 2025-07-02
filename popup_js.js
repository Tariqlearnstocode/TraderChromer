// Popup script for Trading AI Assistant
class TradingAssistantPopup {
    constructor() {
        this.isCapturing = false;
        this.captureInterval = null;
        this.selectedArea = null;

        this.indicators = [];
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateUI();
        this.displayIndicators();
    }

    bindEvents() {
        document.getElementById('selectArea').addEventListener('click', () => this.selectArea('chart'));

        document.getElementById('captureIndicators').addEventListener('click', () => this.captureIndicators());
        document.getElementById('startCapture').addEventListener('click', () => this.startCapture());
        document.getElementById('stopCapture').addEventListener('click', () => this.stopCapture());
        
        // Handle timeframe selection
        document.getElementById('timeframe').addEventListener('change', (e) => this.showOptimalIndicators(e.target.value));
        
        // Save settings on change
        ['apiKey', 'position', 'strategy', 'interval', 'timeframe'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveSettings());
        });
    }

    async loadSettings() {
        const settings = await chrome.storage.local.get(['apiKey', 'position', 'strategy', 'interval', 'selectedArea', 'indicators', 'timeframe']);
        
        if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
        if (settings.position) document.getElementById('position').value = settings.position;
        if (settings.strategy) document.getElementById('strategy').value = settings.strategy;
        if (settings.interval) document.getElementById('interval').value = settings.interval;
        if (settings.timeframe) {
            document.getElementById('timeframe').value = settings.timeframe;
            this.showOptimalIndicators(settings.timeframe);
        }
        if (settings.selectedArea) this.selectedArea = settings.selectedArea;

        if (settings.indicators) {
            this.indicators = settings.indicators;
            this.displayIndicators();
        }
    }

    async saveSettings() {
        const settings = {
            apiKey: document.getElementById('apiKey').value,
            position: document.getElementById('position').value,
            strategy: document.getElementById('strategy').value,
            interval: parseInt(document.getElementById('interval').value),
            timeframe: document.getElementById('timeframe').value
        };
        
        await chrome.storage.local.set(settings);
    }

    async selectArea(type = 'chart') {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script to activate area selector
            await chrome.tabs.sendMessage(tab.id, { type: 'selectArea', areaType: type });
            
            // Close popup to allow selection
            window.close();
        } catch (error) {
            console.error('Error selecting area:', error);
            alert('Failed to select area. Please try again.');
        }
    }

    async captureIndicators() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to capture indicators
            await chrome.tabs.sendMessage(tab.id, { type: 'captureIndicators' });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Error capturing indicators:', error);
            alert('Failed to capture indicators. Please try again.');
        }
    }

    showOptimalIndicators(timeframe) {
        const indicatorSection = document.getElementById('optimalIndicators');
        const setupDisplay = document.getElementById('recommendedSetup');
        
        const optimalSetups = {
            scalping: [
                'EMA(20, 50, 200)',
                'VWAP with Bands',
                'RSI(14)',
                'Volume + MA(20)',
                'Bollinger Bands(20,2)'
            ],
            day: [
                'EMA(9, 21, 50)',
                'VWAP with Deviation Bands',
                'RSI(14)',
                'Volume + MA(20)'
            ],
            swing: [
                'EMA(20, 50, 200)',
                'VWAP Daily',
                'MACD(12,26,9)',
                'RSI(14)',
                'Volume Profile'
            ]
        };
        
        if (timeframe && optimalSetups[timeframe]) {
            const indicators = optimalSetups[timeframe];
            setupDisplay.innerHTML = indicators.map(indicator => 
                `<span class="indicator-tag">${indicator}</span>`
            ).join('');
            setupDisplay.classList.remove('empty');
            indicatorSection.style.display = 'block';
        } else {
            indicatorSection.style.display = 'none';
        }
    }

    displayIndicators() {
        const indicatorsList = document.getElementById('indicatorsList');
        
        if (this.indicators.length === 0) {
            indicatorsList.innerHTML = '<span style="color: #666; font-style: italic;">Select your timeframe above, then click "Detect My Setup"</span>';
            indicatorsList.className = 'indicators-display empty';
        } else {
            indicatorsList.innerHTML = this.indicators.map(indicator => 
                `<span class="indicator-tag">${indicator}</span>`
            ).join('');
            indicatorsList.className = 'indicators-display';
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
    
    // Convert markdown-style formatting to HTML
    const formatText = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/• /g, '&bull; '); // Bullet points
    };
    
    contentDiv.innerHTML = `
        <div class="case long">
            <h4>Long Case:</h4>
            <div>${formatText(analysis.longCase)}</div>
        </div>
        <div class="case short">
            <h4>Short Case:</h4>
            <div>${formatText(analysis.shortCase)}</div>
        </div>
        ${analysis.bestGuess ? `
        <div class="case best-guess">
            <h4>Best Guess:</h4>
            <div>${formatText(analysis.bestGuess)}</div>
        </div>
        ` : ''}
        ${analysis.keyLevels ? `
        <div class="case key-levels">
            <h4>Key Levels:</h4>
            <div>
                <strong>Support:</strong> ${analysis.keyLevels.support}<br>
                <strong>Resistance:</strong> ${analysis.keyLevels.resistance}
            </div>
        </div>
        ` : ''}
        <div style="margin-top: 10px; font-size: 12px; color: #888;">
            Last updated: ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    analysisDiv.classList.remove('hidden');
}

// Initialize popup
new TradingAssistantPopup();
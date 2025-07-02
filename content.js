// Content script for Trading AI Assistant
class TradingAreaSelector {
    constructor() {
        this.overlay = null;
        this.isSelecting = false;
        this.selectedArea = null;

        this.currentAreaType = 'chart';
        this.startX = 0;
        this.startY = 0;
        this.selectionBox = null;
    }

    activate(areaType = 'chart') {
        if (this.isSelecting) return;
        
        this.currentAreaType = areaType;
        this.createOverlay();
        this.isSelecting = true;
        document.body.style.cursor = 'crosshair';
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
        `;
        
        this.overlay.addEventListener('mousedown', (e) => this.startSelection(e));
        this.overlay.addEventListener('mousemove', (e) => this.updateSelection(e));
        this.overlay.addEventListener('mouseup', (e) => this.endSelection(e));
        
        document.body.appendChild(this.overlay);
    }

    startSelection(e) {
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        this.selectionBox = document.createElement('div');
        this.selectionBox.style.cssText = `
            position: fixed;
            border: 2px solid #00ff88;
            background: rgba(0, 255, 136, 0.1);
            z-index: 1000000;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.selectionBox);
    }

    updateSelection(e) {
        if (!this.selectionBox) return;
        
        const x = Math.min(this.startX, e.clientX);
        const y = Math.min(this.startY, e.clientY);
        const width = Math.abs(e.clientX - this.startX);
        const height = Math.abs(e.clientY - this.startY);
        
        this.selectionBox.style.left = `${x}px`;
        this.selectionBox.style.top = `${y}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;
    }

    endSelection(e) {
        if (!this.selectionBox) return;
        
        const rect = this.selectionBox.getBoundingClientRect();
        
        // Validate minimum size
        if (rect.width < 50 || rect.height < 50) {
            this.cleanup();
            alert('Please select a larger area (minimum 50x50 pixels)');
            return;
        }
        
        const areaData = {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
        
        if (this.currentAreaType === 'chart') {
            this.selectedArea = areaData;
            chrome.storage.local.set({ selectedArea: this.selectedArea });
            this.showConfirmation('Chart area selected! You can now start capturing.');

        } else if (this.currentAreaType === 'indicators') {
            this.showConfirmation('Processing indicators...');
            processIndicatorScreenshot(areaData);
        }
        
        this.cleanup();
    }

    cleanup() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        
        document.body.style.cursor = '';
        this.isSelecting = false;
    }

    showConfirmation(message = 'Area selected!') {
        const confirmation = document.createElement('div');
        confirmation.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #000;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-weight: bold;
        `;
        confirmation.textContent = message;
        
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.remove();
        }, 3000);
    }
}

class TradingCapture {
    constructor() {
        this.isCapturing = false;
        this.captureInterval = null;
        this.canvas = null;
        this.ctx = null;
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async start(interval) {
        if (this.isCapturing) return;
        
        const settings = await chrome.storage.local.get(['selectedArea', 'apiKey', 'position', 'strategy']);
        
        if (!settings.selectedArea) {
            alert('Please select an area first');
            return;
        }
        
        this.isCapturing = true;
        
        this.captureInterval = setInterval(async () => {
            try {
                await this.captureAndAnalyze();
            } catch (error) {
                console.error('Capture error:', error);
            }
        }, interval);
        
        // Initial capture
        await this.captureAndAnalyze();
    }

    stop() {
        this.isCapturing = false;
        
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
    }

    async captureAndAnalyze() {
        const settings = await chrome.storage.local.get(['selectedArea', 'apiKey', 'position', 'strategy', 'indicators']);
        
        if (!settings.selectedArea || !settings.apiKey) {
            console.log('Missing required settings for capture');
            return;
        }
        
        try {
            // Capture the chart area
            const screenshot = await this.captureArea(settings.selectedArea);
            
            // Send to AI for analysis
            const analysis = await this.analyzeScreenshot(screenshot, settings);
            
            // Send result to popup
            chrome.runtime.sendMessage({
                type: 'analysisResult',
                data: analysis
            });
            
        } catch (error) {
            console.error('Analysis error:', error);
            
            // Send error to popup
            chrome.runtime.sendMessage({
                type: 'analysisResult',
                data: {
                    longCase: `Error: ${error.message}`,
                    shortCase: `Error: ${error.message}`
                }
            });
        }
    }

    async captureArea(area) {
        return new Promise((resolve, reject) => {
            console.log('Requesting screenshot for area:', area);
            
            // Request screenshot from background script
            chrome.runtime.sendMessage({
                type: 'captureScreen',
                area: area
            }, (response) => {
                if (response && response.screenshot) {
                    console.log('Screenshot received, size:', response.screenshot.length);
                    // Crop the screenshot to the selected area
                    this.cropScreenshot(response.screenshot, area).then(resolve).catch(reject);
                } else {
                    console.error('Screenshot capture failed:', response);
                    reject(new Error('Failed to capture screenshot'));
                }
            });
        });
    }

    async cropScreenshot(fullScreenshot, area) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log('Full screenshot loaded, dimensions:', img.width, 'x', img.height);
                console.log('Cropping to area:', area);
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = area.width;
                canvas.height = area.height;
                
                // Get device pixel ratio for proper scaling
                const pixelRatio = window.devicePixelRatio || 1;
                console.log('Device pixel ratio:', pixelRatio);
                
                // Draw the cropped portion
                ctx.drawImage(
                    img,
                    area.x * pixelRatio, area.y * pixelRatio,
                    area.width * pixelRatio, area.height * pixelRatio,
                    0, 0,
                    area.width, area.height
                );
                
                const croppedImage = canvas.toDataURL('image/png');
                console.log('Cropped image created, size:', croppedImage.length);
                resolve(croppedImage);
            };
            img.onerror = (error) => {
                console.error('Failed to load screenshot image:', error);
            };
            img.src = fullScreenshot;
        });
    }

    async analyzeScreenshot(screenshot, settings) {
        const prompt = `
You are an expert trading analyst. Analyze this chart screenshot and provide concise long and short cases.

Current position: ${settings.position || 'none'}
Trading strategy: ${settings.strategy || 'Not specified'}
${settings.indicators && settings.indicators.length > 0 ? `Chart indicators: ${settings.indicators.join(', ')}` : ''}

Focus on:
- Price action and trend direction
- Support/resistance levels
- Volume patterns
- Technical indicators visible
- Market structure

Respond in JSON format:
{
    "longCase": "Bullet points with **bold headers** for bullish case",
    "shortCase": "Bullet points with **bold headers** for bearish case", 
    "bestGuess": "Your overall recommendation with **bold headers**",
    "keyLevels": {
        "support": "specific levels",
        "resistance": "specific levels"
    }
}

Use • bullet points, **bold** headers, actual price levels, and specific observations.
        `.trim();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: prompt
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: screenshot,
                                        detail: 'high'
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 300
                })
            });

            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                let content = data.choices[0].message.content;
                console.log('AI Response:', content);
                
                // Strip markdown code blocks if present
                content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
                
                try {
                    return JSON.parse(content);
                } catch (parseError) {
                    console.error('Failed to parse AI response after cleanup:', content);
                    return {
                        longCase: `AI Response (unparsed): ${content.substring(0, 100)}...`,
                        shortCase: `Parse Error: ${parseError.message}`
                    };
                }
            }
            
            throw new Error('No response from AI');
            
        } catch (error) {
            console.error('AI analysis error:', error);
            
            // More specific error messages
            if (error.message.includes('fetch')) {
                return {
                    longCase: "Network error - check internet connection",
                    shortCase: "Network error - check internet connection"
                };
            } else if (error.message.includes('401')) {
                return {
                    longCase: "Invalid API key - check your OpenAI key",
                    shortCase: "Invalid API key - check your OpenAI key"
                };
            } else {
                return {
                    longCase: `Error: ${error.message}`,
                    shortCase: `Error: ${error.message}`
                };
            }
        }
    }
}

// Indicator capture functionality
async function captureIndicators() {
    // Create overlay for indicator selection
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #00ff88;">Capture Chart Elements</h3>
            <p style="margin: 0 0 15px 0;">Click and drag to select your chart's indicator panel/legend</p>
            <button id="startIndicatorCapture" style="
                background: #00ff88; 
                color: #000; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 4px; 
                cursor: pointer;
                margin-right: 10px;
            ">Start Selection</button>
            <button id="cancelIndicatorCapture" style="
                background: #666; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 4px; 
                cursor: pointer;
            ">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('startIndicatorCapture').onclick = () => {
        overlay.remove();
        // Activate area selector for indicators
        window.tradingAreaSelector.activate('indicators');
    };
    
    document.getElementById('cancelIndicatorCapture').onclick = () => {
        overlay.remove();
    };
}

async function processIndicatorScreenshot(area) {
    try {
        // Capture the indicator area
        const screenshot = await window.tradingCapture.captureArea(area);
        
        // Send to AI to parse indicators
        const settings = await chrome.storage.local.get(['apiKey']);
        if (!settings.apiKey) {
            throw new Error('API key required');
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all technical indicators from this screenshot. Return a JSON array of indicator names with their settings (e.g., "RSI(14)", "EMA(20)", "MACD(12,26,9)"). Only return the JSON array, nothing else.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: screenshot,
                                detail: 'high'
                            }
                        }
                    ]
                }],
                max_tokens: 200
            })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
            let content = data.choices[0].message.content.trim();
            
            // Clean up response
            content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
            
            try {
                const indicators = JSON.parse(content);
                
                // Save indicators
                await chrome.storage.local.set({ indicators: indicators });
                
                // Show success message
                const confirmation = document.createElement('div');
                confirmation.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #00ff88;
                    color: #000;
                    padding: 15px 20px;
                    border-radius: 4px;
                    z-index: 999999;
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                    max-width: 300px;
                `;
                confirmation.innerHTML = `
                    <div>Indicators captured successfully!</div>
                    <div style="font-size: 12px; margin-top: 5px;">${indicators.join(', ')}</div>
                `;
                
                document.body.appendChild(confirmation);
                
                setTimeout(() => {
                    confirmation.remove();
                }, 5000);
                
            } catch (parseError) {
                throw new Error('Failed to parse indicator list');
            }
        }
        
    } catch (error) {
        console.error('Indicator capture error:', error);
        alert(`Failed to capture indicators: ${error.message}`);
    }
}

// Initialize classes
window.tradingAreaSelector = new TradingAreaSelector();
window.tradingCapture = new TradingCapture();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'selectArea') {
        window.tradingAreaSelector.activate(message.areaType);
    } else if (message.type === 'captureIndicators') {
        captureIndicators();
    } else if (message.type === 'startCapture') {
        window.tradingCapture.start(message.interval);
    } else if (message.type === 'stopCapture') {
        window.tradingCapture.stop();
    }
});
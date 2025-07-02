# Trading AI Assistant Chrome Extension

A Chrome extension that captures screenshots of trading charts and provides AI-powered analysis with long and short cases.

## Features

- **Area Selection**: Click and drag to select the chart area you want to monitor
- **Automated Screenshots**: Configurable intervals from 5 seconds to 5 minutes
- **AI Analysis**: Uses OpenAI's GPT-4 Vision to analyze charts and provide trading insights
- **Position Tracking**: Knows if you're currently long, short, or flat
- **Strategy Context**: Incorporates your trading plan into the analysis
- **Real-time Updates**: Continuous analysis updates in the popup

## Installation

1. Download all the extension files to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select your extension folder
5. The Trading AI Assistant icon should appear in your toolbar

## Setup

1. Click the extension icon to open the popup
2. Enter your OpenAI API key (you need GPT-4o access - the newer model)
3. Set your current position (Long/Short/None)
4. Add your trading strategy/notes (optional but recommended)
5. Choose screenshot interval (5 seconds to 5 minutes)

## Usage

1. **Select Area**: Click "Select Area" and drag to select your chart
2. **Start Capture**: Click "Start Capture" to begin automated analysis
3. **View Analysis**: Long and short cases appear in the popup
4. **Stop Capture**: Click "Stop Capture" when done

## Requirements

- OpenAI API key with GPT-4 Vision access
- Chrome browser
- Active internet connection

## API Key Setup

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Make sure you have GPT-4o access (the newer vision model)
4. Paste the key (starts with `sk-`) into the extension

## Files Structure

```
trading-ai-assistant/
├── manifest.json          # Extension configuration
├── popup.html             # Main interface
├── popup.js              # Popup functionality
├── content.js            # Page interaction & capture
├── content.css           # Styling for overlays
├── background.js         # Background processes
└── README.md            # This file
```

## Customization

You can modify the analysis prompts in `content.js` in the `analyzeScreenshot` function to:
- Change the analysis style
- Add more specific trading criteria
- Adjust response format
- Include additional context

## Troubleshooting

**Screenshots not working?**
- Make sure you've selected an area first
- Check that the page allows content scripts

**AI analysis failing?**
- Verify your API key is correct and active
- Ensure you have GPT-4 Vision access
- Check your internet connection

**Extension not loading?**
- Enable Developer mode in Chrome extensions
- Check the console for errors
- Try reloading the extension

## Privacy & Security

- Screenshots are sent to OpenAI for analysis
- API keys are stored locally in Chrome storage
- No data is stored on external servers
- Extension only works on tabs you explicitly activate it on

## License

MIT License - Feel free to modify and distribute

## Support

This is a basic implementation. For production use, consider:
- Adding error handling and retry logic
- Implementing proper screenshot capture (html2canvas)
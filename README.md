# WRAITH

**The Invisible AI Copilot for Power Users.**

WRAITH is an always-on-top, translucent terminal overlay that runs silently on your screen. It provides context-aware AI capabilities for any application you're currently using, from coding in VS Code to live meetings.

![Wraith Overlay](.github/screenshot.png)

## Features

- 🟢 **Terminal Brutalist Design:** Acid-green on void black. Beautiful, stark, and distraction-free.
- 👁️ **App-Aware Intelligence:** Automatically detects your active application and switches modes (Focus, Interview, Meeting).
- 📸 **Screen Context (Native OCR):** Press `Ctrl+Enter` to instantly OCR your screen and send it to Groq (Llama 3.3) for lightning-fast answers, or directly pass images to Gemini 2.0 Flash.
- 🎙️ **Live Audio Transcription:** Press `Ctrl+Shift+Space` to record audio via VAD and transcribe using Whisper.
- 📋 **Clipboard Analysis:** WRAITH detects code snippets, errors, and URLs in your clipboard automatically.
- 📖 **Playbooks:** Create custom context profiles (e.g., job descriptions, codebase notes) and inject them directly into your AI context stream.
- ⚡ **Terminal Slash Commands:** Type `/ask`, `/code`, `/meet`, or `/clip` to instantly switch contexts.
- 📝 **Live Action Items:** During meetings, WRAITH runs a background process to extract scrolling action items in real-time.

## Installation

WRAITH is distributed as a lightweight Windows application.

1. Head to the **Releases** page on GitHub.
2. Download the latest `Wraith_Setup.exe`.
3. Launch WRAITH.

*(Note: Tesseract OCR is highly recommended. WRAITH uses it automatically if installed via `winget install UB-Mannheim.TesseractOCR`)*

## Usage

When running, WRAITH lives silently in your system tray.

- `Ctrl+\` - Toggle overlay visibility
- `Ctrl+Enter` - Ask WRAITH a question (includes screenshot OCR context)
- `Ctrl+Shift+Enter` - Ask WRAITH (force screenshot attachment for Vision models)
- `Ctrl+Shift+Space` - Toggle live audio recording
- `Ctrl+Shift+W` - Open the Settings Dashboard

## Configuration

In the Dashboard (`Ctrl+Shift+W`), you can configure:
- **API Keys:** Provide free keys from [Groq](https://console.groq.com/keys) or [Gemini AI Studio](https://aistudio.google.com/app/apikey).
- **Models:** Select from Groq (Llama 3.3 70B), Gemini 2.0 Flash, Mistral, or OpenRouter.
- **Playbooks:** Add active custom prompts that always inject into your context.
- **Hotkeys:** Re-bind the core system shortcuts.

## Development

Built with:
- **Tauri v2** + Rust
- **React 19** + Vite
- **Zustand**
- **Tesseract OCR** (Local execution)

```bash
# Install dependencies
npm install

# Run the dev server
npx tauri dev

# Build the release executable
npx tauri build
```

## License
MIT License.

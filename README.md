> Writing a browser extension by hand in 2025 is practically a war crime.
> This one was vibe-coded with [Claude Code](https://claude.com/claude-code).

# Oxford Word Saver

A Firefox/Chrome extension for [oxfordlearnersdictionaries.com](https://www.oxfordlearnersdictionaries.com):

- **Save** button next to the word heading — saves the word, transcription, UK/US audio, first definition and example
- Extension icon opens your word list: search, sort, play UK/US pronunciation, **Play All** (UK, US or UK→US), JSON export/import

## Installation

**Firefox / Zen (temporary, until browser restart):**
1. Open `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on…" → select `manifest.json`

**Chrome:**
1. `chrome://extensions` → enable "Developer mode"
2. "Load unpacked" → select this folder
   (Ignore the `browser_specific_settings` warning — it's Firefox-only)

## Data

Words are stored locally in `storage.local`. Audio is stored as links to Oxford's servers.
To transfer between browsers or make a backup: use **Export JSON / Import JSON** on the full page (click "Open full page" in the popup).

## If something breaks after a site update

The save button reads Oxford's DOM selectors — if the site restructures, check `saver.js`.

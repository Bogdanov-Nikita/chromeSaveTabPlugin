# Tab Saver

**Tab Saver** is a lightweight, secure, and feature-rich browser extension (WebExtension) designed to save, organize, and quickly restore open browser tabs.

The project supports exporting tabs into `TXT`, `HTML`, and `JSON` formats. It features smart session restoration, original favicon rendering, total XSS protection, a flexible domain-grouping option, and full multi-language support.

## 🚀 Key Features

- **Smart Export into 3 Formats:**
    - **TXT (Text List):** A clean list of all open URLs, formatted as a structured or a flat list.
    - **HTML (Interactive Report):** A self-contained, visually polished page featuring website icons (`favicons`) and interactive accordion blocks built purely with `<details>` and `<summary>` tags.
    - **JSON (Backup File):** A structured backup file that preserves core metadata (titles, URLs, icons) for subsequent precise restoration.
- **"Group by Domain" Option:** A dedicated checkbox in the UI lets users choose how data is saved—either grouped by site names (domains) or as a flat list preserving the original tab order.
- **Security & XSS Protection:** All dynamic data (titles, URLs, domain names) undergoes rigorous HTML escaping, completely neutralizing any malicious code execution when opening saved files.
- **Smart Session Restoration (JSON Import):** The import algorithm automatically distributes tabs into new windows in the background (without breaking user focus):
    - Large domain groups (over 10 tabs) are opened in separate dedicated windows.
    - Remaining tabs are chunked and opened in batches of exactly 20 per window, preventing browser freezes.
- **Cross-Browser Compatibility:** Google Chrome (Chromium) and Mozilla Firefox.
- **Internationalization (i18n):** The sidebar interface and generated files are fully localized, supporting both English and Russian languages out of the box.

## 📂 Project Structure

```text
Tab-Saver/
├── manifest.json         # Extension manifest (MV3, optimized permissions)
├── service-worker.js     # Background script handling sidebar behavior
├── side/                 # Sidebar interface assets
│   ├── side-panel.html   # Extension UI
│   ├── style.css         # Adaptive sidebar styles
│   └── side.js           # Core logic (exporting, importing)
└── _locales/             # Extension localization folder
    ├── ru/
    │   └── messages.json # Russian translations
    └── en/
        └── messages.json # English translations
```

## 🛠️ Installation and Setup

### For Chromium-based Browsers (Google Chrome, Edge, Opera, Brave):

1. Navigate to `chrome://extensions/`.
2. Enable **"Developer mode"** via the toggle switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the root folder of the `Tab-Saver` project.
5. Click the extension icon on the toolbar to trigger and open the side panel.

## 📝 Core Functions in `side.js`

### `processingSaveTabs(type)`
Manages the asynchronous flow of querying tabs via `browser.tabs.query`, reads the grouping option status, locks UI elements during the process, and fires the file download.

### `restoreTabsFromJSON(jsonString)`
Parses a JSON backup file and runs the safe multi-window distribution routine. Validates the file structure beforehand and displays user-friendly alert notifications in case of errors.

## 🤝 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute this codebase.

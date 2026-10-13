---
name: electron-desktop-architect
description: Elite Electron desktop application architecture, secure IPC communication (contextBridge, preload), electron-updater auto-update pipelines, mandatory SemVer version bumping laws, packaging with electron-builder, native hardware integration (thermal receipt printers, barcode kiosks, cash drawers), and multi-window state synchronization. Use whenever developing, debugging, packaging, or bumping versions for apps/desktop or agent-desktop.
---

# Electron Desktop Application Architecture & Release Standards

## Core Electron Laws & Auto-Update Pipeline

### 1. Mandatory SemVer Increment on ANY Desktop Change
- **Rule:** Whenever ANY bug fix, UI change, or feature is made in `apps/desktop`, you MUST ALWAYS bump the `version` in `apps/desktop/package.json` (e.g. `1.0.4` -> `1.0.5`).
- **SemVer Comparison Law (`electron-updater`):**
  - `electron-updater` fetches `https://maxp.online/download/latest.yml` and performs strict semantic comparison (`remoteVersion > localVersion`).
  - If `remoteVersion === localVersion`, the updater evaluates the app as "up-to-date" and silently aborts download.
  - For employees and users to receive automatic background updates without manual reinstall, `remoteVersion` MUST BE STRICTLY GREATER than `localVersion`.
- **Synchronized Tag & Release Pipeline:**
  - After bumping `package.json`, create and push the matching git tag:
    ```bash
    git tag -a v1.0.5 -m "Release v1.0.5"
    git push origin refs/tags/v1.0.5
    ```
  - This triggers GitHub Actions (`release-desktop.yml`), which compiles the NSIS installer and publishes `latest.yml`.
- **Ban Ghost Releases:** Never deploy desktop modifications without incrementing the version.

### 2. Secure IPC Architecture (Zero `nodeIntegration` in Renderer)
- **Hardened Main Window Configuration:**
  ```javascript
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  ```
- **Context Bridge API Exposure:**
  - In `preload.js`, expose explicit, typed channels rather than generic `send`/`on`:
  ```javascript
  // preload.js
  const { contextBridge, ipcRenderer } = require('electron');

  contextBridge.exposeInMainWorld('desktopAPI', {
    printThermalReceipt: (payload) => ipcRenderer.invoke('printer:print-thermal', payload),
    scanBarcode: (callback) => {
      const handler = (_event, barcode) => callback(barcode);
      ipcRenderer.on('scanner:barcode-read', handler);
      return () => ipcRenderer.removeListener('scanner:barcode-read', handler);
    },
    getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  });
  ```

### 3. Native Hardware Integration
- **Thermal Receipt Printers (ESC/POS):**
  - Use silent printing or direct socket/USB ESC/POS commands without rendering modal OS print dialogs.
  - Implement fallback to standard WebPrint (`webContents.print({ silent: true })`).
- **Barcode Scanners (Kiosk Mode):**
  - Support HID keyboard wedge scanners with configurable delimiter detection (`Enter`/`Tab`) and rapid buffer flushing (preventing human typing interleaving).

### 4. Crash Resilience & Logging
- Catch unhandled rejections and exceptions in main process:
  ```javascript
  process.on('uncaughtException', (error) => {
    logger.error('Main process uncaught exception:', error);
  });
  ```
- Store persistent local logs in `app.getPath('userData')/logs/`.

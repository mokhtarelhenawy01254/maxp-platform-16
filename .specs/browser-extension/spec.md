# Delta Specification: MaxP AI Browser Extension (Popup Copilot)

## 1. Extension Manifest (Manifest V3)
- `manifest_version`: 3
- `name`: "MaxP Copilot — مساعد المنصة الذكي"
- `version`: "1.0.0"
- `description`: "مساعد الذكاء الاصطناعي السريع لمنصة MaxP — إرشاد، إجابة استفسارات، ووصول فوري للطلبات والمخزون من أي صفحة"
- `permissions`:
  - `storage`: for local caching of auth token, selected agent, and server URL.
  - `activeTab`: for querying the current tab title and URL when requested.
- `action`:
  - `default_popup`: "index.html"
  - `default_title`: "MaxP Copilot"
- `host_permissions`:
  - `https://maxp.online/*`
  - `http://localhost:*/*`

## 2. Component Architecture & Modular Design (< 300 lines each)
```
apps/browser-extension/
├── manifest.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Controller & Root State (< 200 lines)
│   ├── types/extension.ts       # Shared TypeScript schemas (< 80 lines)
│   ├── services/
│   │   ├── api.ts               # MaxP API Client with JWT Bearer (< 150 lines)
│   │   └── chrome.ts            # Chrome Storage & Tab API Adapter (< 80 lines)
│   └── components/
│       ├── Header.tsx           # Top bar: Connection, Agent Pill, Settings (< 120 lines)
│       ├── ChatList.tsx         # Message Stream & Markdown Rendering (< 180 lines)
│       ├── ChatInput.tsx        # Composer with Tab Context Pill (< 140 lines)
│       ├── QuickActions.tsx     # Preset operational prompts (< 100 lines)
│       ├── LoginView.tsx        # Direct login & token configuration (< 150 lines)
│       └── SettingsModal.tsx    # Server URL & Agent Selector (< 150 lines)
```

## 3. Data Contracts & State Machine

### Tab Context Contract
```typescript
export interface TabContext {
  title: string;
  url: string;
  favIconUrl?: string;
}
```

### Chat Message Contract
```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tabContext?: TabContext;
  status?: 'sending' | 'success' | 'error';
}
```

### Agent Profile Contract
```typescript
export interface ExtensionAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  badge: string;
  description: string;
}
```

### UI State Machine
- `UNAUTHENTICATED`: Shows `LoginView` (allows email/password login or manual token input + quick server configuration).
- `READY`: Shows `Header` + `QuickActions` (if no messages) + `ChatList` + `ChatInput`.
- `STREAMING`: Shows typing / streaming indicator with disabled input to prevent duplicate requests.
- `SETTINGS_OPEN`: Opens modal to switch server (`https://maxp.online` vs local) and active agent.

## 4. Edge Cases & Defensive Handling
1. **No Active Tab / System Pages (e.g. chrome://extensions):**
   - Gracefully disable "Include Tab Context" chip without throwing uncaught runtime exceptions.
2. **Expired Token / 401 Unauthorized:**
   - Detect 401 response, flag `isAuthValid: false`, and prompt user to re-login with a clear friendly notice.
3. **Offline / Network Outage:**
   - Show retry button on the affected message bubble with clean error telemetry.
4. **Popup Sizing Constraints:**
   - Fixed dimension: `w-[380px] h-[580px]` with `overflow-hidden` container and custom scrollbars to prevent horizontal jitter in Chrome popup window.

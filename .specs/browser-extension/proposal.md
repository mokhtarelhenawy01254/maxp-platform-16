# Proposal: MaxP AI Browser Extension (Popup Copilot)

## Problem Statement
Users and merchants of MaxP frequently browse various web pages (supplier websites, e-commerce stores, competitor campaigns, customer support chats) while needing quick guidance, instant answers to platform questions, and immediate access to store operations (orders, stock, pricing, and system policies) without constantly switching back and forth between multiple browser tabs.

## Chosen Solution
A lightweight, fast, and ergonomic Google Chrome / Microsoft Edge Extension (Manifest V3) opening as an instant **Popup** from the browser toolbar:
- Acts as a general platform assistant ("مساعد عام للمنصة").
- Answers inquiries, guides the user, and connects directly to MaxP backend APIs.
- Captures active tab context (URL, page title) with user consent.
- Provides one-click quick actions for store metrics, orders, inventory alerts, and platform knowledge.

## Scope & Non-Goals
- **In Scope:**
  - Manifest V3 popup application built with React 18, Vite, TypeScript, and Tailwind CSS.
  - Integration with MaxP backend (`/api/ai-agent-chat` & `/api/auth`).
  - Secure token storage via `chrome.storage.local`.
  - Active tab context integration (`activeTab` permission).
  - Quick action chips for common merchant operations.
  - Agent switcher (Store Manager, Support, Orders, Inventory).
- **Out of Scope (Non-Goals for v1):**
  - Full-page DOM scraping or invasive content injection across arbitrary external sites without permission.
  - Local AI model execution (all AI inference runs on MaxP cloud/backend via `public.ai_keys`).

## Security & Tenant Boundary
- **No Hardcoded Keys:** ZERO AI keys in extension client code.
- **Tenant Isolation:** All API calls authenticate with Bearer JWT tokens; server enforces `companyId` isolation on every query.
- **Safe Permissions:** Minimal required permissions (`storage`, `activeTab`), avoiding invasive `webRequest` or `<all_urls>` background listeners.

## Performance Impact
- Zero bundle overhead on regular web pages (runs in isolated popup).
- Fast cold start (< 120ms popup load time).
- Vite production build produces optimized static bundle ready for `Load unpacked` in Chrome/Edge or Web Store publishing.

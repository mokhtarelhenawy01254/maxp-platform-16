# Auth Text Encoding

## Problem

Some backend auth responses were returning Arabic text in mojibake form such as `ÃƒËœ...`, which made login errors unreadable in the UI.

## Fix

- corrected the known broken login messages at the backend source in `backend/controller/authController.js`
- added a frontend fallback in `frontend/src/utils/textEncoding.ts` so the app can repair common CP1252/UTF-8 mojibake automatically before rendering error text

## Scope

The backend fix covers the current login flow directly.

The frontend fallback protects other API-driven surfaces if older corrupted strings still come back from the server.

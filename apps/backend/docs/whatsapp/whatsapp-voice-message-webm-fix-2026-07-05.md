# WhatsApp Voice Note WebM Rejection Fix

**Date**: 2026-07-05  
**Author**: Antigravity  

## Overview
This document describes the fix for the WhatsApp voice note upload failure that occurred when recording audio messages directly from the WhatsApp workspace interface.

## Problem Description
Browser audio recording APIs natively produce `.webm` files and submit them with `audio/webm` (or sometimes `video/webm`) mimetypes.
In the backend's `/whatsapp/messages/upload-send` route, the Multer middleware file filter rejected these mimetypes because they were missing from `MIME_TYPE_MAP`. This caused the request to fail before reaching the controller logic.
Additionally, when an audio file was uploaded, the controller called `WhatsAppMessageHandler.sendAudio` without passing the `{ ptt: true }` option, meaning it was treated as a standard audio file attachment instead of a playable WhatsApp voice note.

## Solution

### 1. Backend Route Support (whatsappRoutes.js)
- Added `audio/webm` and `video/webm` mimetypes to the `MIME_TYPE_MAP` so they pass Multer validations.
- Extracted the `ptt` parameter from `req.body`.
- Dynamically check if `ptt === 'true'` or if the original file name is `'voice_note.webm'` to override the media type classification to `'audio'`.
- Forward `{ ptt: isVoiceNote }` to `WhatsAppMessageHandler.sendAudio()`.

### 2. Media Handler Support (WhatsAppMediaHandler.js)
- Added `audio/webm` and `video/webm` mimetypes to `SUPPORTED_TYPES.audio` and `SUPPORTED_TYPES.video`.
- Added mappings in `getExtension()` to return `'webm'` for webm audio/video files, preventing them from saving with a fallback `.bin` extension.

### 3. Frontend Explicit Flag (WhatsAppChat.tsx)
- Updated `onVoiceNoteSend` to append `ptt: 'true'` explicitly to the `FormData` payload when uploading recorded voice notes.

### 4. Mimetype Codecs Normalization (whatsappRoutes.js & WhatsAppMediaHandler.js)
- Normal browsers sometimes submit recorded audio with parameters in the mimetype, e.g., `audio/webm;codecs=opus`.
- Updated `whatsappRoutes.js` (Multer setup) and `WhatsAppMediaHandler.js` (helpers `getMediaTypeFromMimetype`, `getExtension`, and `validateFile`) to strip codecs parameters (using `.split(';')[0].trim()`) before checking them against supported types maps. This prevents `Error: نوع الملف غير مدعوم` validation errors on parameters-rich mimetypes.

### 5. Meta Cloud API WebM Audio Upload (MetaCloudProvider.js)
- Added `uploadMediaFile()` function that uploads media files to Meta's Media API endpoint (`POST /{{version}}/{{phone-number-id}}/media`) using `form-data`.
- Modified `sendMedia()` to use the Media API upload path for `audio` and `video` kinds when a `buffer` is available on the media object, instead of directly sending a `link`.
- This fixes the 500 error when sending voice notes via Meta Cloud API, because `audio/webm` format produced by the browser's `MediaRecorder` is not directly supported by Meta's messages endpoint but can be uploaded via the Media API and referenced by ID.

### 6. WebM → OGG Conversion for Meta Cloud API Compatibility (WhatsAppMediaHandler.js)
- **Date**: 2026-07-06  
- Added `convertWebmToOgg()` function that uses `ffmpeg` (via `ffmpeg-static`) to convert `audio/webm` buffers to `audio/ogg` (Opus codec, 16kHz, mono, 16kbps) — the format required by WhatsApp Cloud API for voice messages.
- Modified `uploadMedia()` to automatically detect `audio/webm` input and convert it to `audio/ogg` before saving, ensuring all downstream code (Meta Media API upload + send) receives a WhatsApp-compatible format.
- The file extension and mimetype in the returned media object are updated to `.ogg` / `audio/ogg` so the Meta Cloud Provider sends the correct content type.

### 7. Resolve `sessionId=all` to Active Session (whatsappRoutes.js)
- **Date**: 2026-07-06
- The frontend sends `sessionId=all` in the upload-send request, meaning "use any available session".
- Previously, the route handler passed `sessionId=all` directly to `WhatsAppMessageHandler.sendAudio()`, which tried to look up the session by ID "all" in the database and in-memory store — both returned null/undefined, causing the "الجلسة غير متصلة" 500 error.
- Fixed: the route handler now checks if `sessionId === 'all'` and resolves it by querying the first `CONNECTED` session for the current company from the database, ordered by `lastConnectedAt` descending. The resolved session ID is then passed to the message handler.

### Why This Is Necessary
Meta's WhatsApp Cloud API Media endpoint officially supports `audio/aac`, `audio/mp4`, `audio/mpeg`, `audio/amr`, and `audio/ogg; codecs=opus` for voice messages. The `audio/webm` format produced by browser `MediaRecorder` (Chrome/Edge/Firefox) is **not** a supported type. Even though the file can be uploaded via the Media API, Meta's platform rejects `audio/webm` as an invalid format for WhatsApp message delivery.


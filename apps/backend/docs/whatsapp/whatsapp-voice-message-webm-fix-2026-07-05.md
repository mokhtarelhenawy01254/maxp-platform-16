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

### 7. Resolve `sessionId=all` to Active Session (whatsappRoutes.js) — Updated 2026-07-06
- **Date**: 2026-07-06
- The frontend sends `sessionId=all` in the upload-send request, meaning "use any available session".
- Previously, the route handler passed `sessionId=all` directly to `WhatsAppMessageHandler.sendAudio()`, which tried to look up the session by ID "all" in the database and in-memory store — both returned null/undefined, causing the "الجلسة غير متصلة" 500 error.
- Fixed: the route handler now checks if `sessionId === 'all'` and resolves it in two steps:
  1. First, queries in-memory connected Baileys sessions via `WhatsAppManager.getCompanySessions()`.
  2. If none in memory, queries the DB for a `CONNECTED` session. For Baileys sessions, verifies the resolved session is actually present in the in-memory store before using it.
- This prevents the mismatch between DB status (CONNECTED after deploy restart) and in-memory session (still restoring).

### 8. Broaden WebM → OGG Conversion to All Non-Meta Audio Formats (WhatsAppMediaHandler.js)
- **Date**: 2026-07-06
- The browser's MediaRecorder may produce `audio/wav` instead of `audio/webm` depending on the browser/OS. The initial conversion check only matched `audio/webm`, so WAV-encoded blobs bypassed conversion and were sent directly to the Meta Cloud API, which rejected them with HTTP 400.
- Fixed: the conversion check now rejects all unsupported audio MIME types (anything not in the Meta-supported set: `audio/aac`, `audio/mp4`, `audio/mpeg`, `audio/amr`, `audio/ogg`) and converts them to `audio/ogg` via ffmpeg.

### 9. Fix Input Extension for convertWebmToOgg (WhatsAppMediaHandler.js)
- **Date**: 2026-07-06
- `convertWebmToOgg()` always saved the input buffer to a `.webm` file, but when the browser produces `audio/wav`, ffmpeg fails because it tries to parse WAV data as Matroska/WebM format (`Error opening input: End of file`).
- Fixed: `convertWebmToOgg()` now accepts an optional `sourceMime` parameter. An extension map determines the correct input file extension (`.wav`, `.webm`, `.mp3`, `.m4a`, `.3gp`, etc.), falling back to `.webm` for unknown types.

### Why This Is Necessary
Meta's WhatsApp Cloud API Media endpoint officially supports `audio/aac`, `audio/mp4`, `audio/mpeg`, `audio/amr`, and `audio/ogg; codecs=opus` for voice messages. The `audio/webm` format produced by browser `MediaRecorder` (Chrome/Edge/Firefox) is **not** a supported type. Even though the file can be uploaded via the Media API, Meta's platform rejects `audio/webm` as an invalid format for WhatsApp message delivery.


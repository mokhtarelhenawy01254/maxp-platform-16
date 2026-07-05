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



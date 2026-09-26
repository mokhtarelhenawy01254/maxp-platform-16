/**
 * 📎 Chat Media Archive Service
 *
 * 2026-09-23 (SKILL ❽.9.14 enforcement): Meta/CDN media URLs are signed and
 * short-lived (~5 minutes for the URL, days for the object). Customer chat
 * images used to keep the raw fbcdn URL — by the time the agent ran, the
 * link was dead (400) and the reply came hours late or blind.
 *
 * This service downloads the media ONCE at webhook time and re-hosts it
 * under /uploads/chat-media/ so every consumer (UI, AI shield, exports)
 * always has a live, stable URL.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const CHAT_MEDIA_DIR = path.join(UPLOADS_ROOT, 'chat-media');
const MAX_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 4000;

const EXT_BY_MIME = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf'
};

const ACCEPTED_PREFIXES = ['image/', 'video/', 'audio/'];

const isExternalHttpUrl = (url) => /^https?:\/\//i.test(String(url || '').trim());

const publicBaseUrl = () => {
    const raw = process.env.PUBLIC_BASE_URL
        || (process.env.WEBHOOK_BASE_URL ? process.env.WEBHOOK_BASE_URL.replace(/\/webhooks\/?$/i, '') : '')
        || 'https://maxp.online';
    return raw.replace(/\/+$/, '');
};

const extFor = (contentType, url) => {
    if (EXT_BY_MIME[contentType]) return EXT_BY_MIME[contentType];
    try {
        const fromPath = path.extname(new URL(url).pathname);
        if (fromPath && fromPath.length <= 5) return fromPath.toLowerCase();
    } catch { /* ignore */ }
    return '.bin';
};

/**
 * Download an external media URL once and re-host it locally.
 * Returns { localPath, publicUrl, bytes, contentType } or null on any failure
 * (caller keeps the original URL and may retry later).
 */
async function archiveExternalMedia(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!isExternalHttpUrl(url)) return null;

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: DOWNLOAD_TIMEOUT_MS,
            maxContentLength: MAX_BYTES,
            headers: { 'User-Agent': 'Mozilla/5.0 (MaxP-Chat-Media-Archiver)' },
            validateStatus: (s) => s === 200
        });

        const contentType = String(response.headers['content-type'] || '')
            .split(';')[0].trim().toLowerCase();
        if (!ACCEPTED_PREFIXES.some((p) => contentType.startsWith(p)) && contentType !== 'application/pdf') {
            return null;
        }

        const buffer = Buffer.from(response.data);
        if (!buffer.length || buffer.length > MAX_BYTES) return null;

        const day = new Date().toISOString().slice(0, 10);
        const dir = path.join(CHAT_MEDIA_DIR, day);
        fs.mkdirSync(dir, { recursive: true });

        const filename = `${crypto.randomUUID()}${extFor(contentType, url)}`;
        fs.writeFileSync(path.join(dir, filename), buffer);

        const localPath = `/uploads/chat-media/${day}/${filename}`;
        return {
            localPath,
            publicUrl: `${publicBaseUrl()}${localPath}`,
            bytes: buffer.length,
            contentType
        };
    } catch (error) {
        console.warn(`📎 [MEDIA-ARCHIVE] Failed to archive ${String(url).slice(0, 120)}: ${error.message}`);
        return null;
    }
}

/**
 * Archive up to `limit` attachment URLs. Returns
 * { attachments, originals, archivedCount } — attachments keep their shape
 * with `url` swapped to the local public URL when archiving succeeded.
 */
async function archiveAttachments(attachmentsData, limit = 4) {
    const items = (attachmentsData || []).slice(0, limit);
    const results = await Promise.all(
        items.map(async (att) => {
            if (!att || !att.url || !isExternalHttpUrl(att.url)) {
                return { att, original: null, archived: false };
            }
            try {
                const archived = await archiveExternalMedia(att.url);
                if (archived) {
                    return {
                        att: { ...att, url: archived.publicUrl },
                        original: { original: att.url, local: archived.publicUrl },
                        archived: true
                    };
                }
            } catch (err) {
                // Keep original URL on archive error
            }
            return { att, original: null, archived: false };
        })
    );

    const originals = results.filter((r) => r.original).map((r) => r.original);
    const out = results.map((r) => r.att);
    const archivedCount = results.filter((r) => r.archived).length;
    return { attachments: out, originals, archivedCount };
}

module.exports = {
    archiveExternalMedia,
    archiveAttachments,
    isExternalHttpUrl,
    extFor,
    CHAT_MEDIA_DIR
};

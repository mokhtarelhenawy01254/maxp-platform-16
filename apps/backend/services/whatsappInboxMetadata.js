const buildQueueKeyFromStatus = (...args) => '';
const safeJsonParse = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
module.exports = { buildQueueKeyFromStatus, safeJsonParse };

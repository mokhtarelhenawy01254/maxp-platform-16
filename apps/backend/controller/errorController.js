function truncate(value, maxLength = 240) {
    if (typeof value !== 'string') {
        return value;
    }

    return value.length > maxLength
        ? `${value.slice(0, maxLength)}...`
        : value;
}

// In-memory deduplication map: suppress identical frontend error logs within 15s
const recentErrors = new Map();
const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 30000;
    for (const [key, ts] of recentErrors.entries()) {
        if (ts < cutoff) recentErrors.delete(key);
    }
}, 60000);
if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
}

const ErrorTrackingController = {
    logError: async (req, res) => {
        try {
            const errorLog = req.body || {};

            const message = String(errorLog.message || '');
            const chunkName = errorLog.chunkName || errorLog.metadata?.chunkName || errorLog.context?.chunkName;
            const componentStack = errorLog.componentStack || errorLog.metadata?.componentStack || errorLog.context?.componentStack;

            // In-memory dedupe: if identical message + chunk arrived in last 15s, return 204 immediately
            const dedupeKey = `${message}::${chunkName || ''}`;
            const now = Date.now();
            if (recentErrors.has(dedupeKey) && (now - recentErrors.get(dedupeKey)) < 15000) {
                return res.status(204).end();
            }
            recentErrors.set(dedupeKey, now);

            if (process.env.NODE_ENV === 'production') {
                const compactErrorLog = {
                    message: truncate(message, 180),
                    url: truncate(errorLog.url, 180),
                    timestamp: errorLog.timestamp,
                    type: errorLog.type || 'unknown',
                    userAgent: truncate(errorLog.userAgent, 120),
                    chunkName: chunkName ? truncate(chunkName, 120) : undefined,
                    componentStack: componentStack ? truncate(componentStack, 500) : undefined,
                    stack: truncate(
                        typeof errorLog.stack === 'string'
                            ? errorLog.stack.split('\n')[0]
                            : '',
                        240
                    ),
                    metadataKeys: errorLog.metadata && typeof errorLog.metadata === 'object' && !Array.isArray(errorLog.metadata)
                        ? Object.keys(errorLog.metadata).slice(0, 10)
                        : (errorLog.context && typeof errorLog.context === 'object' && !Array.isArray(errorLog.context)
                            ? Object.keys(errorLog.context).slice(0, 10)
                            : undefined)
                };

                console.error('[FRONTEND-ERROR]', JSON.stringify(compactErrorLog));
            } else {
                console.error('\n================ FRONTEND ERROR ================');
                console.error('Message:', message);
                console.error('URL:', errorLog.url);
                if (chunkName) {
                    console.error('Chunk Name:', chunkName);
                }
                if (componentStack) {
                    console.error('Component Stack:', componentStack);
                }
                console.error('Timestamp:', errorLog.timestamp);
                console.error('UserAgent:', errorLog.userAgent);
                console.error('Type:', errorLog.type || 'unknown');

                if (errorLog.stack) {
                    console.error('Stack Trace:');
                    console.error(errorLog.stack);
                }

                const metadataObj = errorLog.metadata || errorLog.context;
                if (metadataObj) {
                    try {
                        console.error('Metadata:', JSON.stringify(metadataObj, null, 2));
                    } catch (_) {}
                }

                console.error('================================================\n');
            }

            // Fast 204 No Content response
            return res.status(204).end();
        } catch (error) {
            console.warn('[ERROR-CONTROLLER] Safe fallback for error log processing:', error.message);
            return res.status(204).end();
        }
    }
};

module.exports = ErrorTrackingController;

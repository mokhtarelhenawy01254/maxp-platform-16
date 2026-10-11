function truncate(value, maxLength = 240) {
    if (typeof value !== 'string') {
        return value;
    }

    return value.length > maxLength
        ? `${value.slice(0, maxLength)}...`
        : value;
}

const ErrorTrackingController = {
    logError: async (req, res) => {
        try {
            const errorLog = req.body || {};

            if (process.env.NODE_ENV === 'production') {
                const compactErrorLog = {
                    message: truncate(errorLog.message, 180),
                    url: truncate(errorLog.url, 180),
                    timestamp: errorLog.timestamp,
                    type: errorLog.type || 'unknown',
                    userAgent: truncate(errorLog.userAgent, 120),
                    stack: truncate(
                        typeof errorLog.stack === 'string'
                            ? errorLog.stack.split('\n')[0]
                            : '',
                        240
                    ),
                    metadataKeys: errorLog.metadata && typeof errorLog.metadata === 'object' && !Array.isArray(errorLog.metadata)
                        ? Object.keys(errorLog.metadata).slice(0, 10)
                        : undefined
                };

                console.error('[FRONTEND-ERROR]', JSON.stringify(compactErrorLog));
            } else {
                console.error('\n================ FRONTEND ERROR ================');
                console.error('Message:', errorLog.message);
                console.error('URL:', errorLog.url);
                console.error('Timestamp:', errorLog.timestamp);
                console.error('UserAgent:', errorLog.userAgent);
                console.error('Type:', errorLog.type || 'unknown');

                if (errorLog.stack) {
                    console.error('Stack Trace:');
                    console.error(errorLog.stack);
                }

                if (errorLog.metadata) {
                    try {
                        console.error('Metadata:', JSON.stringify(errorLog.metadata, null, 2));
                    } catch (_) {}
                }

                console.error('================================================\n');
            }

            res.status(200).json({
                success: true,
                message: 'Error logged successfully'
            });
        } catch (error) {
            console.warn('[ERROR-CONTROLLER] Safe fallback for error log processing:', error.message);
            res.status(200).json({
                success: false,
                message: 'Processed with fallback'
            });
        }
    }
};

module.exports = ErrorTrackingController;

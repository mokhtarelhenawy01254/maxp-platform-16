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
                    metadataKeys: errorLog.metadata && typeof errorLog.metadata === 'object'
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
                    console.error('Metadata:', JSON.stringify(errorLog.metadata, null, 2));
                }

                console.error('================================================\n');
            }

            res.status(200).json({
                success: true,
                message: 'Error logged successfully'
            });
        } catch (error) {
            console.error('[ERROR-CONTROLLER] Failed to process error log:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process error log'
            });
        }
    }
};

module.exports = ErrorTrackingController;

module.exports = {
    apps: [
        {
            name: 'maxp-backend',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            // Recycle before memory bloat causes swap/stalls (1.4GB RSS caused
            // 60s request stalls + SharedDB query timeouts); nightly recycle
            // at lowest-traffic hour as a safety net.
            max_memory_restart: '1200M',
            cron_restart: '0 4 * * *',
            env: {
                NODE_ENV: 'development',
                PORT: 3007,
                AI_SERVICE_URL: 'http://localhost:8000'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3007,
                AI_SERVICE_URL: 'http://localhost:8000'
            },
            exp_backoff_restart_delay: 100,
            error_file: 'logs/err.log',
            out_file: 'logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        },
        {
            name: 'maxp-webhook-worker',
            script: 'workers/webhookWorker.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            },
            exp_backoff_restart_delay: 100,
            error_file: 'logs/webhook-worker-err.log',
            out_file: 'logs/webhook-worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        }
    ]
};

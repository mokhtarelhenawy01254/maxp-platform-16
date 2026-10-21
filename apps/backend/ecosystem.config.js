module.exports = {
    apps: [
        {
            name: 'maxp-backend',
            script: 'server.js',
            instances: 2,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            // 2026 hardening: baseline RSS is ~800-1100MB (WhatsApp sessions +
            // AI runtime + media proxy in one process). A 1200M cap recycled
            // the process every few minutes under normal traffic → nginx
            // "connection refused" windows → intermittent page load failures
            // (marketplace / my-apps). 2G gives real headroom; the nightly
            // recycle at 04:00 handles slow leaks as a safety net.
            max_memory_restart: '2G',
            cron_restart: '0 4 * * *',
            // Avoid restart storms: require 60s stability before counting a
            // start, back off on crash loops, cap consecutive restarts.
            min_uptime: '60s',
            max_restarts: 20,
            restart_delay: 2000,
            exp_backoff_restart_delay: 500,
            kill_timeout: 20000,
            wait_ready: true,
            listen_timeout: 60000,
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
            min_uptime: '60s',
            max_restarts: 20,
            restart_delay: 2000,
            exp_backoff_restart_delay: 500,
            kill_timeout: 20000,
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            },
            error_file: 'logs/webhook-worker-err.log',
            out_file: 'logs/webhook-worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss'
        }
    ]
};

# Server Log Monitoring Scripts

## Overview

To enable developers to monitor remote server logs in real-time without manually writing SSH connection commands, two interactive monitoring scripts have been added to the root directory:

1. `monitor-server-logs.ps1` (PowerShell)
2. `monitor-server-logs.sh` (Bash)

These scripts connect over SSH to the production server `srv974554.hstgr.cloud` and stream logs from running PM2 processes.

## Features

- **Interactive Menu**: Prompts the user to select which logs to stream (AI Service, Backend, Webhook worker, or combined).
- **Graceful Termination**: Runs `ssh` with the `-t` option to allocate a pseudo-tty, ensuring that when the user presses `Ctrl+C`, the remote log streaming process terminates gracefully.
- **Custom Commands**: Allows running ad-hoc PM2 commands (such as `pm2 status` or `pm2 show`) directly from the local terminal.

## Usage

### PowerShell (Windows)

```powershell
.\monitor-server-logs.ps1
```

### Bash (Git Bash / Linux / macOS)

```bash
chmod +x ./monitor-server-logs.sh
./monitor-server-logs.sh
```

## PM2 Process Names Map

- **AI Service**: `maxp-ai-service`
- **Backend API**: `maxp-backend`
- **Webhook Worker**: `maxp-webhook-worker`

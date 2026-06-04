# GitHub Actions SSH Firewall Fix

**Date:** 2026-05-25  
**Author:** DevOps  
**Tags:** `ssh`, `firewall`, `github-actions`, `deployment`, `hostinger`

## Overview

The production deployment pipeline uses GitHub Actions to SSH into the Hostinger VPS server (`srv974554.hstgr.cloud`). If the server's firewall blocks the ephemeral GitHub Actions runner IPs, the `appleboy/ssh-action` step fails with a connection timeout.

## Root Cause

GitHub Actions runners use dynamic IP addresses drawn from the ranges published at `https://api.github.com/meta`. These ranges are not pre-whitelisted in the server firewall (UFW/firewalld/iptables) or the Hostinger cloud firewall (hPanel → VPS → Firewall).

## Fix Script

**File:** `scripts/fix-ssh-firewall.sh`

Run this on the **server** (via Hostinger hPanel Terminal or any existing SSH session):

```bash
curl -sfL https://raw.githubusercontent.com/mokhtar-elhenawy/maxp3/main/scripts/fix-ssh-firewall.sh | sudo bash
```

### What the script does

1. **Detects the active firewall:** UFW → firewalld → iptables (in order of preference)
2. **Fetches GitHub Actions IP ranges** from `https://api.github.com/meta`
3. **Whitelists each CIDR range** for the SSH port (default: 22, auto-detected from `sshd_config`)
4. **Verifies SSH service** is running and listening
5. **Checks `authorized_keys`** file for valid SSH keys
6. **Tests local SSH loopback** to confirm the daemon responds
7. **Provides Hostinger hPanel instructions** as fallback if no server-level firewall is detected (meaning the block is at the cloud firewall layer)

### Manual fix (Hostinger hPanel)

If the script reports no server firewall:

1. Login to [hPanel](https://hpanel.hostinger.com)
2. Navigate to **VPS → Manage → Firewall**
3. Add an **Inbound** rule:
   - **Port:** `22`/TCP (or your custom SSH port)
   - **Source:** `0.0.0.0/0`
4. Save and apply

## Workflow resilience

The `deploy.yml` workflow has been hardened:

| Step | Behaviour |
|---|---|
| `Debug DNS and SSH Port` | `continue-on-error: true` — records `ssh_reachable` output |
| `Test SSH Connection` | Skipped when `ssh_reachable == false` |
| `Deploy Tarballs to Server` | Skipped when SSH test was skipped |
| `Run Deployment Script on Server` | Skipped when SSH test was skipped |
| `Deployment Summary` | Always runs — prints fix instructions if SSH was unreachable, exits with code 1 |

import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Find latest log files
stdin, stdout, stderr = ssh.exec_command("ls -lt /var/www/backend2/logs/ 2>/dev/null | head -10")
out = stdout.read().decode('utf-8', errors='replace')
print("=== BACKEND LOG FILES ===")
print(out)

# Check all recent log files
stdin, stdout, stderr = ssh.exec_command("for f in /var/www/backend2/logs/*.log; do echo \"=== $f ===\"; grep -a -E 'AI-AUTOREPLY|SILENT-ESCALATION|activityLog|NoneType' \"$f\" 2>/dev/null | tail -5; done")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== LOG ENTRIES ===")
print(out[-3000:] if len(out) > 3000 else out)

# PM2 status and uptime
stdin, stdout, stderr = ssh.exec_command("pm2 list 2>&1")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== PM2 STATUS ===")
print(out)

# Also check if the webhook process is still active and processing
stdin, stdout, stderr = ssh.exec_command("pm2 logs maxp-webhook-worker --lines 20 --nostream 2>&1 | tail -20")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== WEBHOOK WORKER RECENT LOGS ===")
print(out[-3000:] if len(out) > 3000 else out)

ssh.close()

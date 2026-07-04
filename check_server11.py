import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check webhook worker custom logs  
cmds = [
    "ls -la /var/www/backend2/logs/webhook-worker*.log 2>/dev/null",
    "echo '---'",
    "tail -40 /var/www/backend2/logs/webhook-worker-out.log 2>/dev/null",
    "echo '---'",
    "tail -20 /var/www/backend2/logs/webhook-worker-err.log 2>/dev/null",
    "echo '---'",
    # Also check PM2's own webhook logs
    "tail -40 /root/.pm2/logs/maxp-webhook-worker-out.log 2>/dev/null",
    "echo '---'",
    "tail -20 /root/.pm2/logs/maxp-webhook-worker-error.log 2>/dev/null",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    if out: print(out[:4000])

ssh.close()

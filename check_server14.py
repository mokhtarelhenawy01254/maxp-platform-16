import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

cmds = [
    # Check queue stats
    "redis-cli LLEN 'bull:webhook-processing:fb-read' 2>/dev/null; echo '---llen---'",
    "redis-cli ZCARD 'bull:webhook-processing:fb-read:delayed' 2>/dev/null",
    "redis-cli ZCARD 'bull:webhook-processing:fb-read:wait' 2>/dev/null",
    "redis-cli ZCARD 'bull:webhook-processing:fb-read:active' 2>/dev/null",
    "redis-cli ZCARD 'bull:webhook-processing:fb-read:failed' 2>/dev/null",
    "redis-cli ZCARD 'bull:webhook-processing:fb-read:completed' 2>/dev/null",
    "echo '---facebook read queue---'",
    # Check the webhook worker's current log
    "tail -30 /root/.pm2/logs/maxp-webhook-worker-out.log 2>/dev/null",
    "echo '---webhook worker out log---'",
    "tail -30 /root/.pm2/logs/maxp-webhook-worker-error.log 2>/dev/null",
    "echo '---webhook worker err log---'",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    if out: print(out[:3000])

ssh.close()

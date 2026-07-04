import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

cmds = [
    # Check redis-cli (without -c)
    "redis-cli KEYS '*webhook*' 2>/dev/null; redis-cli KEYS '*bull*' 2>/dev/null | head -20",
    "echo '---redis---'",
    # Check if REDIS_URL env uses password
    "grep REDIS_URL /var/www/backend2/.env 2>/dev/null | head -3",
    "echo '---redis url---'",
    # Also check what the backend sees
    "redis-cli PING 2>/dev/null",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    if out:
        print(out[:3000])
    if err:
        print("ERR:", err[:500])

ssh.close()

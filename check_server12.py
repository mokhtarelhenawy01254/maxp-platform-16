import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check Redis for BullMQ queue status and recent jobs
cmds = [
    # Check if Redis has webhook queue data
    "redis-cli -c \"keys *webhook*\" 2>/dev/null | head -10",
    "echo '---redis keys---'",
    # Check the backend main log for any recent AI-AUTOREPLY
    "tail -100 /var/www/backend2/logs/out.log 2>/dev/null | grep -a 'AI-AUTOREPLY' | tail -10",
    "echo '---backend main log---'",
    # Check the err.log for AI-AUTOREPLY matches
    "grep -a 'AI-AUTOREPLY' /var/www/backend2/logs/err.log 2>/dev/null | tail -10",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    if out: print(out[:3000])

ssh.close()

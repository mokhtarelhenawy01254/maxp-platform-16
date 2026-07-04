import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check the deployed silentEscalationService for category
cmd1 = "grep -n 'category' /var/www/backend2/services/silentEscalationService.js 2>/dev/null || echo 'NOT FOUND'"

# Check the deployed Python chat.py for the fix
cmd2 = "grep -n 'or \\[\\]' /var/www/ai-service/src/api/chat.py 2>/dev/null || echo 'NOT FOUND'"

# Check checkpointer.py fix
cmd3 = "grep -n 'or \\[\\]' /var/www/ai-service/src/pipeline/checkpointer.py 2>/dev/null || echo 'NOT FOUND'"

for label, cmd in [("silentEscalationService category", cmd1), ("chat.py or []", cmd2), ("checkpointer.py or []", cmd3)]:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"=== {label} ===")
    print(out.strip())
    print()

ssh.close()

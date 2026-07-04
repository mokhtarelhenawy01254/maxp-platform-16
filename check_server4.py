import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check recent backend logs for AI-AUTOREPLY
cmd = "grep -a -E 'AI-AUTOREPLY|SILENT-ESCALATION|activityLog|ai_reply|sent successfully|Error.*Facebook' /var/www/backend2/logs/err-10.log /var/www/backend2/logs/out-10.log 2>/dev/null | tail -30"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("=== BACKEND LOGS (recent) ===")
print(out[-5000:] if len(out) > 5000 else out)

# Check AI service logs
print("\n=== AI SERVICE OUT LOGS (recent) ===")
stdin, stdout, stderr = ssh.exec_command("grep -a -E 'POST /chat|NoneType|escalat' /root/.pm2/logs/maxp-ai-service-out.log 2>/dev/null | tail -10")
out = stdout.read().decode('utf-8', errors='replace')
print(out[-2000:] if len(out) > 2000 else out)

ssh.close()

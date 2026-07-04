import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Get recent AI service error logs
stdin, stdout, stderr = ssh.exec_command("grep -a -E 'NoneType|Error|Traceback|unhandled|exception' /root/.pm2/logs/maxp-ai-service-error.log 2>/dev/null | tail -20")
out = stdout.read().decode('utf-8', errors='replace')
print("=== AI SERVICE ERROR LOGS ===")
print(out[-3000:] if len(out) > 3000 else out)

# Also check the output log for the chat processing
stdin, stdout, stderr = ssh.exec_command("grep -a -E 'unhandled_exception|escalat' /root/.pm2/logs/maxp-ai-service-out.log 2>/dev/null | tail -10")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== AI SERVICE OUT LOGS (escalation) ===")
print(out[-2000:] if len(out) > 2000 else out)

# Check if pm2 restarted recently
stdin, stdout, stderr = ssh.exec_command("pm2 logs maxp-ai-service --lines 5 --nostream 2>&1 | head -20")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== AI SERVICE RECENT LOGS ===")
print(out[-3000:] if len(out) > 3000 else out)

ssh.close()

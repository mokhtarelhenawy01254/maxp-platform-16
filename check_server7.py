import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check PM2 logs directly
stdin, stdout, stderr = ssh.exec_command("cat /root/.pm2/logs/maxp-webhook-worker-out.log 2>/dev/null | tail -40")
out = stdout.read().decode('utf-8', errors='replace')
print("=== WEBHOOK WORKER OUT LOG ===")
print(out[-4000:] if len(out) > 4000 else out)

# AI service out log via PM2
stdin, stdout, stderr = ssh.exec_command("cat /root/.pm2/logs/maxp-ai-service-out.log 2>/dev/null | tail -40")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== AI SERVICE OUT LOG ===")
print(out[-4000:] if len(out) > 4000 else out)

# Check the err log for the webhook worker  
stdin, stdout, stderr = ssh.exec_command("cat /root/.pm2/logs/maxp-webhook-worker-error.log 2>/dev/null | tail -20")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== WEBHOOK WORKER ERROR LOG ===")
print(out[-2000:] if len(out) > 2000 else out)

ssh.close()

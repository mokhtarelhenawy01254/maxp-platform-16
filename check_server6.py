import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Show raw content of out-10.log
stdin, stdout, stderr = ssh.exec_command("tail -50 /var/www/backend2/logs/out-10.log 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace')
print("=== out-10.log (last 50 lines) ===")
print(out[-5000:] if len(out) > 5000 else out)

# Show AI service recent logs 
stdin, stdout, stderr = ssh.exec_command("tail -30 /root/.pm2/logs/maxp-ai-service-out.log 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace')
print("=== AI SERVICE OUT LOG ===")
print(out[-5000:] if len(out) > 5000 else out)

ssh.close()

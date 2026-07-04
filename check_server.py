import paramiko, sys

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Get recent AI-AUTOREPLY related logs
cmd = """grep -a -E 'AI-AUTOREPLY|SILENT-ESCALATION|Error in Facebook|error.*activityLog|Category.*missing|NoneType|unhandled_exception' /var/www/backend2/logs/err-10.log /var/www/backend2/logs/out-10.log 2>/dev/null | tail -30"""

stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("=== AI-AUTOREPLY / SILENT-ESCALATION LOGS ===")
print(out[-4000:] if len(out) > 4000 else out)
print("=== END ===")
ssh.close()

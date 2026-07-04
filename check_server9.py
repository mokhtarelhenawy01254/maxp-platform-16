import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check the backend2 log for any facebook processing
cmds = [
    "grep -a -c 'AI-AUTOREPLY' /var/www/backend2/logs/out-10.log 2>/dev/null",
    "echo '---'",
    "grep -a 'AI-AUTOREPLY\\|facebook\\|Facebook' /var/www/backend2/logs/out-10.log 2>/dev/null | tail -20",
    "echo '---'",
    "grep -a -c 'AI-AUTOREPLY' /var/www/backend2/logs/out.log 2>/dev/null",
    "echo '---'",
    "grep -a 'AI-AUTOREPLY.*Triggered' /var/www/backend2/logs/out.log 2>/dev/null | tail -5",
    "echo '---'",
    "date",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    print(out[:2000])

ssh.close()

import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

cmds = [
    # Search all log files in backend2
    "grep -r -a -l 'AI-AUTOREPLY\\|Facebook.*message' /var/www/backend2/logs/ 2>/dev/null",
    "echo '---files found---'",
    # Check Nginx access logs for Facebook webhook callbacks
    "grep -a -c 'facebook' /var/log/nginx/access.log 2>/dev/null; echo 'nginx access count'",
    "grep -a 'facebook.*webhook\\|hub.challenge' /var/log/nginx/access.log 2>/dev/null | tail -5",
    "echo '---nginx---'",
    # Check ecosystem config for webhook worker log file config
    "grep -a 'error_file\\|out_file\\|log_file' /var/www/backend2/ecosystem.config.js 2>/dev/null",
    "echo '---ecosystem---'",
    # Check if webhook worker log file exists somewhere else
    "find /root/.pm2 -name '*webhook*' -o -name '*worker*' 2>/dev/null",
]

for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    if out: print(out[:2000])
    if err: print("ERR:", err[:500])

ssh.close()

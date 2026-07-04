import paramiko

HOST = "153.92.223.119"
USER = "root"
PASS = "Mokhtar1234@#"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)

# Check actual file sizes and dates
cmds = [
    "ls -la /root/.pm2/logs/ 2>/dev/null",
    "echo ---",
    "pm2 prettylist 2>/dev/null | python3 -c \"import sys,json;d=json.load(sys.stdin);[print(p['name'],p['pm2_env']['status'],p['pm2_env']['restart_time'],p['pm2_env']['pm_uptime']) for p in d if 'pm2_env' in p]\" 2>/dev/null",
    "echo ---",
    "tail -100 /var/www/backend2/logs/out-10.log 2>/dev/null | grep -c 'WEBHOOK\\|facebook\\|Facebook\\|AI-AUTOREPLY'",
]
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"$ {cmd}")
    print(out[:2000])

ssh.close()

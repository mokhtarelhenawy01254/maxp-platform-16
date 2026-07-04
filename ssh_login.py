import paramiko, sys, json

host = sys.argv[1]
username = sys.argv[2]
password = sys.argv[3]
command = " ".join(sys.argv[4:])

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=username, password=password)
stdin, stdout, stderr = ssh.exec_command(command)
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("STDERR:", err, file=sys.stderr)
ssh.close()

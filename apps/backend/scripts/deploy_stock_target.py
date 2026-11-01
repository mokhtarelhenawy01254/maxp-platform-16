import sys
import paramiko

SERVER_HOST = "153.92.223.119"
SERVER_USER = "root"
SERVER_PASS = "Mokhtar1234@#"

files_to_upload = [
    (
        r"C:\Users\ali wazery\.gemini\antigravity\scratch\maxperformance14\apps\backend\services\stockAndTargetAlertService.js",
        "/var/www/backend2/services/stockAndTargetAlertService.js",
    ),
    (
        r"C:\Users\ali wazery\.gemini\antigravity\scratch\maxperformance14\apps\backend\services\aiCronSchedulerService.js",
        "/var/www/backend2/services/aiCronSchedulerService.js",
    ),
    (
        r"C:\Users\ali wazery\.gemini\antigravity\scratch\maxperformance14\apps\backend\routes\agentAutomationRoutes.js",
        "/var/www/backend2/routes/agentAutomationRoutes.js",
    ),
    (
        r"C:\Users\ali wazery\.gemini\antigravity\scratch\maxperformance14\apps\ai-service\src\tools\repositories\target_repository.py",
        "/var/www/ai-service/src/tools/repositories/target_repository.py",
    ),
]

def main():
    print("Connecting to server...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_HOST, username=SERVER_USER, password=SERVER_PASS, timeout=20, look_for_keys=False, allow_agent=False)
    
    sftp = client.open_sftp()
    for local_path, remote_path in files_to_upload:
        print(f"Uploading {local_path} -> {remote_path}...")
        sftp.put(local_path, remote_path)
    sftp.close()
    print("Files uploaded successfully.")

    print("Reloading PM2 services...")
    stdin, stdout, stderr = client.exec_command("pm2 reload maxp-backend && pm2 reload maxp-ai-service")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("STDOUT:", out)
    if err:
        print("STDERR:", err)

    client.close()
    print("Done!")

if __name__ == "__main__":
    main()

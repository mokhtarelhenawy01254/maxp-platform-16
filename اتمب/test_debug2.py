import subprocess, json, sys

proc = subprocess.run([
    "curl", "-s", "-X", "POST",
    "http://127.0.0.1:3007/api/v1/auth/login",
    "-H", "Content-Type: application/json",
    "-d", '{"email":"swan@h2m.com","password":"0165676135"}'
], capture_output=True, text=True)
token = json.loads(proc.stdout)["data"]["token"]

body = json.dumps({"message": "السلام عليكم", "agentId": "agent_Aj64Ho82vj0Z-UO34XWbdQ"})
proc = subprocess.run([
    "curl", "-s", "-X", "POST",
    "http://127.0.0.1:3007/api/v1/ai-sandbox/chat",
    "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + token,
    "-d", body
], capture_output=True, text=True)

print("STDOUT:", proc.stdout[:1000])
print("STDERR:", proc.stderr[:500])

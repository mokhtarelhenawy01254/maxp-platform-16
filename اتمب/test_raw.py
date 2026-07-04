import subprocess, json

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()

res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

result = sh(
    'curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat '
    '-H "Content-Type: application/json" '
    '-H "Authorization: Bearer ' + token + '" '
    '-d \'{"message":"عايز أشتري تلفون محمول","agentId":"' + AGENT + '"}\''
)

d = json.loads(result)
print(json.dumps(d, indent=2, ensure_ascii=False)[:2000])

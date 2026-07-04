import subprocess, json

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()

# Login
res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

# Test with no sessionId (auto-create)
result = sh(
    'curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat '
    '-H "Content-Type: application/json" '
    '-H "Authorization: Bearer ' + token + '" '
    '-d \'{"message":"عايز أشتري تلفون محمول","agentId":"' + AGENT + '"}\''
)

d = json.loads(result)
print("Success:", d.get("success"))
if not d.get("success"):
    print("Error:", d.get("error"), "Code:", d.get("code"))
else:
    r = d.get("data", {})
    print("Model:", r.get("model"))
    print("Provider:", r.get("provider"))
    print("Latency:", r.get("latencyMs"))
    print("Reply:", (r.get("reply") or "")[:400])
    for t in r.get("toolCalls", []):
        inp = json.dumps(t.get("input"), ensure_ascii=False)
        print(f"  {t.get('name')}: input={inp} status={t.get('status')}")

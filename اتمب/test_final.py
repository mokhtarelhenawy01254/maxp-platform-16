import subprocess, json

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()

res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

tests = [
    "عايز أشتري هدية لمراتي",
    "عايز شنطة",
    "أيه العروض المتاحة؟",
]

for i, msg in enumerate(tests, 1):
    result = sh(
        'curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat '
        '-H "Content-Type: application/json" '
        '-H "Authorization: Bearer ' + token + '" '
        '-d \'{"message":' + json.dumps(msg) + ',"agentId":"' + AGENT + '"}\''
    )
    d = json.loads(result)
    r = d.get("data", {})
    reply = (r.get("reply") or "")[:300]
    tools = r.get("toolCalls", [])
    model = r.get("model", "N/A")
    lat = r.get("latencyMs", 0)
    ok = d.get("success", False)
    print(f"#{i} | PASS" if ok and reply else f"#{i} | FAIL")
    print(f"  U: {msg}")
    print(f"  A: {reply[:150]}")
    print(f"  Model: {model} Lat: {lat}ms Tools: {len(tools)}")
    for t in tools:
        inp = json.dumps(t.get("input", {}), ensure_ascii=False)
        print(f"  Tool: {t.get('name')} args={inp[:120]}")
    print()

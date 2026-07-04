import subprocess, json

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()

res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

tests = [
    "السلام عليكم",
    "عايز أشتري هدية لمراتي",
    "عندها 30 سنة وبتلبس مقاس M",
    "عايز شنطة",
    "أيه العروض المتاحة؟",
    "تكلفة الشحن كام للقاهرة؟",
]

session = None
for i, msg in enumerate(tests, 1):
    if not session:
        # No session - auto-create
        result = sh(
            'curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat '
            '-H "Content-Type: application/json" '
            '-H "Authorization: Bearer ' + token + '" '
            '-d \'{"message":' + json.dumps(msg) + ',"agentId":"' + AGENT + '"}\''
        )
    else:
        result = sh(
            'curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat '
            '-H "Content-Type: application/json" '
            '-H "Authorization: Bearer ' + token + '" '
            '-d \'{"sessionId":"' + session + '","message":' + json.dumps(msg) + ',"agentId":"' + AGENT + '"}\''
        )
    
    d = json.loads(result)
    r = d.get("data", {})
    session = r.get("sessionId", session)
    reply = (r.get("reply") or "")[:300]
    tools = r.get("toolCalls", [])
    model = r.get("model", "N/A")
    success = d.get("success", False)
    status = "PASS" if (success and reply) else "FAIL"
    print(f"{i:2d} | {status} | Model:{model} | Tools:{len(tools)}")
    print(f"     U: {msg}")
    print(f"     A: {reply}")
    if tools:
        for t in tools:
            inp = json.dumps(t.get("input", {}), ensure_ascii=False)
            print(f"     Tool: {t.get('name')} args={inp[:150]}")
    print()

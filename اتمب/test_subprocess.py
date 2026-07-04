import subprocess, json

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

# Login
proc = subprocess.run([
    "curl", "-s", "-X", "POST",
    "http://127.0.0.1:3007/api/v1/auth/login",
    "-H", "Content-Type: application/json",
    "-d", '{"email":"swan@h2m.com","password":"0165676135"}'
], capture_output=True, text=True)
token = json.loads(proc.stdout)["data"]["token"]

def chat(msg):
    body = json.dumps({"message": msg, "agentId": AGENT})
    proc = subprocess.run([
        "curl", "-s", "-X", "POST",
        "http://127.0.0.1:3007/api/v1/ai-sandbox/chat",
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + token,
        "-d", body
    ], capture_output=True, text=True)
    return json.loads(proc.stdout)

tests = [
    "السلام عليكم",
    "عايز أشتري هدية لمراتي",
    "عايز شنطة",
    "أيه العروض المتاحة؟",
]

for i, msg in enumerate(tests, 1):
    d = chat(msg)
    r = d.get("data", {})
    reply = (r.get("reply") or "")[:300]
    tools = r.get("toolCalls", [])
    model = r.get("model", "N/A")
    lat = r.get("latencyMs", 0)
    ok = d.get("success", False)
    status = "PASS" if (ok and reply) else "FAIL"
    print(f"#{i} | {status}")
    print(f"  User: {msg}")
    print(f"  Yasmin: {reply}")
    print(f"  Model: {model} Lat: {lat}ms Tools: {len(tools)}")
    for t in tools:
        inp = json.dumps(t.get("input", {}), ensure_ascii=False)
        print(f"  Tool: {t.get('name')} args={inp[:120]}")
    print()

import subprocess, json, sys, time

def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()

res = sh("""curl -s -X POST http://127.0.0.1:3007/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"swan@h2m.com","password":"0165676135"}'""")
token = json.loads(res)["data"]["token"]

AGENT = "agent_Aj64Ho82vj0Z-UO34XWbdQ"

s = sh('curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/sessions -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" -d \'{"agentId":"' + AGENT + '","title":"Context Test 2026-07-03"}\'')
session = json.loads(s)["session"]["id"]
print("Session:", session)

def chat(msg):
    msg_e = json.dumps(msg)
    res = sh('curl -s -X POST http://127.0.0.1:3007/api/v1/ai-sandbox/chat -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" -d \'{"sessionId":"' + session + '","message":' + msg_e + ',"agentId":"' + AGENT + '"}\'')
    d = json.loads(res)
    r = d.get("data", d)
    reply = r.get("reply", "")
    tools = r.get("toolCalls", [])
    model = r.get("model", "")
    latency = r.get("latencyMs", 0)
    return reply, tools, model, latency

conversation = [
    ("1", "السلام عليكم ياسمين"),
    ("2", "عايز أشتري هدية لمراتي"),
    ("3", "عندها 30 سنة وبتلبس مقاس M وبتفضل الألوان الفاتحة"),
    ("4", "لا مش فستان أنا كنت بفكر في شنطة أو حاجة بسيطة"),
    ("5", "طيب وإيه أرخص حاجة في الشحن"),
    ("6", "طب لو جبت حاجتين في طلب واحد هيفرق في السعر"),
    ("7", "أنا ساكن في القاهرة الجديدة توصلوا هناك"),
    ("8", "خلاص أنا عايز أطلب الشنطة اللي حكيتلي عنها الأولانية"),
]

print(f"\n{'#':>2} | {'Message':<60} | {'Tools':<4} | {'Lat':<8} | Model")
print("=" * 100)
for num, msg in conversation:
    reply, tools, model, lat = chat(msg)
    tool_names = ",".join([t.get("toolName","?")[:10] for t in tools])
    brief = reply[:60].replace("\n", " ")
    print(f"{num:>2} | {msg:<60} | {len(tools):<4} | {lat:<8} | {model or 'N/A'}")
    print(f"   | Reply: {brief}...")
    if tools:
        print(f"   | Tools: {tool_names}")
    print()

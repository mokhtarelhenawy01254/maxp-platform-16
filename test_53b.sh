grep -r "jwt_secret" /var/www/ai-service/src/config/ 2>&1 | head -5
echo "--- config settings ---"
cat /var/www/ai-service/src/config.py 2>&1 | head -50 || find /var/www/ai-service/src -name "config*" -exec head -50 {} \;
echo "--- test JWT ---"
cd /var/www/ai-service
./.venv/bin/python - <<'PYEOF'
import jwt
import time
import json
import urllib.request

# Use the same secret the AI service uses
secret = "f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97"
payload = {
    "sub": "test_user",
    "user_id": "test_user",
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600,
}
token = jwt.encode(payload, secret, algorithm="HS256")
print(f"Token created: {token[:50]}...")

with open("/tmp/phones.txt") as f:
    lines = [l.strip() for l in f if l.strip()]

items = [{"companyId": "cmt25v7eb0008juhbath14ovl", "phoneNumber": p} for p in lines]
body = {"companyId": "cmt25v7eb0008juhbath14ovl", "items": items}
print(f"Submitting {len(items)} numbers via direct HTTP to the AI service...")

req = urllib.request.Request(
    "http://localhost:8000/admin/whatsapp-ai-ignore-list/bulk",
    data=json.dumps(body).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        print(f"HTTP {resp.status}")
        print(f"inserted={result.get('inserted')}, skipped={result.get('skipped')}")
        if result.get('entries'):
            print(f"first 3 inserted: {[e.get('phoneNumber') for e in result['entries'][:3]]}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} {e.reason}")
    print(e.read().decode("utf-8"))
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
PYEOF

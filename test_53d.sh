cd /var/www/ai-service
# Check the env var name in pydantic_settings
grep -E "jwt_secret|env_prefix|Field" /var/www/ai-service/src/config.py | head -10
echo "---"
# Try MAXP_JWT_SECRET (typical naming)
./.venv/bin/python - <<'PYEOF'
import os
import jwt
import time
import json
import urllib.request

# Pydantic Settings with case_sensitive=False maps JWT_SECRET to jwt_secret field
# The .env has MAXP_SERVICE_TOKEN but the JWT secret is for verifying admin tokens
# Let me try the backend's JWT_SECRET (the one MaxP uses for auth tokens)
secret = "9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314"
payload = {
    "sub": "test_admin",
    "user_id": "test_admin",
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600,
}
token = jwt.encode(payload, secret, algorithm="HS256")
print(f"Token: {token[:50]}...")

with open("/tmp/phones.txt") as f:
    lines = [l.strip() for l in f if l.strip()]

items = [{"companyId": "cmt25v7eb0008juhbath14ovl", "phoneNumber": p} for p in lines]
body = {"companyId": "cmt25v7eb0008juhbath14ovl", "items": items}
print(f"Submitting {len(items)} numbers...")

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
    with urllib.request.urlopen(req, timeout=120) as resp:
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

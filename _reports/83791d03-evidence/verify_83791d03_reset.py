import json, os, urllib.request, urllib.error

BASE = os.environ.get("MAXP_QA_BASE", "http://127.0.0.1:3104")
TOK = None
TID = None


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if TOK:
        req.add_header("Authorization", "Bearer " + TOK)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:300]


st, login = api("POST", "/api/v1/auth/login", {"email": os.environ.get("MAXP_QA_EMAIL", "qa@maxp.local"), "password": os.environ.get("MAXP_QA_PASSWORD", "")})
d = login.get("data") or {}
TOK = d.get("token")
st, r = api("GET", "/api/v1/manufacturing/sample-orders?limit=100")
samples = r.get("items") or (r.get("data") or {}).get("items") or (r.get("data") or {}).get("samples") or []
sample = next((s for s in samples if s.get("sampleNumber") == os.environ.get("MAXP_QA_SAMPLE", "SMP-2026-00007")), None)
if not sample:
    print("sample not found")
    raise SystemExit(2)
TID = sample["id"]
st, r = api("GET", f"/api/v1/manufacturing/sample-orders/{TID}/components")
comps = (r.get("data") or {}).get("components") or []
removed = []
failed = []
for c in comps:
    if c.get("name") == "مكوّن واجهة 8379":
        st2, r2 = api("DELETE", f"/api/v1/manufacturing/sample-orders/{TID}/components/{c['id']}")
        removed.append({"id": c["id"], "http": st2, "totals": (r2.get("data") or {}) if isinstance(r2, dict) else None})
        if st2 not in (200, 201, 204):
            failed.append({"id": c["id"], "http": st2, "error": str(r2)[:200]})
print(json.dumps({"sample": TID, "removed": removed, "failed": failed}, ensure_ascii=False, indent=1))
if failed:
    raise SystemExit(2)

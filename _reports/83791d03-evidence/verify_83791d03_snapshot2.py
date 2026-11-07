import json, os, subprocess, urllib.request, urllib.error

BASE = os.environ.get("MAXP_QA_BASE", "http://127.0.0.1:3104")
PSQL = r"C:/Users/ali wazery/maxp-qa/pg/pgsql/bin/psql.exe"
PGPASS = open(os.environ.get("MAXP_QA_PGPASS_FILE", r"C:/Users/ali wazery/maxp-qa/pg/PGPASS.txt"), encoding="utf-8").read().strip()
ENV = {**os.environ, "PGPASSWORD": PGPASS}
SAMPLE = "SMP-2026-00007"


def sql(q):
    p = subprocess.run([PSQL, "-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-d", "maxp_qa", "-Atc", q],
                       capture_output=True, env=ENV)
    return p.stdout.decode("utf-8", "replace").strip(), p.stderr.decode("utf-8", "replace").strip()


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode("utf-8", "replace")[:300]}


st, login = api("POST", "/api/v1/auth/login", {"email": "qa@maxp.local", "password": "ecMk3p1ICv2bg-Et"})
tok = (login.get("data") or {}).get("token")
st, r = api("GET", "/api/v1/manufacturing/sample-orders?limit=100", token=tok)
items = r.get("items") or []
sample = next((s for s in items if s.get("sampleNumber") == SAMPLE), None)
sid = sample["id"]
st, comps = api("GET", f"/api/v1/manufacturing/sample-orders/{sid}/components", token=tok)
product_comp = next((c for c in (comps.get("data") or {}).get("components", []) if c.get("productId")), None)
old_price = product_comp["unitPrice"] if product_comp else None
pid = product_comp["productId"] if product_comp else None
orig_cost, err = sql(f"select cost from products where id='{pid}'") if pid else (None, "")
sql(f"update products set cost=999 where id='{pid}'") if pid else None
st, comps2 = api("GET", f"/api/v1/manufacturing/sample-orders/{sid}/components", token=tok)
after_comp = next((c for c in (comps2.get("data") or {}).get("components", []) if c.get("productId") == pid), None)
after_price = after_comp["unitPrice"] if after_comp else None
sql(f"update products set cost={orig_cost} where id='{pid}'") if pid else None
res = {
    "productId": pid,
    "catalog_cost_before": orig_cost,
    "component_unitPrice_before": old_price,
    "component_unitPrice_after_catalog_change": after_price,
    "price_unchanged": str(old_price) == str(after_price) and old_price is not None,
    "sample_reported_total": (comps2.get("data") or {}).get("sampleTotalCost"),
}
open(r"C:/Users/ali wazery/maxp-qa/task-runner/evidence/83791d03_price_snapshot.json", "w", encoding="utf-8").write(
    json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False, indent=1))
raise SystemExit(0 if res["price_unchanged"] else 2)

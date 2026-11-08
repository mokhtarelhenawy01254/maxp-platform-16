import json, os, subprocess, urllib.request, urllib.error

BASE = os.environ.get("MAXP_QA_BASE", "http://127.0.0.1:3104")
PSQL = os.environ.get("MAXP_QA_PSQL", r"C:/Users/ali wazery/maxp-qa/pg/pgsql/bin/psql.exe")
PGHOST = os.environ.get("MAXP_QA_PGHOST", "127.0.0.1")
PGPORT = os.environ.get("MAXP_QA_PGPORT", "5433")
PGUSER = os.environ.get("MAXP_QA_PGUSER", "postgres")
PGDB = os.environ.get("MAXP_QA_DB", "maxp_qa")
PGPASS = open(os.environ.get("MAXP_QA_PGPASS_FILE", r"C:/Users/ali wazery/maxp-qa/pg/PGPASS.txt"), encoding="utf-8").read().strip()
ENV = {**os.environ, "PGPASSWORD": PGPASS}
SAMPLE = os.environ.get("MAXP_QA_SAMPLE", "SMP-2026-00007")
OUT = os.environ.get("MAXP_EVIDENCE_OUT", "83791d03_price_snapshot.json")


def sql(q):
    p = subprocess.run([PSQL, "-h", PGHOST, "-p", PGPORT, "-U", PGUSER, "-d", PGDB, "-Atc", q],
                       capture_output=True, env=ENV)
    return p.stdout.decode("utf-8", "replace").strip()


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


st, login = api("POST", "/api/v1/auth/login", {"email": os.environ.get("MAXP_QA_EMAIL", "qa@maxp.local"), "password": os.environ.get("MAXP_QA_PASSWORD", "")})
tok = (login.get("data") or {}).get("token")
if not tok:
    raise SystemExit("login failed: " + json.dumps(login, ensure_ascii=False)[:300])
st, r = api("GET", "/api/v1/manufacturing/sample-orders?limit=100", token=tok)
items = r.get("items") or []
sample = next((s for s in items if s.get("sampleNumber") == SAMPLE), None)
if not sample:
    raise SystemExit(f"sample {SAMPLE} not found")
sid = sample["id"]
st, comps = api("GET", f"/api/v1/manufacturing/sample-orders/{sid}/components", token=tok)
product_comp = next((c for c in (comps.get("data") or {}).get("components", []) if c.get("productId")), None)
if not product_comp:
    raise SystemExit("no product-linked component to test price snapshot")
old_price = product_comp["unitPrice"]
pid = product_comp["productId"]
orig_cost = sql(f"select cost from products where id='{pid}'")
res = {"productId": pid, "catalog_cost_before": orig_cost, "component_unitPrice_before": old_price}
try:
    sql(f"update products set cost=999 where id='{pid}'")
    st, comps2 = api("GET", f"/api/v1/manufacturing/sample-orders/{sid}/components", token=tok)
    after_comp = next((c for c in (comps2.get("data") or {}).get("components", []) if c.get("productId") == pid), None)
    res["component_unitPrice_after_catalog_change"] = after_comp["unitPrice"] if after_comp else None
    res["sample_reported_total"] = (comps2.get("data") or {}).get("sampleTotalCost")
    res["price_unchanged"] = str(old_price) == str(res["component_unitPrice_after_catalog_change"]) and old_price is not None
finally:
    # مضمون: نرجّع سعر الكتالوج الأصلي حتى لو أي خطوة فشلت
    sql(f"update products set cost={orig_cost} where id='{pid}'")

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
raise SystemExit(0 if res.get("price_unchanged") else 2)

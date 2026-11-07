import json, os, subprocess, time, urllib.error, urllib.request, pathlib

BASE = os.environ.get("MAXP_QA_BASE", "http://127.0.0.1:3104")
PSQL = r"C:/Users/ali wazery/maxp-qa/pg/pgsql/bin/psql.exe"
PGPASS = open(os.environ.get("MAXP_QA_PGPASS_FILE", r"C:/Users/ali wazery/maxp-qa/pg/PGPASS.txt"), encoding="utf-8").read().strip()
ENV = {**os.environ, "PGPASSWORD": PGPASS}
OUT = pathlib.Path(r"C:/Users/ali wazery/maxp-qa/task-runner/evidence")


def api(method, path, body=None, token=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:500]


def sql(q):
    p = subprocess.run([PSQL, "-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-d", "maxp_qa", "-Atc", q],
                       capture_output=True, env=ENV)
    return p.stdout.decode("utf-8", "replace").strip(), p.stderr.decode("utf-8", "replace").strip()


results = {"steps": [], "ok": False}


def step(name, got, want_status, check=None, extra=None):
    ok = got[0] == want_status and (check(got[1]) if check else True)
    results["steps"].append({
        "name": name, "http": got[0], "expected_http": want_status, "ok": ok,
        "body": got[1] if isinstance(got[1], dict) else str(got[1])[:300],
        "extra": extra,
    })
    return got[1] if isinstance(got[1], dict) else {}


st, login = api("POST", "/api/v1/auth/login", {"email": "qa@maxp.local", "password": "ecMk3p1ICv2bg-Et"})
d = login.get("data") or login
token = d.get("token") or login.get("token")
user = d.get("user") or d.get("userData") or {}
company = user.get("companyId") or user.get("company", {}).get("id")
results["login"] = {"http": st, "company": company, "token_len": len(token or "")}
if st != 200 or not token:
    results["error"] = "login failed"
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "83791d03_api.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=1)[:2000])
    raise SystemExit(2)

# sanity: manufacturing access
st, settings = api("GET", "/api/v1/manufacturing/settings", token=token)
results["manufacturing_settings_http"] = st
if st != 200:
    results["error"] = "manufacturing access blocked"
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "83791d03_api.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=1)[:2000])
    raise SystemExit(2)

# create sample with fee 30
st, r = api("POST", "/api/v1/manufacturing/sample-orders", {
    "productName": "عينة اختبار 83791d03 — إجمالي فوري",
    "plannedQuantity": 1,
    "fee": 30,
}, token=token)
sample = (r.get("data") or {})
sample_id = sample.get("id")
step("create sample fee=30", (st, r), 201, lambda x: bool(x.get("success") and (x.get("data") or {}).get("id")))
results["sample_id"] = sample_id
results["sample_number"] = sample.get("sampleNumber")
if not sample_id:
    results["error"] = "sample not created"
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "83791d03_api.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=1)[:2000])
    raise SystemExit(2)

# 1) add component 2 * 50 = 100 -> sample 130
st, r1 = api("POST", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", {
    "name": "قماش ميلتون — تجربة", "quantity": 2, "unit": "متر", "unitPrice": 50,
}, token=token)
c1 = (r1.get("data") or {})
step("add comp 2x50 -> componentsTotal=100 sampleTotalCost=130", (st, r1), 201,
     lambda x: (x.get("data") or {}).get("componentsTotal") == 100
     and (x.get("data") or {}).get("sampleTotalCost") == 130
     and (x.get("data") or {}).get("count") == 1
     and len((x.get("data") or {}).get("components") or []) == 1)
comp1 = c1.get("component") or {}

# 2) duplicate by name (trim + spaces) -> 409
st, r2 = api("POST", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", {
    "name": "  قماش   ميلتون — تجربة ", "quantity": 5, "unitPrice": 50,
}, token=token)
step("duplicate name -> 409", (st, r2), 409, lambda x: "مضاف بالفعل" in str(x.get("message") or ""))

# 3) add second component 1 * 20 -> totals 120 / 150
st, r3 = api("POST", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", {
    "name": "خيط حياكة — تجربة", "quantity": 1, "unitPrice": 20,
}, token=token)
c3 = (r3.get("data") or {})
step("add comp 1x20 -> componentsTotal=120 sampleTotalCost=150", (st, r3), 201,
     lambda x: (x.get("data") or {}).get("componentsTotal") == 120
     and (x.get("data") or {}).get("sampleTotalCost") == 150
     and (x.get("data") or {}).get("count") == 2)
comp2 = c3.get("component") or {}

# 4) update second to duplicate name -> 409 and unchanged
if comp2.get("id"):
    st, r4 = api("PATCH", f"/api/v1/manufacturing/sample-orders/{sample_id}/components/{comp2['id']}", {
        "name": "قماش ميلتون — تجربة",
    }, token=token)
    step("update to duplicate name -> 409", (st, r4), 409, lambda x: "مضاف بالفعل" in str(x.get("message") or ""))
else:
    step("update to duplicate name -> 409", (0, {"error": "no comp2 id"}), 409)

# 5) update first qty to 3 -> 150 + 20 = 170 / 200
st, r5 = api("PATCH", f"/api/v1/manufacturing/sample-orders/{sample_id}/components/{comp1.get('id')}", {
    "quantity": 3,
}, token=token)
step("update qty 3 -> componentsTotal=170 sampleTotalCost=200", (st, r5), 200,
     lambda x: (x.get("data") or {}).get("componentsTotal") == 170
     and (x.get("data") or {}).get("sampleTotalCost") == 200)

# 6) delete second -> 150 / 180
if comp2.get("id"):
    st, r6 = api("DELETE", f"/api/v1/manufacturing/sample-orders/{sample_id}/components/{comp2['id']}", token=token)
    step("delete comp -> componentsTotal=150 sampleTotalCost=180", (st, r6), 200,
         lambda x: (x.get("data") or {}).get("componentsTotal") == 150
         and (x.get("data") or {}).get("sampleTotalCost") == 180
         and (x.get("data") or {}).get("count") == 1)

# 7) list parity
st, r7 = api("GET", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", token=token)
step("list parity componentsTotal=150 sampleTotalCost=180", (st, r7), 200,
     lambda x: (x.get("data") or {}).get("componentsTotal") == 150
     and (x.get("data") or {}).get("sampleTotalCost") == 180
     and (x.get("data") or {}).get("count") == 1)

# 8) productId duplicate using a real product from this company
pid, err = sql(f"select id from products where \"companyId\"='{company}' limit 1")
if pid:
    st, r8a = api("POST", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", {
        "productId": pid, "quantity": 1, "unitPrice": 10,
    }, token=token)
    step("add product-linked comp", (st, r8a), 201, lambda x: bool((x.get("data") or {}).get("component")))
    st, r8b = api("POST", f"/api/v1/manufacturing/sample-orders/{sample_id}/components", {
        "productId": pid, "quantity": 2, "unitPrice": 10,
    }, token=token)
    step("duplicate productId -> 409", (st, r8b), 409, lambda x: "مضاف بالفعل" in str(x.get("message") or ""))
else:
    results["product_id_probe_error"] = err

# 9) direct DB check of rows
count, dberr = sql(f"select count(*) from sample_order_components where \"sampleOrderId\"='{sample_id}'")
results["db_row_count"] = count
results["db_error"] = dberr
results["sample_total_db"] = sql(
    f"select \"sampleNumber\" from sample_orders where id='{sample_id}'")[0]

results["ok"] = all(s["ok"] for s in results["steps"])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "83791d03_api.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({k: v for k, v in results.items() if k != "steps"}, ensure_ascii=False, indent=1))
for s in results["steps"]:
    print(("PASS " if s["ok"] else "FAIL ") + s["name"] + f' (HTTP {s["http"]})')
raise SystemExit(0 if results["ok"] else 2)

import json, os, subprocess, threading, urllib.error, urllib.request

BASE = os.environ.get("MAXP_QA_BASE", "http://127.0.0.1:3104")
PSQL = r"C:/Users/ali wazery/maxp-qa/pg/pgsql/bin/psql.exe"
PGPASS = open(os.environ.get("MAXP_QA_PGPASS_FILE", r"C:/Users/ali wazery/maxp-qa/pg/PGPASS.txt"), encoding="utf-8").read().strip()
ENV = {**os.environ, "PGPASSWORD": PGPASS}


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:300]


def sql(q):
    p = subprocess.run([PSQL, "-h", "127.0.0.1", "-p", "5433", "-U", "postgres", "-d", "maxp_qa", "-Atc", q],
                       capture_output=True, env=ENV)
    return p.stdout.decode("utf-8", "replace").strip()


st, login = api("POST", "/api/v1/auth/login", {"email": "qa@maxp.local", "password": "ecMk3p1ICv2bg-Et"})
tok = (login.get("data") or {}).get("token")
st, r = api("POST", "/api/v1/manufacturing/sample-orders", {"productName": "عينة سباق 83791d03", "fee": 0}, token=tok)
sid = (r.get("data") or {}).get("id")

N = 5
barrier = threading.Barrier(N)
results = []
lock = threading.Lock()


def worker(i):
    barrier.wait()
    st, body = api("POST", f"/api/v1/manufacturing/sample-orders/{sid}/components", {
        "name": "مكوّن سباق", "quantity": 1, "unitPrice": 50,
    }, token=tok)
    with lock:
        results.append({"i": i, "http": st, "body": body})


threads = [threading.Thread(target=worker, args=(i,)) for i in range(N)]
for t in threads:
    t.start()
for t in threads:
    t.join()

count = sql(f"select count(*) from sample_order_components where \"sampleOrderId\"='{sid}'")
ok_count = sum(1 for x in results if x["http"] == 201)
conflict = sum(1 for x in results if x["http"] == 409)
winner = next((x["body"] for x in results if x["http"] == 201), {})
comp_id = ((winner or {}).get("data") or {}).get("component", {}).get("id")

# --- سباق تعديل: quantity=2 و unitPrice=100 في نفس اللحظة ---
edit_results = []
ebarrier = threading.Barrier(2)


def editor(payload):
    ebarrier.wait()
    st, body = api("PATCH", f"/api/v1/manufacturing/sample-orders/{sid}/components/{comp_id}", payload, token=tok)
    with lock:
        edit_results.append({"http": st, "payload": payload, "body": body})


e1 = threading.Thread(target=editor, args=({"quantity": 2},))
e2 = threading.Thread(target=editor, args=({"unitPrice": 100},))
e1.start(); e2.start(); e1.join(); e2.join()

got_st, got = api("GET", f"/api/v1/manufacturing/sample-orders/{sid}/components", token=tok)
final = next((c for c in (got.get("data") or {}).get("components", []) if c["id"] == comp_id), {})
db_row = sql(f"select quantity || '|' || \"unitPrice\" || '|' || \"totalCost\" from sample_order_components where id='{comp_id}'")
try:
    db_q, db_p, db_t = [float(x) for x in db_row.split("|")]
except Exception:
    db_q = db_p = db_t = None

res = {
    "sample_id": sid,
    "concurrent_adds": N,
    "created": ok_count,
    "conflicts": conflict,
    "db_rows_after_add": count,
    "add_race_safe": ok_count == 1 and conflict == N - 1 and count == "1",
    "concurrent_edits": [{"http": x["http"], "payload": x["payload"]} for x in edit_results],
    "final_component": {"quantity": final.get("quantity"), "unitPrice": final.get("unitPrice"), "totalCost": final.get("totalCost")},
    "db_row": db_row,
    "edit_race_safe": db_q == 2.0 and db_p == 100.0 and db_t == 200.0
    and str(final.get("quantity")) in ("2", "2.0")
    and str(final.get("unitPrice")) in ("100", "100.0")
    and str(final.get("totalCost")) in ("200", "200.0"),
}
res["race_safe"] = res["add_race_safe"] and res["edit_race_safe"]
open(r"C:/Users/ali wazery/maxp-qa/task-runner/evidence/83791d03_concurrency.json", "w", encoding="utf-8").write(
    json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False, indent=1))
raise SystemExit(0 if res["race_safe"] else 2)

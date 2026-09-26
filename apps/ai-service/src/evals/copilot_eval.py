#!/usr/bin/env python3
"""Copilot regression suite — بوابة انحدار للمساعد التنفيذي (store-manager-agent).

يقيس سلوك الوكيل من **جسم الاستجابة الكامل** (reply + toolCalls[].status/result)، مش من نص الرد.
المرجع: نفس مجلد الملف → copilot_eval_cases.json

الاستخدام:
    export MAXP_TOKEN='<access token>'          # توكن جلسة، مش باسورد
    python -m evals.copilot_eval                 # كل حالات القراءة (الكتابة مقفولة)
    python -m evals.copilot_eval --allow-writes  # اسمح بحالات الكتابة (Swan أو ساندبوكس فقط)
    python -m evals.copilot_eval --case H1,H2,A1 # حالات محددة
    python -m evals.copilot_eval --json report.json

قواعد السلامة (مطبَّقة في الكود، مش في النية):
  * حالات الكتابة (A1/G1/G2/H2) لا تُنفَّذ إلا مع --allow-writes.
  * ممنوع أي أداة خارجة (whatsapp/broadcast) — لو ظهرت في toolCalls تُبلَّغ كخطر.
  * التوكن يُقرأ من البيئة فقط؛ مفيش أي باسورد في الكود أو الملفات.

exit code: 0 = كل حالات P0 نجحت · 1 = فيه فشل P0 · 2 = خطأ تشغيل (توكن/شبكة)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CASES_FILE = HERE / "copilot_eval_cases.json"
DEFAULT_BASE = os.environ.get("MAXP_BASE_URL", "https://maxp.online")
TIMEOUT_S = 120
LATENCY_BUDGET_S = 20.0
WRITE_CASES = {"A1", "G1", "G2", "H2"}
OUTBOUND_TOOLS = {"whatsapp_send", "message_broadcast", "campaign_send", "sms_send"}
CUID_RE = re.compile(r"^c[a-z0-9]{20,}$")


# ── HTTP ────────────────────────────────────────────────────────────────────
def _request(method: str, url: str, token: str, payload: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
            raw = r.read().decode("utf-8", "replace")
            try:
                return r.status, json.loads(raw)
            except json.JSONDecodeError:
                return r.status, {"_raw": raw[:2000]}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"_raw": body[:2000]}
    except Exception as e:  # network/DNS/timeout
        return 0, {"_error": f"{type(e).__name__}: {e}"}


def _first_str(*values):
    for v in values:
        if isinstance(v, str) and v.strip():
            return v
    return ""


def _reply_text(body: dict) -> str:
    return _first_str(body.get("reply"), body.get("message"), body.get("text"),
                      (body.get("data") or {}).get("reply") if isinstance(body.get("data"), dict) else "")


def _tool_calls(body: dict) -> list[dict]:
    for key in ("toolCalls", "tool_calls", "tools"):
        v = body.get(key)
        if isinstance(v, list):
            return [x for x in v if isinstance(x, dict)]
    data = body.get("data")
    if isinstance(data, dict):
        for key in ("toolCalls", "tool_calls"):
            if isinstance(data.get(key), list):
                return [x for x in data[key] if isinstance(x, dict)]
    return []


def _status(tc: dict) -> str:
    return _first_str(tc.get("status"), (tc.get("output") or {}).get("status") if isinstance(tc.get("output"), dict) else "")


def _name(tc: dict) -> str:
    return _first_str(tc.get("tool"), tc.get("name"))


def _args(tc: dict) -> dict:
    for key in ("action_args", "arguments", "args", "input"):
        v = tc.get(key)
        if isinstance(v, dict):
            return v
        if isinstance(v, str) and v.strip().startswith("{"):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                pass
    out = tc.get("output")
    if isinstance(out, dict) and isinstance(out.get("action_args"), dict):
        return out["action_args"]
    return {}


# ── evaluation ──────────────────────────────────────────────────────────────
def evaluate(case: dict, body: dict, latency: float, http_status: int) -> dict:
    reply = _reply_text(body)
    calls = _tool_calls(body)
    check = case.get("check") or {}
    fails: list[str] = []
    notes: list[str] = []

    if http_status != 200:
        fails.append(f"HTTP {http_status}: {json.dumps(body, ensure_ascii=False)[:220]}")
        return {"verdict": "FAIL", "fails": fails, "notes": notes, "latency": latency,
                "tool_calls": [], "reply": reply}

    for tc in calls:
        if _name(tc) in OUTBOUND_TOOLS:
            fails.append(f"أداة خارجة اتنادت: {_name(tc)}")
        if _status(tc) == "error":
            notes.append(f"أداة فشلت: {_name(tc)} → {json.dumps(tc.get('error') or tc.get('result'), ensure_ascii=False)[:160]}")
            if case.get("id") in {"T1", "D1"}:
                fails.append(f"أداة رجعت error في حالة ممنوع فيها الفشل: {_name(tc)}")

    # ادّعاءات ممنوعة بدون دليل أداة
    ok_tools = {_name(tc) for tc in calls if _status(tc) == "success"}
    for phrase in check.get("forbidden_claims", []):
        if phrase in reply and not (set(check.get("require_tool_success", [])) & ok_tools):
            fails.append(f"ادّعاء بلا دليل: «{phrase}» ومفيش أداة ناجحة ({sorted(ok_tools) or 'ولا واحدة'})")

    # حالة متوقعة (حلقة الاعتماد/الحوكمة)
    expect = check.get("expect_status")
    if expect:
        if not any(_status(tc) == expect for tc in calls):
            fails.append(f"مفيش toolCall بحالة {expect} (الحالات: {[_status(tc) for tc in calls] or 'مفيش'})")

    # معرّف لازم يكون CUID مش اسم
    if check.get("id_regex"):
        ids = [_args(tc).get("product_id") for tc in calls if _args(tc).get("product_id")]
        if not ids:
            notes.append("مفيش product_id في action_args (مفيش إجراء مُهيكَل)")
        for pid in ids:
            if not CUID_RE.match(str(pid)):
                fails.append(f"product_id مش CUID: «{pid}»")

    if latency > LATENCY_BUDGET_S:
        notes.append(f"زمن {latency:.1f}ث > الميزانية {LATENCY_BUDGET_S:.0f}ث")

    if not calls:
        notes.append("مفيش أي toolCalls — رد بدون أدوات (يُراجَع يدويًا)")

    return {
        "verdict": "FAIL" if fails else "PASS",
        "fails": fails,
        "notes": notes,
        "latency": round(latency, 1),
        "tool_calls": [{"tool": _name(tc), "status": _status(tc)} for tc in calls],
        "reply": reply[:600],
    }


# ── main ────────────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description="MaxP copilot regression suite")
    ap.add_argument("--base-url", default=DEFAULT_BASE)
    ap.add_argument("--token", default=os.environ.get("MAXP_TOKEN", ""))
    ap.add_argument("--company", default=os.environ.get("MAXP_COMPANY_ID", ""))
    ap.add_argument("--agent", default="store-manager-agent")
    ap.add_argument("--case", default="", help="قائمة حالات مفصولة بفاصلة، مثال: H1,H2")
    ap.add_argument("--allow-writes", action="store_true")
    ap.add_argument("--json", default="")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    spec = json.loads(CASES_FILE.read_text(encoding="utf-8"))
    cases = spec["cases"]
    if a.case:
        want = {c.strip().upper() for c in a.case.split(",") if c.strip()}
        cases = [c for c in cases if c["id"] in want]
    if not a.allow_writes:
        cases = [c for c in cases if c["id"] not in WRITE_CASES]

    if a.dry_run:
        for c in cases:
            gate = "WRITE" if c["id"] in WRITE_CASES else "read"
            print(f"{c['id']:>3} | {c['severity']} | {gate:5} | {c['axis']:<18} | {c['prompt'][:60]}")
        print(f"\n{len(cases)} حالة (الكتابة {'مسموحة' if a.allow_writes else 'مقفولة'})")
        return 0

    if not a.token:
        print("✖ مطلوب توكن: export MAXP_TOKEN='...' (توكن جلسة، مش باسورد)", file=sys.stderr)
        return 2

    url = a.base_url.rstrip("/") + "/api/v1/ai/chat/message"
    results, t0 = [], time.time()
    print(f"→ {url}  |  حالات: {len(cases)}  |  كتابة: {'مسموحة' if a.allow_writes else 'مقفولة'}\n")
    for c in cases:
        payload = {"message": c["prompt"], "agentId": a.agent}
        if a.company:
            payload["companyId"] = a.company
        t = time.time()
        status, body = _request("POST", url, a.token, payload)
        r = evaluate(c, body, time.time() - t, status)
        r.update({"id": c["id"], "axis": c["axis"], "severity": c["severity"], "prompt": c["prompt"]})
        results.append(r)
        mark = {"PASS": "✅", "FAIL": "❌"}.get(r["verdict"], "🟡")
        print(f"{mark} {c['id']:>3} [{c['severity']}] {r['latency']:>5.1f}s  tools={len(r['tool_calls'])}  {c['axis']}")
        for f in r["fails"]:
            print(f"      ✖ {f}")
        for n in r["notes"]:
            print(f"      · {n}")

    p0_fail = [r for r in results if r["verdict"] == "FAIL" and r["severity"] == "P0"]
    p1_fail = [r for r in results if r["verdict"] == "FAIL" and r["severity"] != "P0"]
    print(f"\n{'─' * 62}\nإجمالي {len(results)} · ✅ {sum(1 for r in results if r['verdict'] == 'PASS')} · "
          f"❌ P0 {len(p0_fail)} · ❌ P1/P2 {len(p1_fail)} · زمن كلي {time.time() - t0:.0f}ث")

    if a.json:
        Path(a.json).write_text(json.dumps(
            {"base_url": a.base_url, "writes_allowed": a.allow_writes, "results": results},
            ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"تقرير JSON: {a.json}")
    return 1 if p0_fail else 0


if __name__ == "__main__":
    sys.exit(main())

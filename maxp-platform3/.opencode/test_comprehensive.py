"""Comprehensive test of ياسمين agent — context, skills, tools, self-correction, quality."""
import httpx, json, sys, time

BASE = "http://127.0.0.1:8000"
AGENT_ID = "agent_Aj64Ho82vj0Z-UO34XWbdQ"
COMPANY_ID = "cmlc7quet0000ju403h74m5o9"
TOKEN = "f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97"

client = httpx.Client(timeout=120, headers={"Authorization": f"Bearer {TOKEN}"})

def chat(msg, history=None, expect_tool=False):
    payload = {
        "company_id": COMPANY_ID,
        "agent_id": AGENT_ID,
        "message": msg,
        "thread_id": "comprehensive-test-v2",
        "agent_config": {
            "model": "deepseek-v4-flash",
            "provider": "DEEPSEEK",
            "keyId": "cmqguj2zc08akjugf77y348pl",
        },
    }
    t0 = time.time()
    try:
        r = client.post(f"{BASE}/admin/agents/chat", json=payload)
        lat = time.time() - t0
        data = r.json()
        reply = data.get("reply", "") or ""
        tool_calls = data.get("tool_calls") or []
        tokens_in = data.get("tokens", {}).get("input", 0) if data.get("tokens") else 0
        tokens_out = data.get("tokens", {}).get("output", 0) if data.get("tokens") else 0
        has_error = data.get("status") == "error" or bool(data.get("error")) or r.status_code != 200
        return {"reply": reply, "tool_calls": tool_calls, "latency": lat, "tokens_in": tokens_in, "tokens_out": tokens_out, "error": has_error, "raw": data}
    except Exception as e:
        return {"reply": "", "tool_calls": [], "latency": time.time()-t0, "error": True, "raw": str(e)}

results = []
history = []

# ===== ROUND 1: Complete sales journey =====
scenarios = [
    # 1-3: Greeting + context setup
    ("السلام عليكم", "casual greeting"),
    ("عاملين ايه النهاردة", "casual follow-up"),
    ("عايز أتسوق شوية بمناسبة العيد", "shopping intent"),

    # 4-5: Knowledge + categories → knowledge_search, category_list
    ("عندكم إيه سياسة الاسترجاع؟", "knowledge_search (returns policy)"),
    ("عايز أشوف التصنيفات اللي عندكم", "category_list"),

    # 6-8: Product discovery → product_top_selling, product_search, offers_list_active
    ("ايه أفضل المنتجات مبيعاً", "product_top_selling"),
    ("عايز حاجة مميزة كهدية لمراتي", "product_search with query"),
    ("فيه عروض ولا خصومات دلوقتي؟", "offers_list_active"),

    # 9: Follow-up on product → product_search more specific
    ("قوليلي أكتر عن الموبايل اللي سعره 3000 جنيه", "product_search specific"),

    # 10: Shipping query → shipping_rates
    ("الشحن بياخد كام يوم ويكلف كام؟", "shipping_rates"),

    # 11: Discount negotiation → discount_create_draft
    ("ممكن خصم عشان أنا عميل قديم؟", "discount_create_draft — self-correction candidate"),

    # 12: Customer info → customer_info
    ("عايز أعرف بياناتي كعميل", "customer_info"),
]

print("=" * 60)
print("ROUND 1: SALES JOURNEY — testing context, tools, skills")
print("=" * 60)

for i, (msg, desc) in enumerate(scenarios, 1):
    res = chat(msg, history)
    res["msg"] = msg
    res["desc"] = desc
    res["num"] = i
    results.append(res)
    history.append({"role": "user", "content": msg})
    if res["reply"]:
        history.append({"role": "assistant", "content": res["reply"]})
    tool_info = f" [{len(res['tool_calls'])} tool(s)]" if res["tool_calls"] else ""
    err_mark = " ⚠️" if res["error"] else ""
    print(f"[{i}/25] {desc}{tool_info}{err_mark}")
    print(f"    Reply: {res['reply'][:100]}...")
    print(f"    Latency: {res['latency']:.1f}s | Tokens: {res['tokens_in']+res['tokens_out']}")
    time.sleep(0.5)

# ===== Context test — refer to earlier product =====
print("\n" + "=" * 60)
print("CONTEXT TEST — referencing earlier conversation")
print("=" * 60)

res = chat("فكرني بالموبايل اللي كنا بنتكلم عليه الأول", history)
res["msg"] = "فكرني بالموبايل اللي كنا بنتكلم عليه الأول"
res["desc"] = "context retention — remembers earlier product"
res["num"] = 13
results.append(res)
history.append({"role": "user", "content": "فكرني بالموبايل اللي كنا بنتكلم عليه الأول"})
if res["reply"]:
    history.append({"role": "assistant", "content": res["reply"]})
context_pass = "موبايل" in res["reply"] or "3000" in res["reply"] or "product" in res["reply"].lower()
print(f"[13/25] Context retention: {'PASS ✅' if context_pass else 'FAIL ❌'}")
print(f"    Reply: {res['reply'][:200]}")
print(f"    Latency: {res['latency']:.1f}s")

# ===== Self-correction test =====
print("\n" + "=" * 60)
print("SELF-CORRECTION TEST — contradict agent, see if it corrects")
print("=" * 60)

# Now contradict
res = chat("لا أنا مش عايز موبايل, أنا عايز لابتوب. كنت غلطان", history)
res["msg"] = "لا أنا مش عايز موبايل, أنا عايز لابتوب. كنت غلطان"
res["desc"] = "self-correction — user corrects previous intent"
res["num"] = 14
results.append(res)
history.append({"role": "user", "content": "لا أنا مش عايز موبايل, أنا عايز لابتوب. كنت غلطان"})
if res["reply"]:
    history.append({"role": "assistant", "content": res["reply"]})
self_correct = "لاب" in res["reply"] or "laptop" in res["reply"].lower() or "notebook" in res["reply"].lower()
print(f"[14/25] Self-correction: {'PASS ✅' if self_correct else 'FAIL ❌'}")
print(f"    Reply: {res['reply'][:200]}")
print(f"    Latency: {res['latency']:.1f}s")

# ===== Self-correction test 2 — agent wrong info =====
print("\n" + "=" * 60)
print("SELF-CORRECTION TEST 2 — agent claims something, user corrects")
print("=" * 60)

res = chat("فيه لابتوبات تحت 5000 جنيه؟", history)
res["msg"] = "فيه لابتوبات تحت 5000 جنيه؟"
res["desc"] = "self-correction test 2 — let agent answer then correct"
res["num"] = 15
results.append(res)
history.append({"role": "user", "content": "فيه لابتوبات تحت 5000 جنيه؟"})
if res["reply"]:
    history.append({"role": "assistant", "content": res["reply"]})
# Now correct the agent
res2 = chat("لا أنا قصدي بالدولار مش بالجنيه", history)
res2["msg"] = "لا أنا قصدي بالدولار مش بالجنيه"
res2["desc"] = "self-correction after agent reply — currency correction"
res2["num"] = 16
results.append(res2)
history.append({"role": "user", "content": "لا أنا قصدي بالدولار مش بالجنيه"})
if res2["reply"]:
    history.append({"role": "assistant", "content": res2["reply"]})
currency_correct = "دولار" in res2["reply"] or "$" in res2["reply"] or "dollar" in res2["reply"].lower()
print(f"[15/25] Initial laptop query: tool_count={len(res['tool_calls'])}")
print(f"[16/25] Currency correction: {'PASS ✅' if currency_correct else 'FAIL ❌'}")
print(f"    Reply: {res2['reply'][:200]}")

# ===== ROUND 2: Customer service / follow-up =====
print("\n" + "=" * 60)
print("ROUND 2: CUSTOMER SERVICE — orders, follow-ups, retention")
print("=" * 60)

scenarios2 = [
    ("عايز أشوف طلباتي السابقة", "order_lookup — previous orders"),
    ("فيه طلب لسه ماوصلش", "order_summary — order details"),
    ("هل فيه متابعة للعملاء؟ عايز حد يكلمني", "followup_suggestions — customer follow-up"),
    ("أنا عايز أقترح حاجة لصاحب المحل", "knowledge_create_faq or feedback — suggestion"),
    ("امتى ممكن تجيلي عروض تانية؟", "purchase_prediction — predict next purchase"),
    ("طيب فيه حاجة كويسة للأطفال", "product_search — kids products"),
    ("بصراحة خدمة العملاء عندكم محتاجة شغل", "smart-followup / deal-closing — objection handling"),
    ("طب ممكن رقم حد يكلمني بخصوص الطلب", "whatsapp_send or customer_info — contact request"),
    ("خلاص شكراً, أنا هفكر في الموضوع", "closing — deal-closing / retention"),
]

for i, (msg, desc) in enumerate(scenarios2, 17):
    res = chat(msg, history)
    res["msg"] = msg
    res["desc"] = desc
    res["num"] = i
    results.append(res)
    history.append({"role": "user", "content": msg})
    if res["reply"]:
        history.append({"role": "assistant", "content": res["reply"]})
    tool_info = f" [{len(res['tool_calls'])} tool(s)]" if res["tool_calls"] else ""
    err_mark = " ⚠️" if res["error"] else ""
    print(f"[{i}/25] {desc}{tool_info}{err_mark}")
    print(f"    Reply: {res['reply'][:120]}...")
    print(f"    Latency: {res['latency']:.1f}s")
    time.sleep(0.5)

# ===== SUMMARY =====
print("\n" + "=" * 70)
print("FINAL SUMMARY")
print("=" * 70)

total = len(results)
success = sum(1 for r in results if not r["error"])
total_tool_calls = sum(len(r["tool_calls"]) for r in results)
avg_lat = sum(r["latency"] for r in results) / total if total else 0
errors = [r for r in results if r["error"]]
empty_replies = [r for r in results if not r["reply"] and not r["error"]]
context_passed = context_pass
self_correct_passed = self_correct
currency_correct_passed = currency_correct

print(f"""
Messages sent: {total}
Successful:    {success}/{total}
Errors:        {len(errors)}
Empty replies: {len(empty_replies)}
Tool calls:    {total_tool_calls}
Avg latency:   {avg_lat:.1f}s

Context retention:   {'PASS ✅' if context_passed else 'FAIL ❌'}
Self-correction 1:   {'PASS ✅' if self_correct_passed else 'FAIL ❌'}
Self-correction 2:   {'PASS ✅' if currency_correct_passed else 'FAIL ❌'}
""")

if errors:
    print("ERRORS:")
    for e in errors:
        print(f"  [{e['num']}] {e['desc']}: {e['raw']}")

if empty_replies:
    print("EMPTY REPLIES:")
    for e in empty_replies:
        print(f"  [{e['num']}] {e['desc']}: msg='{e['msg']}'")

# Write full log
with open("/tmp/comprehensive_test_log.json", "w") as f:
    json.dump({"results": [{k: v for k, v in r.items() if k != 'raw'} for r in results], "total": total, "success": success, "tool_calls": total_tool_calls, "avg_latency": round(avg_lat, 1)}, f, ensure_ascii=False, indent=2)

print("Full log written to /tmp/comprehensive_test_log.json")

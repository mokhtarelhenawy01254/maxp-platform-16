#!/usr/bin/env python
"""اختبار شامل لمحادثة طويلة مع Agent - الإصدار الثالث (مع thread_id صح)"""

import asyncio, sys, json, os, uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

COMPANY_ID = "cmleybpf70028juo2wwpmp8rt"
BASE_URL = "http://localhost:8000"
SERVICE_TOKEN = os.environ.get("MAXP_SERVICE_TOKEN", "f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97")

passed = 0
failed = 0
thread_id = None
turn = 0

def log(test_name: str, ok: bool, detail: str = ""):
    global passed, failed
    if ok: passed += 1
    else: failed += 1
    print(f"  [{['❌','✅'][ok]}] {test_name}" + (f": {detail[:200]}" if not ok else ""))

import httpx

async def test_conversation():
    global thread_id, turn
    print(f"\n{'='*60}")
    print(f"اختبار شامل لمحادثة Agent - {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60) as client:
        customer_id = f"test-{uuid.uuid4().hex[:8]}"
        headers = {
            "X-Company-Id": COMPANY_ID,
            "X-Customer-Id": customer_id,
            "Authorization": f"Bearer {SERVICE_TOKEN}",
            "Content-Type": "application/json",
        }

        async def send(msg: str, test_name: str):
            global thread_id, turn
            turn += 1
            payload = {"message": msg}
            if thread_id:
                payload["threadId"] = thread_id
            print(f"\n  [{turn}] 👤 {msg}")
            try:
                resp = await client.post("/chat", json=payload, headers=headers)
                data = resp.json()
                reply = data.get("reply") or data.get("llm_response") or data.get("text") or ""
                new_tid = data.get("thread_id") or data.get("threadId")
                if new_tid:
                    if thread_id is None:
                        thread_id = new_tid
                    elif thread_id != new_tid:
                        print(f"  ⚠️  thread_id changed! {thread_id} -> {new_tid}")
                has_error = data.get("error")
                has_reply = bool(reply and reply.strip())
                is_empty = not has_reply
                is_raw_tool = "<functionCall" in reply or "<tool_call>" in reply.lower() or "tool_calls" in reply[:50]
                print(f"  🤖 {reply[:200] if reply else '(فارغ)'}")
                if has_error:
                    print(f"  ❌ ERROR: {data.get('error')}")
                if is_empty and not has_error:
                    log(f"{test_name} — رد فارغ!", False, f"thread={thread_id}, status={resp.status_code}")
                elif is_raw_tool:
                    log(f"{test_name} — tool calls متسربة!", False, reply[:100])
                else:
                    log(test_name, True)
                return reply
            except Exception as e:
                log(f"{test_name} — Exception", False, str(e))
                return ""

        # ========== المحادثة المتصلة ==========
        r1 = await send("السلام عليكم", "التحية")
        r2 = await send("عايز اشوف المنتجات اللي عندك", "تصفح المنتجات")
        r3 = await send("عندك سكوتش؟", "بحث عن منتج")
        r4 = await send("كم سعر الشحن للقاهرة؟", "سعر الشحن")
        r5 = await send("والإسكندرية كام؟", "شحن لإسكندرية")
        r6 = await send("هل في استرجاع لو المنتج مش عجبني؟", "سياسة الاسترجاع")
        r7 = await send("عايز اطلب كوتشي الإسكوتش مقاس 40 عدد 1", "إنشاء أوردر")
        r8 = await send("عايز اقدم شكوى، المنتج وصلني مكسور", "شكوى")
        r9 = await send("عايز استرجع الفلوس بتاعة الاوردر", "استرجاع فلوس")
        r10 = await send("كنت بسألك عن ايه قبل كده؟", "الذاكرة — التذكير")
        r11 = await send("شكرا جزيلا على مساعدتك", "ختام")
        r12 = await send("هل تقدر ترسل لي لينكات المنتجات اللي شفناها؟", "متابعة بعد الختام")

        # Turn 13: اختبر الذاكرة (هل يتذكر تفاصيل المنتج)
        r13 = await send("كم كان سعر الكوتشي اللي شفناه؟", "الذاكرة — السعر")

    print(f"\n{'='*60}")
    print(f"النتيجة: {passed}/{passed+failed} نجاح, {failed} فشل")
    print(f"thread_id: {thread_id}")
    print(f"{'='*60}\n")
    return 1 if failed > 1 else 0

if __name__ == "__main__":
    exit(asyncio.run(test_conversation()))

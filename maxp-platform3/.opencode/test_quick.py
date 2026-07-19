import httpx, json
client = httpx.Client(timeout=30, headers={"Authorization": "Bearer f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97"})
r = client.post("http://127.0.0.1:8000/admin/agents/chat", json={
    "company_id": "cmlc7quet0000ju403h74m5o9",
    "agent_id": "agent_Aj64Ho82vj0Z-UO34XWbdQ",
    "message": "السلام عليكم",
    "thread_id": "test-1",
    "agent_config": {"model": "deepseek-v4-flash", "provider": "DEEPSEEK", "keyId": "cmqguj2zc08akjugf77y348pl"},
})
print("Status:", r.status_code)
try:
    print("Body:", json.dumps(r.json(), ensure_ascii=False)[:500])
except:
    print("Body:", r.text[:500])

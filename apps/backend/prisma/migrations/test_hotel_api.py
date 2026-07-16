import subprocess, json, re

AUTH = "http://localhost:3007/api/v1/auth"
BASE = "http://localhost:3007/api/v1/hotel"

# Login
r = subprocess.run(["curl", "-s", "-D", "-", f"{AUTH}/login",
    "-H", "Content-Type: application/json",
    "-d", '{"email":"admin@hotelsalam.com","password":"Test123!"}'],
    capture_output=True, text=True)
hdr, body = r.stdout.split("\n\n", 1)
data = json.loads(body)
token = data.get("token", "")
user_company = data.get("data", {}).get("user", {}).get("companyId", "")
for line in hdr.split("\n"):
    if "token=" in line.lower():
        tok = line.split("token=")[1].split(";")[0].strip()
        token = token or tok
print(f"Company from login: {user_company}")
if not user_company:
    exit(1)

COMPANY = user_company

# Setup curl with cookie
curl_base = ["curl", "-s", "-H", "Cookie: token=" + token, "-H", "x-company-id: " + COMPANY]

def req(method, path, data=None):
    args = curl_base + ["-X", method, BASE + path]
    if data:
        args += ["-H", "Content-Type: application/json", "-d", json.dumps(data)]
    r = subprocess.run(args, capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except:
        print(f"Parse error for {method} {path}: {r.stdout[:200]}")
        return {}

# Get properties
props = req("GET", f"/properties?companyId={COMPANY}")
props_list = props.get("data", [])
print(f"Properties count: {len(props_list)}")
if not props_list:
    print(f"Props response: {json.dumps(props, ensure_ascii=False)[:300]}")
    exit(1)
pid = props_list[0]["id"]

# Create PER_PERSON room type
rt = req("POST", "/room-types", {
    "nameEn": "Suite PP", "nameAr": "جناح للشخص",
    "capacity": 2, "basePrice": 400, "pricingModel": "PER_PERSON",
    "pricePerExtraAdult": 150, "totalRooms": 3, "companyId": COMPANY
})
rtid = rt.get("data", {}).get("id", "")
print(f"RoomType PER_PERSON: {'OK' if rtid else 'FAIL'}: {json.dumps(rt, ensure_ascii=False)[:150]}")

# Create room
rm = req("POST", "/rooms", {
    "roomNumber": "555", "floor": "5", "roomTypeId": rtid,
    "propertyId": pid, "view": "mountain", "wing": "left",
    "hasExtraBed": True, "extraBedCapacity": 1, "extraBedPrice": 200,
    "basePriceOverride": 350, "companyId": COMPANY
})
rmid = rm.get("data", {}).get("id", "")
print(f"Room with extraBed: {'OK' if rmid else 'FAIL'}")

# Check availability
av = req("GET", f"/availability?propertyId={pid}&checkIn=2026-08-10&checkOut=2026-08-12&companyId={COMPANY}")
print(f"Availability: {'OK' if av.get('success') else 'FAIL'} count={len(av.get('data',[]))}")

# Create reservation with per-person pricing
res = req("POST", "/reservations", {
    "propertyId": pid, "customerName": "سامر", "customerPhone": "0501111111",
    "customerEmail": "samer@test.com",
    "checkIn": "2026-08-10", "checkOut": "2026-08-12",
    "rooms": [{"roomTypeId": rtid, "roomId": rmid, "nightlyRate": 350}],
    "adults": 2, "children": 0,
    "depositRequired": True, "depositAmount": 500, "depositPaid": True,
    "paymentMethod": "card", "companyId": COMPANY
})
resd = res.get("data", {})
resid = resd.get("id", "")
total = resd.get("totalAmount", 0)
dep = resd.get("depositAmount", 0)
print(f"Reservation: {'OK' if resid else 'FAIL'}")
print(f"  total={total} (expected 1100 = (400+150)*2) deposit={dep} expected 500")

# DB checks
env = {"PGPASSWORD": "mokhtar1234"}
db1 = subprocess.run(["psql", "-h", "localhost", "-U", "appuser", "-d", "maxp", "-t", "-c",
    f"SELECT view, wing FROM hotel_rooms WHERE id='{rmid}';"],
    capture_output=True, text=True, env=env)
print(f"Room DB: {db1.stdout.strip()[:40]} {'OK' if 'mountain' in db1.stdout else 'CHECK'}")

db2 = subprocess.run(["psql", "-h", "localhost", "-U", "appuser", "-d", "maxp", "-t", "-c",
    f"SELECT depositRequired, depositAmount FROM hotel_reservations WHERE id='{resid}';"],
    capture_output=True, text=True, env=env)
print(f"Res DB: {db2.stdout.strip()[:40]} {'OK' if 't' in db2.stdout else 'CHECK'}")

print("\n=== DONE ===")

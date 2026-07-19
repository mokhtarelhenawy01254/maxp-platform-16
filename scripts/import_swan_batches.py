import json, os, glob, time, requests, sys

BASE_URL = "http://153.92.223.119:3007/api/v1"
EMAIL = "swan@h2m.com"
PASSWORD = "0165676135"
BATCHES_DIR = os.path.expandvars(r'%USERPROFILE%\Downloads\swan_export\woo_batches')
RESUME_AFTER = os.environ.get('RESUME_AFTER', '')

s = requests.Session()

# Login
resp = s.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
resp.raise_for_status()
token = resp.json()['data']['token']
s.headers.update({"Authorization": f"Bearer {token}"})
print(f"Logged in as {EMAIL}")

batch_files = sorted(glob.glob(os.path.join(BATCHES_DIR, 'woo_batch_*.json')))
total_imported = 0
total_skipped = 0
total_errors = 0
total_orders = 0

for bf in batch_files:
    bn = os.path.basename(bf)
    if RESUME_AFTER and bn <= f"woo_batch_{RESUME_AFTER}.json":
        total_orders += len(json.load(open(bf)))
        continue

    with open(bf) as f:
        orders = json.load(f)

    total_orders += len(orders)

    resp = s.post(
        f"{BASE_URL}/woocommerce/orders/import",
        json={"orders": orders, "duplicateAction": "skip"},
        timeout=120,
    )

    data = resp.json()
    if data.get('success'):
        d = data.get('data', {})
        imported = d.get('imported', 0)
        skipped = d.get('skipped', 0)
        errors = d.get('failed', 0)
        total_imported += imported
        total_skipped += skipped
        total_errors += errors
        print(f"{bn}: {len(orders)} orders -> {imported} imported, {skipped} skipped, {errors} errors")
    else:
        total_errors += len(orders)
        print(f"{bn}: FAILED - {data.get('message', 'unknown error')[:100]}")

    # small delay to avoid hammering
    time.sleep(0.2)

    # progress save every 20 batches
    if (int(bn.split('_')[-1].split('.')[0])) % 20 == 0:
        with open(os.path.join(BATCHES_DIR, '..', 'import_progress.json'), 'w') as pf:
            json.dump({'last_batch': bn, 'total_imported': total_imported, 'total_skipped': total_skipped, 'total_errors': total_errors, 'total_orders': total_orders}, pf)

print(f"\n=== DONE ===")
print(f"Total orders processed: {total_orders}")
print(f"Total imported: {total_imported}")
print(f"Total skipped (duplicates): {total_skipped}")
print(f"Total errors: {total_errors}")

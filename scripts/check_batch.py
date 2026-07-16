import json, os

BATCH_DIR = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'swan_export', 'woo_batches')
files = sorted(os.listdir(BATCH_DIR))
print(f"Total batch files: {len(files)}")

# Check first batch
fname = os.path.join(BATCH_DIR, files[0])
with open(fname) as f:
    data = json.load(f)
print(f"\n{files[0]}: {len(data)} orders")

o = data[0]
print(f"\nOrder {o['id']}:")
print(f"  Status: {o['status']}")
print(f"  Total: {o['total']} {o['currency']}")
print(f"  Customer: {o['billing']['first_name']}")
print(f"  Phone: {o['billing']['phone']}")
print(f"  Email: {o['billing']['email']}")
print(f"  City: {o['billing']['city']}")
print(f"  Date: {o['date_created'][:19]}")
print(f"  Items: {len(o['line_items'])}")
if o['line_items']:
    li = o['line_items'][0]
    print(f"  First item: {li['name']} x{li['quantity']} @ {li['price']}")

o = data[-1]
print(f"\nOrder {o['id']}:")
print(f"  Status: {o['status']}")
print(f"  Total: {o['total']} {o['currency']}")
print(f"  Customer: {o['billing']['first_name']}")
print(f"  Phone: {o['billing']['phone']}")
print(f"  Items: {len(o['line_items'])}")

# Check a few random batches for integrity
import random
sample_files = random.sample(files, min(5, len(files)))
for sf in sample_files:
    with open(os.path.join(BATCH_DIR, sf)) as f:
        batch = json.load(f)
    statuses = {}
    for o in batch:
        s = o['status']
        statuses[s] = statuses.get(s, 0) + 1
    sample_order = batch[len(batch)//2]
    print(f"\n{sf}: {len(batch)} orders, statuses: {statuses}")
    print(f"  Sample: #{sample_order['id']} | {sample_order['billing']['first_name']} | {sample_order['total']}EGP | {sample_order['status']} | {len(sample_order['line_items'])} items")

# Total size estimate
total_size = sum(os.path.getsize(os.path.join(BATCH_DIR, f)) for f in files)
print(f"\nTotal size: {total_size / 1024 / 1024:.1f} MB")

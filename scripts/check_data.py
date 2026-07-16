import json, os

OUT_DIR = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'swan_export')

# Check order_stats
with open(os.path.join(OUT_DIR, 'order_stats.json')) as f:
    stats = json.load(f)

first = sorted(stats.keys())[0]
print(f"order_stats first entry ({first}):")
for k, v in stats[first].items():
    print(f"  {k}: {v}")

print(f"\norder_stats for 657:")
print(json.dumps(stats.get("657", {}), ensure_ascii=False, indent=2))

# Check postmeta for date keys
with open(os.path.join(OUT_DIR, 'postmeta.json')) as f:
    meta = json.load(f)

# Collect all date-related keys
date_keys = set()
for oid, m in meta.items():
    for k in m:
        if 'date' in k.lower() or 'time' in k.lower() or 'paid' in k.lower() or 'completed' in k.lower():
            date_keys.add(k)
    if len(date_keys) > 10:
        break

print(f"\nDate-related meta keys: {sorted(date_keys)}")

# Check first 3 orders for what's available
for oid in ["657", "661", "2373"]:
    if oid in meta:
        m = meta[oid]
        print(f"\nOrder {oid} meta (key subset):")
        for k in sorted(m.keys()):
            print(f"  {k}: {m[k]}")

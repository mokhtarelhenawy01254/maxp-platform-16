import gzip, re
from pathlib import Path

dump = Path.home() / "Downloads" / "u339372869_zBypj.20260715113030.sql.gz"
variation_ids = {'560', '565', '581', '635', '640', '450', '634', '440'}
found = {}

with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
    in_posts = False
    for line in f:
        if "INSERT INTO `wp_posts`" in line:
            in_posts = True
            continue
        if in_posts:
            if line.rstrip().endswith(';') and len(line) > 10:
                break
            for m in re.finditer(r"\((\d+),", line):
                pid = m.group(1)
                if pid in variation_ids:
                    found[pid] = line.strip()[:200]
                    variation_ids.remove(pid)
            continue

if found:
    print("Found in second dump:")
    for pid, val in sorted(found.items()):
        print(f"  ID={pid}: {val}")

if variation_ids:
    print(f"\nStill not found: {variation_ids}")

# Also check for the secondary file's main dump content
if not found:
    print("\nChecking structure of second dump...")
    with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
        for i, line in enumerate(f):
            if i < 20:
                print(f"  {line.strip()[:150]}")
            else:
                break

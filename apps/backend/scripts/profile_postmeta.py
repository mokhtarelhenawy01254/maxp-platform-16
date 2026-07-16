import gzip, re, time
from pathlib import Path

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"

# Find 1 postmeta block and time different approaches
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if line.startswith("INSERT INTO `wp_postmeta`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break
            break

print(f"Block size: {len(full):,} chars")

# Approach 1: findall (builds full list)
t0 = time.time()
matches = re.findall(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full)
t1 = time.time()
print(f"1. findall: {len(matches):,} matches in {t1-t0:.3f}s")

# Approach 2: finditer (streaming)
t0 = time.time()
count = 0
for m in re.finditer(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full):
    count += 1
t1 = time.time()
print(f"2. finditer: {count:,} matches in {t1-t0:.3f}s")

# Approach 3: Simple string search (find all '(' positions)
t0 = time.time()
count = 0
i = 0
while True:
    i = full.find(",'", i)
    if i < 0:
        break
    # Found a comma-quote, look backward for opening paren
    j = i
    while j > 0 and full[j] != '(':
        j -= 1
    if full[j] == '(':
        # Find closing ')'
        k = i + 2
        depth = 0
        while k < len(full):
            if full[k] == '\\':
                k += 2
                continue
            if full[k] == "'":
                # Skip to end of string value
                k += 1
                while k < len(full):
                    if full[k] == '\\':
                        k += 2
                        continue
                    if full[k] == "'":
                        break
                    k += 1
            if full[k] == ')':
                count += 1
                i = k + 1
                break
            k += 1
        else:
            i += 1
    else:
        i += 1
t1 = time.time()
print(f"3. manual parse: {count:,} matches in {t1-t0:.3f}s")

# Approach 4: Regex on key = value pattern (match specific keys we care about)
t0 = time.time()
# Build pattern: find all rows where meta_key is one we care about
sample_keys = ['_billing_first_name', '_billing_last_name', '_billing_email', '_billing_phone', '_order_total']
key_pattern = '|'.join(re.escape(k) for k in sample_keys)
count = 0
for m in re.finditer(r"\((\d+),(\d+),'(" + key_pattern + r")','([^']*)'\)", full):
    count += 1
t1 = time.time()
print(f"4. key-filtered regex: {count:,} matches in {t1-t0:.3f}s")

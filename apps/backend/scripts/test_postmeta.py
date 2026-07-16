"""
Test postmeta extraction speed
"""
import gzip, re, time, sys
from pathlib import Path

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"

# First, find the postmeta block
print("Finding postmeta block...")
t0 = time.time()
with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if line.startswith("INSERT INTO `wp_postmeta`"):
            full = line
            for nl in f:
                full += nl
                if nl.rstrip().endswith(';'):
                    break
            break
t1 = time.time()
print(f"Found postmeta block in {t1-t0:.1f}s, length={len(full):,} chars")

# Try different regex approaches
# Approach 1: Simple regex
t2 = time.time()
matches1 = re.findall(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full)
t3 = time.time()
print(f"Regex [^']*: {len(matches1):,} matches in {t3-t2:.1f}s")

# Approach 2: Lazy regex
t4 = time.time()
matches2 = re.findall(r"\((\d+),(\d+),'(.*?)','(.*?)'\)", full)
t5 = time.time()
print(f"Regex (.*?): {len(matches2):,} matches in {t5-t4:.1f}s")

# Approach 3: Use re.finditer
t6 = time.time()
count = 0
for m in re.finditer(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full):
    count += 1
t7 = time.time()
print(f"finditer: {count:,} matches in {t7-t6:.1f}s")

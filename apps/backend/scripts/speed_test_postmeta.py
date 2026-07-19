import gzip, re, time
from pathlib import Path

dump_file = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"

# Time how long it takes to find and process first 20 postmeta blocks
t0 = time.time()
block_count = 0
total_chars = 0

with gzip.open(dump_file, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        if not line.startswith("INSERT INTO `wp_postmeta`"):
            continue
        block_count += 1
        full = line
        for nl in f:
            full += nl
            if nl.rstrip().endswith(';'):
                break
        total_chars += len(full)

        # Run the regex
        rows = re.findall(r"\((\d+),(\d+),'([^']*)','([^']*)'\)", full)
        
        if block_count >= 20:
            break

t1 = time.time()
print(f"Processed {block_count} blocks in {t1-t0:.1f}s")
print(f"Total chars: {total_chars:,}")
print(f"Avg per block: {total_chars/block_count:,.0f} chars, {(t1-t0)/block_count:.1f}s")
print(f"Estimated total for 455 blocks: {455 * (t1-t0)/block_count:.0f}s")

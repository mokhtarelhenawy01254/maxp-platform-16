import gzip, re
from pathlib import Path

dump = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"

with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
    line_num = 0
    tables_found = set()
    for line in f:
        line_num += 1
        if line.startswith("INSERT INTO"):
            m = re.search(r"INTO\s+`(\w+)`", line)
            if m:
                tn = m.group(1)
                if tn not in tables_found:
                    tables_found.add(tn)
                    print(f"Line {line_num}: {tn}")
        if len(tables_found) >= 30:
            break

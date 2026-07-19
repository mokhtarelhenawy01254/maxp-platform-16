import gzip, re
from pathlib import Path

dump = Path.home() / "Downloads" / "u339372869_cv6D7.20260715113030 (1).sql.gz"
tables = {}

with gzip.open(dump, 'rt', encoding='utf8', errors='replace') as f:
    for line in f:
        ls = line.strip()
        if ls.startswith("CREATE TABLE"):
            m = re.search(r"`(\w+)`", ls)
            if m:
                tables[m.group(1)] = {"create": ls[:150], "inserts": 0, "rows": 0}
        elif ls.startswith("INSERT INTO"):
            m = re.search(r"INTO\s+`(\w+)`", ls)
            if m:
                tn = m.group(1)
                if tn not in tables:
                    tables[tn] = {"create": "", "inserts": 0, "rows": 0}
                tables[tn]["inserts"] += 1
                # Quick row count
                tables[tn]["rows"] += ls.count("),(") + 1

print(f"{'Table':35s} {'Inserts':>8s} {'EstRows':>10s}")
print("-" * 55)
for tn, info in sorted(tables.items()):
    print(f"{tn:35s} {info['inserts']:>8d} {info['rows']:>10,d}")

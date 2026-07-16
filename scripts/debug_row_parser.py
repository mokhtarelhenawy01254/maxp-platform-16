# Test the row parser with actual data from the dump
import re

# Simulate what extract_rows produces for a row containing our ID
# Based on the debug output: context shows ",0),,(657,1,'2023-10-04 15:18:01',..."
# The row would be extracted as: "(657,1,'2023-10-04 15:18:01','2023-10-04 12:18:01','','Order - October 4, 2023 @ 03:18 PM','','wc-refunded','open','closed','wc_order_NXRuHnhhGZCJb','order-oct-04-2023-1218-pm','','','2026-04-04 13:43:20','2026-04-04 11:43:20','',0,'https://shop2.swan-eg.online/?post_type=shop_order&p=657',0,'shop_order','',22)"

row = "(657,1,'2023-10-04 15:18:01','2023-10-04 12:18:01','','Order - October 4, 2023 @ 03:18 PM','','wc-refunded','open','closed','wc_order_NXRuHnhhGZCJb','order-oct-04-2023-1218-pm','','','2026-04-04 13:43:20','2026-04-04 11:43:20','',0,'https://shop2.swan-eg.online/?post_type=shop_order&p=657',0,'shop_order','',22)"

def split_row(r):
    cols = []; cur = ''; in_s = False; sc = None; i = 0; n = len(r)
    while i < n:
        ch = r[i]
        if in_s:
            if ch == '\\' and i+1 < n: cur += ch + r[i+1]; i += 2; continue
            elif ch == sc: in_s = False
            cur += ch
        elif ch in ("'", '"'): in_s = True; sc = ch; cur += ch
        elif ch == ',': cols.append(cur.strip()); cur = ''
        else: cur += ch
        i += 1
    if cur.strip(): cols.append(cur.strip())
    return cols

cols = split_row(row)
print(f"Total columns: {len(cols)}")
for i, c in enumerate(cols):
    val = c.strip()
    if val.startswith("'") and val.endswith("'"):
        val = val[1:-1]
    print(f"  [{i}]: {val[:80]}")

import gzip, re, json, sys, os
from collections import defaultdict

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}
TABLE_PAT = r"INSERT INTO `(wp_posts|wp_postmeta|wp_woocommerce_order_items|wp_woocommerce_order_itemmeta)` VALUES\s*(.*)"

posts = {}
postmeta = defaultdict(dict)
order_items = defaultdict(list)
itemmeta = defaultdict(dict)
found_ids = {'wp_posts': set(), 'wp_postmeta': set(), 'wp_woocommerce_order_items': set(), 'wp_woocommerce_order_itemmeta': set()}

current_table = None
current_text = []
current_has_target = False

def process_insert(table, text):
    global found_ids
    data = ','.join(text)
    rows = []; current = ''; depth = 0; in_string = False; sc = None; i = 0; n = len(data)
    while i < n:
        ch = data[i]
        if in_string:
            if ch == '\\' and i + 1 < n: current += ch + data[i+1]; i+=2; continue
            elif ch == sc: in_string = False
            current += ch
        elif ch in ("'",'"'): in_string=True; sc=ch; current+=ch
        elif ch == '(':
            if depth == 0: current = '('
            else: current += ch
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0: current+=ch; rows.append(current); current=''
            else: current += ch
        else:
            if depth > 0: current += ch
        i += 1
    for rr in rows:
        cols = []; cur=''; in_s=False; s=None; j=0; rn=len(rr)
        while j < rn:
            ch = rr[j]
            if in_s:
                if ch == '\\' and j+1 < rn: cur+=ch+rr[j+1]; j+=2; continue
                elif ch == s: in_s = False
                cur += ch
            elif ch in ("'",'"'): in_s=True; s=ch; cur+=ch
            elif ch == ',': cols.append(cur.strip()); cur=''
            else: cur += ch
            j += 1
        if cur.strip(): cols.append(cur.strip())
        
        def cln(val):
            val = val.strip()
            if val == 'NULL': return None
            if val.startswith("'") and val.endswith("'"):
                s2 = val[1:-1]; return s2.replace("\\'","'").replace("\\n","\n").replace("\\r","\r").replace("\\\\","\\")
            try: return int(val)
            except: pass
            try: return float(val)
            except: return val

        if table == 'wp_posts' and len(cols) >= 23:
            pid = int(cols[0]) if cols[0].isdigit() else 0
            if pid in ORDER_IDS:
                found_ids['wp_posts'].add(pid)
                posts[pid] = {'id': pid, 'post_date': cln(cols[2]), 'post_date_gmt': cln(cols[3]),
                    'post_status': cln(cols[7]), 'post_password': cln(cols[11]),
                    'post_modified': cln(cols[14]), 'post_modified_gmt': cln(cols[15])}
        elif table == 'wp_postmeta' and len(cols) >= 4:
            pid = int(cols[1]) if cols[1].isdigit() else 0
            if pid in ORDER_IDS:
                found_ids['wp_postmeta'].add(pid)
                postmeta[pid][cln(cols[2])] = cln(cols[3])
        elif table == 'wp_woocommerce_order_items' and len(cols) >= 4:
            oid = int(cols[2]) if cols[2].isdigit() else 0
            if oid in ORDER_IDS:
                found_ids['wp_woocommerce_order_items'].add(oid)
                order_items[oid].append({'item_id': int(cols[0]), 'item_type': cln(cols[1]), 'item_name': cln(cols[3])})
        elif table == 'wp_woocommerce_order_itemmeta' and len(cols) >= 4:
            iid = int(cols[1]) if cols[1].isdigit() else 0
            itemmeta[iid][cln(cols[2])] = cln(cols[3])

def has_target(text_parts):
    combined = ' '.join(text_parts)
    for oid in ORDER_IDS:
        if f'({oid},' in combined or f',{oid},' in combined or f',{oid})' in combined:
            return True
    return False

print("Streaming...", file=sys.stderr)
n_processed = 0
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line: continue
        m = re.match(TABLE_PAT, line)
        if m:
            if current_table and current_has_target:
                process_insert(current_table, current_text)
            current_table = m.group(1)
            current_text = []
            current_has_target = False
            rest = m.group(2).strip() if m.group(2) else ''
            if rest:
                if rest.endswith(';'): rest = rest[:-1]
                if rest: current_text.append(rest)
            # If same-line data (ends with ')' ), the INSERT is complete
            if current_text and current_text[0].endswith(')'):
                if has_target(current_text):
                    process_insert(current_table, current_text)
                current_table = None; current_text = []; current_has_target = False
            n_processed += 1
            continue
        if current_table:
            add = line
            if add.endswith(');'):
                add = add[:-1]
                current_text.append(add)
                if current_has_target or has_target(current_text):
                    current_has_target = True
                    process_insert(current_table, current_text)
                current_table = None; current_text = []; current_has_target = False
            else:
                if not current_has_target and has_target([add]):
                    current_has_target = True
                current_text.append(add)

if current_table and current_has_target:
    process_insert(current_table, current_text)

print(f"Processed {n_processed} INSERT statements", file=sys.stderr)
for tbl in ['wp_posts', 'wp_postmeta', 'wp_woocommerce_order_items', 'wp_woocommerce_order_itemmeta']:
    print(f"  {tbl}: found IDs {found_ids[tbl]}", file=sys.stderr)
print(f"  posts dict: {sorted(posts.keys())}", file=sys.stderr)

# Link itemmeta
for oid in list(order_items.keys()):
    for item in order_items[oid]:
        iid = item['item_id']
        if iid in itemmeta: item.update(itemmeta[iid])

status_map = {'wc-completed': 'DELIVERED', 'wc-refunded': 'REFUNDED', 'wc-cancelled': 'CANCELLED',
    'wc-pending': 'PENDING', 'wc-processing': 'PROCESSING', 'wc-on-hold': 'ON_HOLD', 'wc-failed': 'FAILED'}

orders_out = []
for pid in sorted(ORDER_IDS):
    if pid not in posts:
        print(f"WARNING: #{pid} not found in wp_posts", file=sys.stderr)
        continue
    p = posts[pid]; m = postmeta.get(pid, {}); items = order_items.get(pid, [])
    fn = (m.get('_billing_first_name', '') or ''); ln = (m.get('_billing_last_name', '') or '')
    customer_name = f"{fn} {ln}".strip() or f"Customer {pid}"
    raw_status = p['post_status']; local_status = status_map.get(raw_status, 'PENDING')
    subtotal = float(m.get('_order_subtotal', 0) or 0); shipping = float(m.get('_order_shipping', 0) or 0)
    discount = abs(float(m.get('_cart_discount', 0) or 0)); total = float(m.get('_order_total', 0) or 0)
    pm = str(m.get('_payment_method', '') or '')
    pm_map = {'cod': 'CASH', 'cash': 'CASH', 'bank_transfer': 'BANK_TRANSFER',
              'credit_card': 'CREDIT_CARD', 'instapay': 'INSTAPAY', 'vodafone_cash': 'VODAFONE_CASH'}
    mapped_pm = pm_map.get(pm.lower(), 'CASH')
    product_items = []
    for item in items:
        if item.get('item_type') == 'line_item':
            qty = int(item.get('_qty', 1) or 1); lt = float(item.get('_line_total', 0) or 0)
            product_items.append({'productName': item.get('item_name', 'Unknown'), 'quantity': qty,
                'price': round(lt/max(qty,1),2), 'total': round(lt,2),
                'productSku': str(item.get('_sku','') or '')})
    if not product_items and total > 0:
        product_items.append({'productName': f'Order #{pid}', 'quantity': 1, 'price': total, 'total': total})
    order_obj = {'customerName': customer_name, 'customerPhone': str(m.get('_billing_phone','') or ''),
        'customerEmail': str(m.get('_billing_email','') or ''),
        'customerAddress': str(m.get('_billing_address_1','') or ''),
        'city': str(m.get('_billing_city','') or ''), 'governorate': str(m.get('_billing_state','') or ''),
        'status': local_status, 'paymentMethod': mapped_pm,
        'subtotal': round(subtotal,2), 'shippingCost': round(shipping,2), 'discount': round(discount,2),
        'total': round(total,2), 'currency': str(m.get('_order_currency','EGP') or 'EGP'),
        'notes': '', 'products': product_items,
        'wooCommerceId': str(pid), 'wooCommerceStatus': raw_status,
        'syncedFromWoo': True, 'sourceType': 'woocommerce',
        'createdAt': p['post_date_gmt'] or p['post_date']}
    orders_out.append(order_obj)
    print(f"  {pid}: {customer_name} | {local_status} | {total} EGP | {len(product_items)} items", file=sys.stderr)

print(f"\nTotal: {len(orders_out)} orders", file=sys.stderr)
print(json.dumps(orders_out, ensure_ascii=False))

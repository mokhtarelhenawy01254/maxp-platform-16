import gzip, re, json, sys, os

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}

posts = {}
postmeta = {}
order_items = {}
itemmeta = {}

def clean(v):
    v = v.strip()
    if v == 'NULL': return None
    if v.startswith("'") and v.endswith("'"):
        return v[1:-1].replace("\\'", "'").replace("\\n", "\n").replace("\\r", "\r").replace("\\\\", "\\")
    try: return int(v)
    except:
        try: return float(v)
        except: return v

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

def extract_rows(data):
    rows = []; cur = ''; depth = 0; in_s = False; sc = None; i = 0; n = len(data)
    while i < n:
        ch = data[i]
        if in_s:
            if ch == '\\' and i+1 < n: cur += ch + data[i+1]; i += 2; continue
            elif ch == sc: in_s = False
            cur += ch
        elif ch in ("'", '"'): in_s = True; sc = ch; cur += ch
        elif ch == '(':
            if depth == 0: cur = '('
            else: cur += ch
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0: cur += ch; rows.append(cur); cur = ''
            else: cur += ch
        else:
            if depth > 0: cur += ch
        i += 1
    if cur.strip() and depth == 0: rows.append(cur)
    return rows

def process_data(data, table):
    rows = extract_rows(data)
    for rr in rows:
        cols = split_row(rr)
        if table == 'wp_posts' and len(cols) >= 23:
            pid = int(cols[0]) if cols[0].isdigit() else 0
            if pid in ORDER_IDS:
                posts[pid] = {
                    'date': clean(cols[2]), 'date_gmt': clean(cols[3]),
                    'status': clean(cols[7]), 'order_key': clean(cols[11])
                }
        elif table == 'wp_postmeta' and len(cols) >= 4:
            pid = int(cols[1]) if cols[1].isdigit() else 0
            if pid in ORDER_IDS:
                if pid not in postmeta: postmeta[pid] = {}
                postmeta[pid][clean(cols[2])] = clean(cols[3])
        elif table == 'wp_woocommerce_order_items' and len(cols) >= 4:
            oid = int(cols[2]) if cols[2].isdigit() else 0
            if oid in ORDER_IDS:
                if oid not in order_items: order_items[oid] = []
                order_items[oid].append({'item_id': int(cols[0]), 'type': clean(cols[1]), 'name': clean(cols[3])})
        elif table == 'wp_woocommerce_order_itemmeta' and len(cols) >= 4:
            iid = int(cols[1]) if cols[1].isdigit() else 0
            if iid not in itemmeta: itemmeta[iid] = {}
            itemmeta[iid][clean(cols[2])] = clean(cols[3])

def has_our_ids(data):
    for oid in ORDER_IDS:
        if f'({oid},' in data: return True
    return False

pat = re.compile(r"INSERT INTO `(wp_posts|wp_postmeta|wp_woocommerce_order_items|wp_woocommerce_order_itemmeta)` VALUES\s*(.*)", re.I)

print("Streaming...", file=sys.stderr)
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    cur_tbl = None; buf = []
    for line in f:
        line = line.strip()
        if not line: continue
        m = pat.match(line)
        if m:
            if buf and cur_tbl:
                data = ','.join(buf)
                if has_our_ids(data):
                    process_data(data, cur_tbl)
            cur_tbl = m.group(1)
            buf = []
            rest = (m.group(2) or '').strip()
            if rest:
                if rest.endswith(';'): rest = rest[:-1]
                if rest: buf.append(rest)
                if rest.endswith(')'):
                    # Check immediately since data is complete
                    data = ','.join(buf)
                    if has_our_ids(data):
                        process_data(data, cur_tbl)
                    cur_tbl = None; buf = []
        elif cur_tbl:
            if line.endswith(');'):
                buf.append(line[:-1])
                data = ','.join(buf)
                if has_our_ids(data):
                    process_data(data, cur_tbl)
                cur_tbl = None; buf = []
            else:
                buf.append(line)

if buf and cur_tbl:
    data = ','.join(buf)
    if has_our_ids(data):
        process_data(data, cur_tbl)

print(f"Posts: {len(posts)}", file=sys.stderr)
print(f"Meta:  {len(postmeta)}", file=sys.stderr)
print(f"Items: {len(order_items)}", file=sys.stderr)

# Link itemmeta
for oid in order_items:
    for item in order_items[oid]:
        iid = item['item_id']
        if iid in itemmeta:
            item.update(itemmeta[iid])

status_map = {'wc-completed': 'DELIVERED', 'wc-refunded': 'REFUNDED', 'wc-cancelled': 'CANCELLED'}

orders_out = []
for pid in sorted(ORDER_IDS):
    p = posts.get(pid)
    if not p: continue
    m = postmeta.get(pid, {})
    items = order_items.get(pid, [])
    
    fn = (m.get('_billing_first_name', '') or ''); ln = (m.get('_billing_last_name', '') or '')
    name = f"{fn} {ln}".strip() or f"Customer {pid}"
    
    st = p['status']; local = status_map.get(st, 'PENDING')
    sub = float(m.get('_order_subtotal', 0) or 0)
    ship = float(m.get('_order_shipping', 0) or 0)
    disc = abs(float(m.get('_cart_discount', 0) or 0))
    total = float(m.get('_order_total', 0) or 0)
    pm = {'cod': 'CASH', 'cash': 'CASH'}.get((m.get('_payment_method','') or '').lower(), 'CASH')
    
    prods = []
    for item in items:
        if item.get('type') == 'line_item':
            qty = int(item.get('_qty', 1) or 1)
            lt = float(item.get('_line_total', 0) or 0)
            prods.append({'productName': item.get('name', 'Unknown'), 'quantity': qty,
                'price': round(lt/qty,2), 'total': round(lt,2),
                'productSku': str(item.get('_sku', '') or '')})
    if not prods and total > 0:
        prods.append({'productName': f'Order #{pid}', 'quantity': 1, 'price': total, 'total': total})
    
    orders_out.append({
        'customerName': name, 'customerPhone': str(m.get('_billing_phone','') or ''),
        'customerEmail': str(m.get('_billing_email','') or ''),
        'customerAddress': str(m.get('_billing_address_1','') or ''),
        'city': str(m.get('_billing_city','') or ''), 'governorate': str(m.get('_billing_state','') or ''),
        'status': local, 'paymentMethod': pm, 'subtotal': round(sub,2),
        'shippingCost': round(ship,2), 'discount': round(disc,2), 'total': round(total,2),
        'currency': str(m.get('_order_currency','EGP') or 'EGP'),
        'notes': '', 'products': prods,
        'wooCommerceId': str(pid), 'wooCommerceStatus': st,
        'syncedFromWoo': True, 'sourceType': 'woocommerce',
        'createdAt': p['date_gmt'] or p['date'],
    })
    print(f"  #{pid}: {name} | {local} | {total} EGP | {len(prods)} items", file=sys.stderr)

print(f"\nTotal: {len(orders_out)} orders", file=sys.stderr)
print(json.dumps(orders_out, ensure_ascii=False))

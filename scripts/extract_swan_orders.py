import gzip, re, json, sys, os
from collections import defaultdict

SQL_GZ = os.path.join(os.environ['USERPROFILE'], 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
ORDER_IDS = {2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376}

posts = {}
postmeta = defaultdict(dict)
order_items = defaultdict(list)
itemmeta = defaultdict(dict)

current_table = None
values_buffer = []

def flush_values():
    global values_buffer, current_table
    if not values_buffer or not current_table:
        return
    data = ','.join(values_buffer)
    parse_rows_into(data, current_table)
    values_buffer = []
    current_table = None

def parse_rows_into(data, table):
    rows = []
    current = ''
    depth = 0
    in_string = False
    sc = None
    i = 0
    n = len(data)
    while i < n:
        ch = data[i]
        if in_string:
            if ch == '\\' and i + 1 < n:
                current += ch + data[i+1]
                i += 2
                continue
            elif ch == sc:
                in_string = False
            current += ch
        elif ch in ("'", '"'):
            in_string = True
            sc = ch
            current += ch
        elif ch == '(':
            if depth == 0:
                current = '('
            else:
                current += ch
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                current += ch
                if current.strip():
                    rows.append(current)
                current = ''
            else:
                current += ch
        else:
            if depth > 0:
                current += ch
        i += 1
    for rr in rows:
        process_row(rr, table)

def parse_row_cols(row_str):
    vals = []
    current = ''
    in_string = False
    sc = None
    i = 0
    n = len(row_str)
    while i < n:
        ch = row_str[i]
        if in_string:
            if ch == '\\' and i + 1 < n:
                current += ch + row_str[i+1]
                i += 2
                continue
            elif ch == sc:
                in_string = False
            current += ch
        elif ch in ("'", '"'):
            in_string = True
            sc = ch
            current += ch
        elif ch == ',':
            vals.append(current.strip())
            current = ''
        else:
            current += ch
        i += 1
    if current.strip():
        vals.append(current.strip())
    return vals

def clean(val):
    val = val.strip()
    if val == 'NULL':
        return None
    if val.startswith("'") and val.endswith("'"):
        s = val[1:-1]
        s = s.replace("\\'", "'").replace("\\n", "\n").replace("\\r", "\r").replace("\\\\", "\\")
        return s
    try:
        return int(val)
    except ValueError:
        try:
            return float(val)
        except ValueError:
            return val

def process_row(row_str, table):
    cols = parse_row_cols(row_str)
    if table == 'wp_posts':
        if len(cols) < 23: return
        pid = int(cols[0]) if cols[0] and cols[0].isdigit() else 0
        if pid in ORDER_IDS:
            posts[pid] = {
                'id': pid, 'post_date': clean(cols[2]),
                'post_date_gmt': clean(cols[3]),
                'post_status': clean(cols[7]),
                'post_password': clean(cols[11]),
                'post_modified': clean(cols[14]),
                'post_modified_gmt': clean(cols[15]),
            }
    elif table == 'wp_postmeta':
        if len(cols) < 4: return
        pid = int(cols[1]) if cols[1] and cols[1].isdigit() else 0
        if pid in ORDER_IDS:
            postmeta[pid][clean(cols[2])] = clean(cols[3])
    elif table == 'wp_woocommerce_order_items':
        if len(cols) < 4: return
        oid = int(cols[2]) if cols[2] and cols[2].isdigit() else 0
        if oid in ORDER_IDS:
            order_items[oid].append({
                'item_id': int(cols[0]), 'item_type': clean(cols[1]),
                'item_name': clean(cols[3]),
            })
    elif table == 'wp_woocommerce_order_itemmeta':
        if len(cols) < 4: return
        iid = int(cols[1]) if cols[1] and cols[1].isdigit() else 0
        itemmeta[iid][clean(cols[2])] = clean(cols[3])

print("Streaming...", file=sys.stderr)
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line: continue
        m = re.match(r"INSERT INTO `(wp_posts|wp_postmeta|wp_woocommerce_order_items|wp_woocommerce_order_itemmeta)` VALUES\s*(.*)", line, re.I)
        if m:
            flush_values()
            current_table = m.group(1)
            rest = m.group(2).strip()
            if rest:
                if rest.endswith(';'):
                    rest = rest[:-1]
                values_buffer.append(rest)
                if rest.endswith(');') or rest.endswith(')'):
                    flush_values()
                    continue
            continue
        if current_table and line.endswith(');'):
            values_buffer.append(line[:-1])
            flush_values()
            continue
        if current_table:
            values_buffer.append(line)

flush_values()

print(f"Found: posts={len(posts)}, meta={len(postmeta)}, items={len(order_items)}", file=sys.stderr)
for pid in sorted(posts.keys()):
    print(f"  #{pid}: {posts[pid]['post_status']}", file=sys.stderr)

# Link itemmeta to items
for oid in list(order_items.keys()):
    for item in order_items[oid]:
        iid = item['item_id']
        if iid in itemmeta:
            item.update(itemmeta[iid])

status_map = {
    'wc-completed': 'DELIVERED', 'wc-refunded': 'REFUNDED',
    'wc-cancelled': 'CANCELLED', 'wc-pending': 'PENDING',
    'wc-processing': 'PROCESSING', 'wc-on-hold': 'ON_HOLD',
    'wc-failed': 'FAILED', 'wc-trash': 'TRASH',
}

orders_out = []
for pid in sorted(ORDER_IDS):
    if pid not in posts:
        print(f"WARNING: #{pid} not found in wp_posts", file=sys.stderr)
        continue
    p = posts[pid]; m = postmeta.get(pid, {}); items = order_items.get(pid, [])
    fn = (m.get('_billing_first_name', '') or '')
    ln = (m.get('_billing_last_name', '') or '')
    customer_name = f"{fn} {ln}".strip() or f"Customer {pid}"
    raw_status = p['post_status']
    local_status = status_map.get(raw_status, 'PENDING')
    subtotal = float(m.get('_order_subtotal', 0) or 0)
    shipping = float(m.get('_order_shipping', 0) or 0)
    discount = abs(float(m.get('_cart_discount', 0) or 0))
    total = float(m.get('_order_total', 0) or 0)
    pm = str(m.get('_payment_method', '') or '')
    pm_map = {'cod': 'CASH', 'cash': 'CASH', 'bank_transfer': 'BANK_TRANSFER',
              'credit_card': 'CREDIT_CARD', 'instapay': 'INSTAPAY',
              'vodafone_cash': 'VODAFONE_CASH', 'wallet': 'WALLET'}
    mapped_pm = pm_map.get(pm.lower(), 'CASH')
    product_items = []
    for item in items:
        if item.get('item_type') == 'line_item':
            qty = int(item.get('_qty', 1) or 1)
            lt = float(item.get('_line_total', 0) or 0)
            product_items.append({
                'productName': item.get('item_name', 'Unknown'),
                'quantity': qty, 'price': round(lt / max(qty,1), 2),
                'total': round(lt, 2),
                'productSku': str(item.get('_sku', '') or ''),
            })
    if not product_items and total > 0:
        product_items.append({'productName': f'Order #{pid}', 'quantity': 1, 'price': total, 'total': total})
    order_obj = {
        'customerName': customer_name,
        'customerPhone': str(m.get('_billing_phone', '') or ''),
        'customerEmail': str(m.get('_billing_email', '') or ''),
        'customerAddress': str(m.get('_billing_address_1', '') or ''),
        'city': str(m.get('_billing_city', '') or ''),
        'governorate': str(m.get('_billing_state', '') or ''),
        'status': local_status, 'paymentMethod': mapped_pm,
        'subtotal': round(subtotal, 2), 'shippingCost': round(shipping, 2),
        'discount': round(discount, 2), 'total': round(total, 2),
        'currency': str(m.get('_order_currency', 'EGP') or 'EGP'),
        'notes': '', 'products': product_items,
        'wooCommerceId': str(pid), 'wooCommerceStatus': raw_status,
        'syncedFromWoo': True, 'sourceType': 'woocommerce',
        'createdAt': p['post_date_gmt'] or p['post_date'],
    }
    orders_out.append(order_obj)
    print(f"  {pid}: {customer_name} | {local_status} | {total} EGP", file=sys.stderr)

print(f"\nTotal: {len(orders_out)} orders", file=sys.stderr)
print(json.dumps(orders_out, ensure_ascii=False))

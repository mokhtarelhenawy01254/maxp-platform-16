import gzip, re, json, os, sys
from collections import defaultdict

USERPROFILE = os.environ['USERPROFILE']
SQL_GZ = os.path.join(USERPROFILE, 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
OUT_DIR = os.path.join(USERPROFILE, 'Downloads', 'swan_export')
os.makedirs(OUT_DIR, exist_ok=True)

PRODUCT_POST_TYPES = {'product', 'product_variation'}

print("Stage 1: Extracting product names from wp_posts...", file=sys.stderr)
product_names = {}  # id -> title
current_table = None
current_text = []
current_has_target = False

def extract_insert_values(data):
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
    return rows

def parse_cols(row_str):
    vals = []; cur=''; in_s=False; s=None; j=0; rn=len(row_str)
    while j < rn:
        ch = row_str[j]
        if in_s:
            if ch == '\\' and j+1 < rn: cur+=ch+row_str[j+1]; j+=2; continue
            elif ch == s: in_s = False
            cur += ch
        elif ch in ("'",'"'): in_s=True; s=ch; cur+=ch
        elif ch == ',': vals.append(cur.strip()); cur=''
        else: cur += ch
        j += 1
    if cur.strip(): vals.append(cur.strip())
    return vals

def clean(val):
    val = val.strip()
    if val == 'NULL': return None
    if val.startswith("'") and val.endswith("'"):
        s = val[1:-1]; return s.replace("\\'","'").replace("\\n","\n").replace("\\r","\r").replace("\\\\","\\")
    try: return int(val)
    except: pass
    try: return float(val)
    except: return val

def process_post(row_str):
    cols = parse_cols(row_str)
    if cols[0].lstrip('(').isdigit():
        pid = int(cols[0].lstrip('('))
        post_type = str(clean(cols[20]) or '')
        if post_type in PRODUCT_POST_TYPES:
            title = str(clean(cols[3]) or '')
            product_names[pid] = title

def has_target_line(text):
    return "product" in text.lower() or "variation" in text.lower()

print("Scanning wp_posts for products...", file=sys.stderr)
n_scanned = 0
with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line: continue
        m = re.match(r"INSERT INTO `wp_posts` VALUES\s*(.*)", line)
        if m:
            rest = m.group(1).strip()
            if rest.endswith(';'): rest = rest[:-1]
            rows = extract_insert_values(rest)
            for rr in rows:
                process_post(rr)
            n_scanned += 1
            if n_scanned % 5 == 0:
                print(f"  scanned {n_scanned} INSERT blocks, {len(product_names)} products found", file=sys.stderr)
            continue

print(f"Found {len(product_names)} product names", file=sys.stderr)

# Save product names
with open(os.path.join(OUT_DIR, 'product_names.json'), 'w', encoding='utf8') as f:
    json.dump(product_names, f, ensure_ascii=False)

# Load existing extracted data
print("Loading extracted data...", file=sys.stderr)

with open(os.path.join(OUT_DIR, 'stage1_ids.json')) as f:
    stage1 = json.load(f)
order_ids = set(stage1['order_ids'])
print(f"Order IDs: {len(order_ids)}", file=sys.stderr)

with open(os.path.join(OUT_DIR, 'order_stats.json')) as f:
    order_stats = json.load(f)

with open(os.path.join(OUT_DIR, 'postmeta.json')) as f:
    postmeta = json.load(f)

with open(os.path.join(OUT_DIR, 'product_lookup.json')) as f:
    product_lookup = json.load(f)

# Index product_lookup by order_id
print("Indexing product lookup...", file=sys.stderr)
order_products = defaultdict(list)
for item in product_lookup:
    oid = str(item['order_id'])
    order_products[oid].append({
        'product_id': item['product_id'],
        'variation_id': item.get('variation_id', '0'),
        'qty': int(item.get('qty', 1)),
        'net_revenue': float(item.get('net_revenue', 0)),
        'gross_revenue': float(item.get('gross_revenue', 0))
    })

# Status map
status_map = {
    'wc-completed': 'DELIVERED', 'wc-refunded': 'REFUNDED', 'wc-cancelled': 'CANCELLED',
    'wc-pending': 'PENDING', 'wc-processing': 'PROCESSING', 'wc-on-hold': 'ON_HOLD',
    'wc-failed': 'FAILED', 'wc-trash': 'TRASH'
}

# Payment method map
pm_map = {
    'cod': 'cod', 'cash': 'cod', 'bank_transfer': 'bacs',
    'credit_card': 'stripe', 'instapay': 'other', 'vodafone_cash': 'other'
}

ORDERS_PER_BATCH = 100
BATCH_DIR = os.path.join(OUT_DIR, 'woo_batches')
os.makedirs(BATCH_DIR, exist_ok=True)

print("Building WooCommerce orders...", file=sys.stderr)
all_orders = []
skipped_no_meta = 0
for oid_str in sorted(order_ids, key=int):
    if oid_str not in postmeta:
        skipped_no_meta += 1
        continue

    m = postmeta[oid_str]
    fn = str(m.get('_billing_first_name', '') or '').strip()
    ln = str(m.get('_billing_last_name', '') or '').strip()
    phone = str(m.get('_billing_phone', '') or '').strip()
    email = str(m.get('_billing_email', '') or '').strip()
    address = str(m.get('_billing_address_1', '') or '').strip()
    city = str(m.get('_billing_city', '') or '').strip()
    state = str(m.get('_billing_state', '') or '').strip()

    raw_status = str(m.get('_woocommerce_order_status', '') or str(order_stats.get(oid_str, {}).get('status', 'wc-pending')))
    if raw_status == '' or raw_status == 'None':
        raw_status = 'wc-pending'

    subtotal = float(m.get('_order_subtotal', 0) or 0)
    shipping = float(m.get('_order_shipping', 0) or 0)
    discount = abs(float(m.get('_cart_discount', 0) or 0))
    total = float(m.get('_order_total', 0) or 0)
    if total == 0:
        # fallback to order_stats
        stats = order_stats.get(oid_str, {})
        total = float(stats.get('total_sales', 0) or 0)
        subtotal = float(stats.get('net_total', 0) or 0)
        shipping = float(stats.get('shipping_total', 0) or 0)
        if subtotal == 0: subtotal = total - shipping

    currency = str(m.get('_order_currency', 'EGP') or 'EGP')
    pm = str(m.get('_payment_method', 'cod') or 'cod').lower()
    mapped_pm = pm_map.get(pm, 'other')

    date_created = str(m.get('_completed_date', '') or m.get('_paid_date', '') or '').strip()
    customer_note = str(m.get('_customer_note', '') or '').strip()

    line_items = []
    items = order_products.get(oid_str, [])
    for item in items:
        pid = str(item['product_id'])
        name = product_names.get(pid, f'Product #{pid}')
        line_items.append({
            'product_id': int(pid) if pid.isdigit() else 0,
            'name': name,
            'sku': '',
            'quantity': item['qty'],
            'price': str(round(item['net_revenue'] / max(item['qty'], 1), 2)),
            'total': str(round(item['net_revenue'], 2)),
            'meta_data': []
        })

    # If no line items found
    if not line_items:
        line_items.append({
            'product_id': 0,
            'name': f'Order #{oid_str}',
            'sku': '',
            'quantity': 1,
            'price': str(total),
            'total': str(total),
            'meta_data': []
        })

    order_obj = {
        'id': int(oid_str),
        'wooCommerceId': oid_str,
        'orderNumber': oid_str,
        'billing': {
            'first_name': fn or f'Customer {oid_str}',
            'last_name': ln,
            'email': email or f'customer{oid_str}@swan.local',
            'phone': phone or '0000000000',
            'address_1': address,
            'city': city,
            'state': state
        },
        'shipping': {
            'first_name': fn or f'Customer {oid_str}',
            'last_name': ln,
            'address_1': address,
            'city': city,
            'state': state
        },
        'total': str(round(total, 2)),
        'subtotal': str(round(subtotal, 2)),
        'shipping_total': str(round(shipping, 2)),
        'discount_total': str(round(discount, 2)),
        'currency': currency,
        'payment_method': mapped_pm,
        'payment_method_title': pm,
        'date_created': date_created or '2020-01-01T00:00:00',
        'date_created_gmt': date_created or '2020-01-01T00:00:00',
        'status': raw_status,
        'customer_note': customer_note,
        'line_items': line_items,
        'meta_data': []
    }
    all_orders.append(order_obj)

print(f"Total orders with meta: {len(all_orders)}, skipped (no meta): {skipped_no_meta}", file=sys.stderr)

# Write batches
n_batches = (len(all_orders) + ORDERS_PER_BATCH - 1) // ORDERS_PER_BATCH
for batch_idx in range(n_batches):
    start = batch_idx * ORDERS_PER_BATCH
    end = min(start + ORDERS_PER_BATCH, len(all_orders))
    batch = all_orders[start:end]
    fname = f'woo_batch_{batch_idx+1:03d}_of_{n_batches:03d}.json'
    with open(os.path.join(BATCH_DIR, fname), 'w', encoding='utf8') as f:
        json.dump(batch, f, ensure_ascii=False)
    print(f"  Batch {batch_idx+1}/{n_batches}: {len(batch)} orders -> {fname}", file=sys.stderr)

print(f"\nDone! {len(all_orders)} orders in {n_batches} batches", file=sys.stderr)
print(f"Output: {BATCH_DIR}", file=sys.stderr)

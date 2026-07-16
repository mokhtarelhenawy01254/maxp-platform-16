import gzip, re, json, os, sys
from collections import defaultdict

USERPROFILE = os.environ['USERPROFILE']
SQL_GZ = os.path.join(USERPROFILE, 'Downloads', 'u339372869_cv6D7.20260715113030 (1).sql.gz')
OUT_DIR = os.path.join(USERPROFILE, 'Downloads', 'swan_export')
BATCH_DIR = os.path.join(OUT_DIR, 'woo_batches')
os.makedirs(BATCH_DIR, exist_ok=True)

ORDERS_PER_BATCH = 200
PRODUCT_POST_TYPES = {'product', 'product_variation'}

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

# Load order IDs
with open(os.path.join(OUT_DIR, 'stage1_ids.json')) as f:
    stage1 = json.load(f)
order_ids_set = set(stage1['order_ids'])
print(f"Order IDs: {len(order_ids_set)}", file=sys.stderr)

# Step 1: Extract product names AND order dates from wp_posts in a single pass
print("\nStep 1: Extracting product names and order dates from wp_posts...", file=sys.stderr)
product_names = {}
order_dates = {}  # order_id -> post_date_gmt
n_inserts = 0

with gzip.open(SQL_GZ, 'rt', encoding='utf8', errors='replace') as f:
    for raw_line in f:
        line = raw_line.strip()
        if not line: continue
        m = re.match(r"INSERT INTO `wp_posts` VALUES\s*(.*)", line)
        if not m: continue

        rest = m.group(1).strip()
        if rest.endswith(';'): rest = rest[:-1]
        rows = extract_insert_values(rest)
        n_inserts += 1

        for rr in rows:
            cols = parse_cols(rr)
            if len(cols) < 22: continue
            pid_str = cols[0].lstrip('(')
            if not pid_str.isdigit(): continue
            pid = int(pid_str)
            post_type = str(clean(cols[20]) or '')

            if post_type in PRODUCT_POST_TYPES:
                title = str(clean(cols[3]) or '')
                product_names[pid] = title
            elif post_type == 'shop_order' and str(pid) in order_ids_set:
                post_date_gmt = str(clean(cols[3]) or '')
                order_dates[str(pid)] = post_date_gmt

        if n_inserts % 10 == 0:
            print(f"  scanned {n_inserts} INSERT blocks, {len(product_names)} products, {len(order_dates)} order dates", file=sys.stderr)

title = f"{len(product_names)} products, {len(order_dates)} order dates"
print(f"Done: {title}", file=sys.stderr)

# Save product names
with open(os.path.join(OUT_DIR, 'product_names.json'), 'w', encoding='utf8') as f:
    json.dump(product_names, f, ensure_ascii=False)

# Step 2: Load supporting data
print("\nStep 2: Loading supporting data...", file=sys.stderr)

with open(os.path.join(OUT_DIR, 'order_stats.json')) as f:
    order_stats = json.load(f)
print(f"  order_stats: {len(order_stats)} entries", file=sys.stderr)

with open(os.path.join(OUT_DIR, 'product_lookup.json')) as f:
    product_lookup = json.load(f)
print(f"  product_lookup: {len(product_lookup)} items", file=sys.stderr)

# Index product_lookup by order_id
print("Indexing product lookup...", file=sys.stderr)
order_products = defaultdict(list)
for item in product_lookup:
    oid = str(item['order_id'])
    order_products[oid].append({
        'product_id': str(item['product_id']),
        'variation_id': str(item.get('variation_id', '0')),
        'qty': int(item.get('qty', 1)),
        'net_revenue': float(item.get('net_revenue', 0)),
        'gross_revenue': float(item.get('gross_revenue', 0))
    })

# Step 3: Process orders in memory-efficient batches
# Load postmeta in chunks
print("\nStep 3: Processing orders...", file=sys.stderr)

pm_map = {
    'cod': 'cod', 'cash': 'cod', 'bank_transfer': 'bacs',
    'credit_card': 'stripe', 'instapay': 'other', 'vodafone_cash': 'other'
}

batch = []
batch_idx = 0
total_processed = 0
skipped_no_meta = 0

with open(os.path.join(OUT_DIR, 'postmeta.json')) as f:
    postmeta = json.load(f)

# Sort order IDs numerically for consistent output
sorted_ids = sorted(order_ids_set, key=int)

for oid_str in sorted_ids:
    if oid_str not in postmeta:
        skipped_no_meta += 1
        continue

    m = postmeta[oid_str]

    # Customer info from billing
    fn = str(m.get('_billing_first_name', '') or '').strip()
    ln = str(m.get('_billing_last_name', '') or '').strip()
    phone = str(m.get('_billing_phone', '') or '').strip()
    email = str(m.get('_billing_email', '') or '').strip()
    address = str(m.get('_billing_address_1', '') or '').strip()
    city = str(m.get('_billing_city', '') or '').strip()
    state = str(m.get('_billing_state', '') or '').strip()

    # Status from order_stats
    stats_entry = order_stats.get(oid_str, {})
    raw_status = str(stats_entry.get('status', 'wc-pending') or 'wc-pending')
    if raw_status == 'None' or raw_status == '':
        raw_status = 'wc-pending'

    # Totals - prefer postmeta, fallback to order_stats
    total = float(m.get('_order_total', 0) or 0)
    shipping = float(m.get('_order_shipping', 0) or 0)
    discount = abs(float(m.get('_cart_discount', 0) or 0))

    # If total is 0, use stats
    if total == 0:
        total = float(stats_entry.get('total_sales', 0) or 0)
        shipping = float(stats_entry.get('shipping_total', 0) or 0)

    # Derive subtotal from net_total (stats) or compute from total
    net_total = float(stats_entry.get('net_total', 0) or 0)
    if net_total > 0:
        subtotal = net_total
    else:
        subtotal = total - shipping + discount

    currency = str(m.get('_order_currency', 'EGP') or 'EGP')
    pm = str(m.get('_payment_method', 'cod') or 'cod').lower()
    mapped_pm = pm_map.get(pm, 'other')

    # Date from order_stats or wp_posts
    date_str = str(stats_entry.get('date_paid', '') or stats_entry.get('date_completed', '') or '')
    if not date_str or date_str == 'None':
        date_str = order_dates.get(oid_str, '')
    if not date_str or date_str == 'None':
        date_str = '2020-01-01 00:00:00'

    # Format date for WooCommerce
    date_str = date_str.replace(' ', 'T')

    customer_note = str(m.get('_customer_note', '') or '').strip()

    # Line items from product_lookup
    line_items = []
    items = order_products.get(oid_str, [])
    for item in items:
        pid = item['product_id']
        name = product_names.get(pid, '')
        if not name:
            # Check if it's a variation - look for parent product
            name = f'Product #{pid}'

        net_rev = item['net_revenue']
        qty = item['qty']
        price = round(net_rev / max(qty, 1), 2) if net_rev > 0 else 0

        line_items.append({
            'product_id': int(pid) if pid.isdigit() else 0,
            'name': name,
            'sku': '',
            'quantity': qty,
            'price': str(price),
            'total': str(round(net_rev, 2)),
            'meta_data': []
        })

    if not line_items:
        line_items.append({
            'product_id': 0,
            'name': f'Order #{oid_str}',
            'sku': '',
            'quantity': 1,
            'price': str(round(total, 2)),
            'total': str(round(total, 2)),
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
            'address_2': str(m.get('_billing_address_2', '') or '').strip(),
            'city': city,
            'state': state
        },
        'shipping': {
            'first_name': str(m.get('_shipping_first_name', '') or fn or f'Customer {oid_str}').strip(),
            'last_name': str(m.get('_shipping_last_name', '') or ln).strip(),
            'address_1': str(m.get('_shipping_address_1', '') or address).strip(),
            'city': str(m.get('_shipping_city', '') or city).strip(),
            'state': str(m.get('_shipping_state', '') or state).strip()
        },
        'total': str(round(total, 2)),
        'subtotal': str(round(subtotal, 2)),
        'shipping_total': str(round(shipping, 2)),
        'discount_total': str(round(discount, 2)),
        'currency': currency,
        'payment_method': mapped_pm,
        'payment_method_title': pm,
        'date_created': date_str,
        'date_created_gmt': date_str,
        'status': raw_status,
        'customer_note': customer_note,
        'line_items': line_items,
        'meta_data': []
    }
    batch.append(order_obj)
    total_processed += 1

    if len(batch) >= ORDERS_PER_BATCH:
        batch_idx += 1
        fname = f'woo_batch_{batch_idx:04d}.json'
        with open(os.path.join(BATCH_DIR, fname), 'w', encoding='utf8') as f:
            json.dump(batch, f, ensure_ascii=False)
        print(f"  Batch {batch_idx}: {len(batch)} orders -> {fname}", file=sys.stderr)
        batch = []

# Write final batch
if batch:
    batch_idx += 1
    fname = f'woo_batch_{batch_idx:04d}.json'
    with open(os.path.join(BATCH_DIR, fname), 'w', encoding='utf8') as f:
        json.dump(batch, f, ensure_ascii=False)
    print(f"  Batch {batch_idx}: {len(batch)} orders -> {fname}", file=sys.stderr)

print(f"\nDone! {total_processed} orders processed, {skipped_no_meta} skipped (no meta)", file=sys.stderr)
print(f"Total batches: {batch_idx}", file=sys.stderr)
print(f"Output: {BATCH_DIR}", file=sys.stderr)

/**
 * Fix turboShipmentStatus on PRODUCTION via API
 * For orders that have order.status=DELIVERED but turboShipmentStatus='returned'
 */
const axios = require('./node_modules/axios');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = 'https://maxp.online/api/v1';

async function main() {
  // Login
  const lr = await axios.default.post(`${BASE}/auth/login`, { email: 'swan@h2m.com', password: '0165676135' });
  const token = lr.data.data?.token || lr.data.token;
  const headers = { Authorization: 'Bearer ' + token };
  console.log('✅ Logged in\n');

  // Get ALL turbo records
  let all = [];
  for (let p = 1; p <= 5; p++) {
    const r = await axios.default.get(`${BASE}/turbo/records?limit=200&page=${p}`, { headers });
    const recs = r.data?.data || [];
    if (!recs.length) break;
    all = all.concat(recs);
    if (recs.length < 200) break;
  }
  console.log('Total records:', all.length);

  // Find mismatched: order.status=DELIVERED but turboShipmentStatus != 'delivered'
  const mismatched = all.filter(r => r.status === 'DELIVERED' && r.turboShipmentStatus !== 'delivered');
  console.log('Mismatched (DELIVERED but turboShipmentStatus != delivered):', mismatched.length);
  mismatched.forEach(r => console.log('  ' + r.orderNumber + ' | turboStatus: ' + r.turboShipmentStatus));

  if (mismatched.length === 0) {
    console.log('\n✅ No fixes needed!');
    return;
  }

  // Fix each one using the turbo sync endpoint with a direct DB update
  // We'll use a PATCH to the order directly via orders API
  console.log('\nFixing...');
  let fixed = 0, failed = 0;

  for (const order of mismatched) {
    process.stdout.write(order.orderNumber + '... ');
    try {
      // Use the order update endpoint to set turboShipmentStatus
      const r = await axios.default.patch(
        `${BASE}/orders/${order.id}`,
        { turboShipmentStatus: 'delivered' },
        { headers, timeout: 10000 }
      );
      if (r.data?.success) {
        console.log('✅');
        fixed++;
      } else {
        // Try alternative endpoint
        const r2 = await axios.default.put(
          `${BASE}/orders/${order.id}`,
          { turboShipmentStatus: 'delivered' },
          { headers, timeout: 10000 }
        );
        console.log(r2.data?.success ? '✅ (PUT)' : '⚠️');
        if (r2.data?.success) fixed++;
      }
    } catch (e) {
      // Try sync with force
      try {
        const r3 = await axios.default.post(
          `${BASE}/turbo/orders/${order.id}/sync-status`,
          {},
          { headers, timeout: 15000 }
        );
        console.log('🔄 synced → ' + (r3.data?.data?.turboShipmentStatus || '?'));
        fixed++;
      } catch (e2) {
        console.log('❌ ' + (e.response?.status || e.message));
        failed++;
      }
    }
    await sleep(300);
  }

  console.log('\n=== DONE ===');
  console.log('Fixed:', fixed, '| Failed:', failed);

  // Verify
  let allAfter = [];
  for (let p = 1; p <= 5; p++) {
    const r = await axios.default.get(`${BASE}/turbo/records?limit=200&page=${p}`, { headers });
    const recs = r.data?.data || [];
    if (!recs.length) break;
    allAfter = allAfter.concat(recs);
    if (recs.length < 200) break;
  }
  const turboStatusCounts = {};
  allAfter.forEach(r => { turboStatusCounts[r.turboShipmentStatus || 'null'] = (turboStatusCounts[r.turboShipmentStatus || 'null'] || 0) + 1; });
  console.log('\nFinal turboShipmentStatus counts:');
  Object.entries(turboStatusCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
}

main().catch(e => console.error('Fatal:', e.message));

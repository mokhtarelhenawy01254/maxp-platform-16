const axios = require('axios');
const fs = require('fs');
const path = require('path');

const api = axios.create({
  baseURL: 'https://maxp.online/api/v1',
  headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgzNzU4MTQyLCJleHAiOjE3ODM3ODY5NDJ9.0muVvWmWhy2PrBf8J2FHQUWkF5gTQEe5KCvkyIwbj1I', 'Content-Type': 'application/json' },
  timeout: 30000
});

const PENDING_FILE = path.join(__dirname, 'swan-pending-ids.json');

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url, params, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try { return await api.get(url, { params }); }
    catch (err) {
      if (i < retries - 1) { console.log(`  Retry ${i + 1}...`); await delay(3000); }
      else throw err;
    }
  }
}

async function scanPhase() {
  const swanOrders = new Set();
  const data = fs.readFileSync(path.join(__dirname, 'swan-import-log.csv'), 'utf8').trim().split('\n').slice(1);
  for (const line of data) {
    const parts = line.split(',');
    if (parts[3] === 'return_created') swanOrders.add(parts[2]);
  }
  console.log('Swan orders to match:', swanOrders.size);

  // Load existing progress
  let existing = new Set();
  if (fs.existsSync(PENDING_FILE)) {
    existing = new Set(JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')));
    console.log('Recovered', existing.size, 'from previous scan');
  }

  // get total pages
  const first = await get('/returns/requests', { page: 1 });
  const totalPages = first.data.totalPages || Math.ceil(first.data.total / first.data.data.length);
  console.log('Total pages:', totalPages);

  let newIds = [...existing];
  for (let page = totalPages; page >= 1; page--) {
    const res = await get('/returns/requests', { page });
    const items = res.data?.data || [];
    let found = 0;
    for (const item of items) {
      if (item.status === 'PENDING' && swanOrders.has(item.order?.orderNumber) && !existing.has(item.id)) {
        newIds.push(item.id);
        existing.add(item.id);
        found++;
      }
    }
    if (newIds.length % 500 === 0) {
      fs.writeFileSync(PENDING_FILE, JSON.stringify(newIds));
    }
    console.log(`  Page ${page}: ${found} new (total: ${newIds.length})`);
    if (items.length === 0) break;
    await delay(200);
  }

  fs.writeFileSync(PENDING_FILE, JSON.stringify(newIds));
  console.log('\nSaved', newIds.length, 'IDs');
  return newIds;
}

async function approvePhase(ids) {
  console.log('\n=== Approving', ids.length, 'returns ===');
  const approvedFile = path.join(__dirname, 'swan-approved-ids.json');
  let alreadyDone = new Set();
  if (fs.existsSync(approvedFile)) {
    alreadyDone = new Set(JSON.parse(fs.readFileSync(approvedFile, 'utf8')));
    console.log('Already approved:', alreadyDone.size);
  }

  let ok = 0, fail = 0;
  for (const id of ids) {
    if (alreadyDone.has(id)) { ok++; continue; }
    let success = false;
    for (let retry = 0; retry < 2 && !success; retry++) {
      try {
        await api.put('/returns/requests/' + id, { status: 'APPROVED', isReviewed: true });
        success = true;
      } catch (err) {
        if (retry < 1) { await delay(300); continue; }
        else {
          if (fail < 5) console.error('  Fail:', id, err.response?.status, (err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : err.message));
          fail++;
        }
      }
    }
    if (success) {
      ok++;
      alreadyDone.add(id);
      if (ok % 500 === 0) {
        fs.writeFileSync(approvedFile, JSON.stringify([...alreadyDone]));
        console.log(`  ${ok}/${ids.length} (fail: ${fail})`);
      }
    }
    await delay(50);
  }

  fs.writeFileSync(approvedFile, JSON.stringify([...alreadyDone]));
  console.log(`\nDone! Approved: ${ok}, Failed: ${fail}`);
  try { fs.unlinkSync(PENDING_FILE); } catch (e) {}
}

async function main() {
  const mode = process.argv[2] || 'full';
  let ids;
  if (mode === 'approve' && fs.existsSync(PENDING_FILE)) {
    ids = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    console.log('Loaded', ids.length, 'IDs from saved file');
  } else {
    ids = await scanPhase();
  }
  if (ids.length === 0) { console.log('Nothing to approve.'); return; }
  await approvePhase(ids);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

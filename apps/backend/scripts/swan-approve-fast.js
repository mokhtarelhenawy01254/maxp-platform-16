const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxleWJwZzIwMDJianVvMm00NHk0a2lwIiwiZW1haWwiOiJzd2FuQGgybS5jb20iLCJyb2xlIjoiT1dORVIiLCJjb21wYW55SWQiOiJjbWxleWJwZjcwMDI4anVvMnd3cG1wOHJ0IiwiaWF0IjoxNzgzNzU4MTQyLCJleHAiOjE3ODM3ODY5NDJ9.0muVvWmWhy2PrBf8J2FHQUWkF5gTQEe5KCvkyIwbj1I';
const api = axios.create({
  timeout: 30000,
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
});

async function approveOne(id, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await api.put(`https://maxp.online/api/v1/returns/requests/${id}`, { status: 'APPROVED', isReviewed: true });
      return 'ok';
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
      else return e.message;
    }
  }
}

(async () => {
  const pending = JSON.parse(fs.readFileSync(path.join(__dirname, 'swan-pending-ids.json'), 'utf8'));
  const approvedFile = path.join(__dirname, 'swan-approved-ids.json');
  let done = new Set(fs.existsSync(approvedFile) ? JSON.parse(fs.readFileSync(approvedFile, 'utf8')) : []);
  const remaining = pending.filter(id => !done.has(id));
  console.log(`Total: ${pending.length}, Done: ${done.size}, Remaining: ${remaining.length}`);

  let ok = 0, fail = 0;
  const CONCURRENCY = 5;

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const batch = remaining.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(id => approveOne(id)));

    for (let j = 0; j < results.length; j++) {
      if (results[j] === 'ok') { ok++; done.add(batch[j]); }
      else { fail++; }
    }

    if ((ok + fail) % 1000 === 0 || i + CONCURRENCY >= remaining.length) {
      fs.writeFileSync(approvedFile, JSON.stringify([...done]));
      console.log(`${ok + fail}/${remaining.length} ok:${ok} fail:${fail}`);
    }
  }

  fs.writeFileSync(approvedFile, JSON.stringify([...done]));
  console.log(`\nDone! Approved: ${ok}, Failed: ${fail}`);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

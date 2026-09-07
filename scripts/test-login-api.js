const https = require('https');

function tryLogin(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    const req = https.request('https://maxp.online/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.write(data);
    req.end();
  });
}

async function run() {
  const credentials = [
    ['alpha@h2m.com', '123456'],
    ['alpha@h2m.com', 'admin123'],
    ['demo@example.com', 'admin123'],
    ['admin@example.com', 'admin123']
  ];

  for (const [email, pass] of credentials) {
    console.log(`Trying ${email} / ${pass}...`);
    const res = await tryLogin(email, pass);
    console.log(`Result (${res.status}):`, res.data?.success ? "SUCCESS" : JSON.stringify(res.data || res.body));
    if (res.data?.success) {
      console.log("Token:", res.data.token || res.data.accessToken);
      console.log("User:", res.data.user);
      break;
    }
  }
}

run();

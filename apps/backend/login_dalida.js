const http = require('http');

const data = JSON.stringify({
  email: 'dalida@gmail.com',
  password: '123' // wait, password is 3132003
});

const req = http.request('http://localhost:5000/api/v1/auth/login', {
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
      if (json.token) {
        const payload = Buffer.from(json.token.split('.')[1], 'base64').toString();
        console.log("Token payload:", JSON.stringify(JSON.parse(payload), null, 2));
      } else {
        console.log("Response:", body);
      }
    } catch (e) {
      console.log("Raw response:", body);
    }
  });
});

req.write(JSON.stringify({
  email: 'dalida@gmail.com',
  password: '3132003'
}));
req.end();

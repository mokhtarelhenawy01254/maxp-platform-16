const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Client Ready');
  const cmd = `
    echo "=== Clearing Redis Cache ===" &&
    redis-cli FLUSHALL &&
    echo "=== PM2 Restart ===" &&
    pm2 restart all &&
    echo "=== Nginx Test & Reload ===" &&
    nginx -t && systemctl reload nginx &&
    echo "=== Checking live bundle hash ===" &&
    curl -s https://fiore.maxp.online/product/mlabs-nsaeyh-1788425645 | grep -o 'assets/index-[^"]*' | head -n 5
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err.message);
}).connect({
  host: '153.92.223.119',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('C:\\Users\\shrou\\.ssh\\id_ed25519_maxp'),
  passphrase: 'Mokhtar1234@#'
});

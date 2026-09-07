const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Client Ready!');
  conn.exec('uptime && pm2 list', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '153.92.223.119',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('C:\\Users\\shrou\\.ssh\\id_ed25519_maxp'),
  passphrase: 'Mokhtar1234@#'
});

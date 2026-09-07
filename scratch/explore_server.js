const { Client } = require('ssh2');
const fs = require('fs');
const c = new Client();
c.on('ready', () => {
  const cmd = `
echo CONNECTED_AS $(whoami)
echo HOST $(hostname)
echo "--- apps dir ---"
ls -la /var/www 2>/dev/null; ls -la /root 2>/dev/null | head -30
echo "--- find app ---"
find / -maxdepth 4 -name 'ecosystem.config.js' 2>/dev/null | head
echo "--- pm2 ---"
pm2 list 2>/dev/null || echo no-pm2
`;
  c.exec(cmd, (e, s) => {
    if (e) throw e;
    s.on('close', (co) => c.end()).on('data', (d) => console.log(d.toString())).stderr.on('data', (d) => console.error('ERR', d.toString()));
  });
}).on('error', (e) => console.error('SSH_ERR', e.message)).connect({
  host: '153.92.223.119', port: 22, username: 'root',
  privateKey: fs.readFileSync('C:\\Users\\shrou\\.ssh\\id_ed25519_maxp'),
  passphrase: 'Mokhtar1234@#'
});

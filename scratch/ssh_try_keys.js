const { Client } = require('ssh2');
const fs = require('fs');
const keys = ['id_ed25519_no_pass','id_ed25519','id_ed25519_temp'];
function tryKey(k) {
  return new Promise((resolve) => {
    const c = new Client();
    let done = false;
    const finish = (msg) => { if(!done){done=true; console.log(k, '->', msg); resolve();} };
    c.on('ready', () => { c.exec('echo OK_'+k+'_'+(process.env.H||''), (e,s)=>{ if(e){finish('exec_err '+e.message);return;} s.on('data',d=>{console.log(d.toString()); finish('connected'); c.end();}); s.on('close',()=>finish('closed')); s.stderr.on('data',d=>console.error(d.toString())); }); });
    c.on('error', (e) => finish('ERR ' + e.message));
    try {
      c.connect({ host: process.env.HOST||'153.92.223.119', port: 22, username: 'root', privateKey: fs.readFileSync('C:\\Users\\shrou\\.ssh\\'+k) });
    } catch(e) { finish('connect_exc '+e.message); }
    setTimeout(()=>finish('timeout'), 12000);
  });
}
(async () => { for (const k of keys) await tryKey(k); })();

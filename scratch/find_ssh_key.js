const { Client } = require('ssh2');
const fs = require('fs');

const keys = ['id_ed25519', 'id_ed25519_maxp', 'id_ed25519_no_pass', 'id_ed25519_temp'];
const passphrases = ['', 'Mokhtar1234@#', 'mokhtar1234', 'Mokhtar1234', '0165676135Aa@A', '0165676135Aa%40A'];
const hosts = ['153.92.223.119', 'srv974554.hstgr.cloud'];

async function test(host, keyFile, passphrase) {
  return new Promise((resolve) => {
    const conn = new Client();
    let done = false;
    const finish = (msg) => {
      if (!done) {
        done = true;
        conn.end();
        resolve(msg);
      }
    };
    conn.on('ready', () => {
      finish(`SUCCESS! Host: ${host}, Key: ${keyFile}, Pass: ${passphrase}`);
    }).on('error', (err) => {
      finish(`Fail: ${keyFile} / ${passphrase} -> ${err.message}`);
    });

    try {
      const opts = {
        host,
        port: 22,
        username: 'root',
        privateKey: fs.readFileSync(`C:\\Users\\shrou\\.ssh\\${keyFile}`)
      };
      if (passphrase) opts.passphrase = passphrase;
      conn.connect(opts);
    } catch (e) {
      finish(`Error reading: ${e.message}`);
    }
    setTimeout(() => finish(`Timeout: ${keyFile}`), 3000);
  });
}

async function main() {
  for (const host of hosts) {
    for (const key of keys) {
      for (const pass of passphrases) {
        const res = await test(host, key, pass);
        if (res.startsWith('SUCCESS')) {
          console.log('\n========================================');
          console.log(res);
          console.log('========================================\n');
          return;
        } else {
          console.log(res);
        }
      }
    }
  }
}

main();

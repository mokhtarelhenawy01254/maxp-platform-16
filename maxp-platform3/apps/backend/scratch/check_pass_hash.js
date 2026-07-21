const bcrypt = require('bcryptjs');
const hash = '$2b$10$rT.zE4WJJQ6H/ltfHBLb0uCINE1rrwulpNVYSyH4IUIEgveOpQTEC';
const passwords = ['123456', 'admin', 'admin123', 'password', 'maxp123456'];

async function check() {
    for (const p of passwords) {
        const match = await bcrypt.compare(p, hash);
        if (match) {
            console.log(`Match found! Password is: ${p}`);
            return;
        }
    }
    console.log('No match found in common list.');
}

check();

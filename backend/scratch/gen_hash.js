const bcrypt = require('bcryptjs');
const password = 'admin123';

async function main() {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
}

main();

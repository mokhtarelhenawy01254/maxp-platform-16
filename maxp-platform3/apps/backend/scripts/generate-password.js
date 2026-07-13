const bcrypt = require('bcryptjs');

async function generatePassword() {
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hashed Password:', hashedPassword);
}

generatePassword();

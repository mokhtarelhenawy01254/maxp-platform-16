const jwt = require('jsonwebtoken');
require('dotenv').config();

const payload = {
    userId: 'cmlcatkrn0003vb70hp1j86zv', // From the logs
    email: 'shrouk9@gmail.com',
    role: 'OWNER',
    companyId: 'cmlcatkmn0000vb70t1k03jpd'
};

const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production', { expiresIn: '1h' });
console.log(token);
process.exit(0);

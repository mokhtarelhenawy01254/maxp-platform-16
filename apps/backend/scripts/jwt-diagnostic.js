const jwt = require('jsonwebtoken');
require('dotenv').config();

const secretFromEnv = process.env.JWT_SECRET;
const fallbackSecret = 'your-super-secret-jwt-key-change-in-production';

console.log('--- JWT Secret Diagnostic ---');
console.log('Secret from process.env:', secretFromEnv ? `"${secretFromEnv}"` : 'UNDEFINED');
console.log('Fallback secret:', `"${fallbackSecret}"`);

const payload = { userId: 'test-user', companyId: 'test-company', role: 'ADMIN' };

// Test 1: Sign with env, verify with env (what auth.js does)
try {
    const token = jwt.sign(payload, secretFromEnv, { expiresIn: '1h' });
    jwt.verify(token, secretFromEnv);
    console.log('✅ Test 1: Sign(Env) -> Verify(Env) passed');
} catch (e) {
    console.log('❌ Test 1: Sign(Env) -> Verify(Env) failed:', e.message);
}

// Test 2: Sign with env, verify with fallback (what verifyToken.js might do if env is missing)
try {
    const token = jwt.sign(payload, secretFromEnv, { expiresIn: '1h' });
    jwt.verify(token, fallbackSecret);
    console.log('✅ Test 2: Sign(Env) -> Verify(Fallback) passed');
} catch (e) {
    console.log('❌ Test 2: Sign(Env) -> Verify(Fallback) failed:', e.message);
}

// Test 3: Check for quotes in string
if (secretFromEnv && (secretFromEnv.startsWith('"') || secretFromEnv.endsWith('"'))) {
    console.log('⚠️  WARNING: JWT_SECRET in process.env contains literal quotes!');
} else {
    console.log('✅ JWT_SECRET in process.env does not contain literal quotes.');
}

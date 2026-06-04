const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();

        const email = 'shrouk9@gmail.com';
        const newPassword = '3132003';

        // Hash the new password
        const hashed = await bcrypt.hash(newPassword, 10);

        // Check current user
        const check = await client.query('SELECT id, email, password FROM "users" WHERE email = $1', [email]);
        if (check.rows.length === 0) {
            console.log('❌ User not found:', email);
            return;
        }

        console.log('✅ User found:', check.rows[0].id, check.rows[0].email);

        // Update password
        const result = await client.query(
            'UPDATE "users" SET password = $1 WHERE email = $2 RETURNING id, email',
            [hashed, email]
        );

        console.log('✅ Password updated successfully for:', result.rows[0].email);
        console.log('   New password:', newPassword);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

main();

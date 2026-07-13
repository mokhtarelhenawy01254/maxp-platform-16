const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const NEW_PASSWORD = 'mokhtar2026';
const TARGET_EMAIL = 'admin@mokhtarelhenawy.com';

async function main() {
    console.log('Connecting to production MySQL...');
    const connection = await mysql.createConnection({
        host: '92.113.22.70',
        user: 'u339372869_test2',
        password: '0165676135Aa@A',
        database: 'u339372869_test2',
        connectTimeout: 30000
    });
    console.log('Connected.');

    // Search for the exact email
    const [rows] = await connection.execute(
        'SELECT id, email, firstName, lastName, role, isActive FROM users WHERE email = ?',
        [TARGET_EMAIL]
    );

    if (rows.length === 0) {
        console.log(`\nEmail "${TARGET_EMAIL}" NOT FOUND in production database.\n`);

        // Show all SUPER_ADMIN users
        const [admins] = await connection.execute(
            'SELECT id, email, firstName, lastName, role, isActive FROM users WHERE role = ?',
            ['SUPER_ADMIN']
        );
        console.log('All SUPER_ADMIN accounts in production:');
        admins.forEach(u => console.log(`  ${u.email} (${u.firstName} ${u.lastName})`));
        await connection.end();
        return;
    }

    const user = rows[0];
    console.log(`Found: ${user.email} | Role: ${user.role} | Active: ${user.isActive}`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log('New hash generated.');

    // Update password
    const [result] = await connection.execute(
        'UPDATE users SET password = ?, passwordChangedAt = NOW() WHERE email = ?',
        [hashedPassword, TARGET_EMAIL]
    );

    if (result.affectedRows === 1) {
        console.log(`\nPassword updated successfully for ${TARGET_EMAIL}\nNew password: ${NEW_PASSWORD}`);

        // Verify
        const [verify] = await connection.execute(
            'SELECT password FROM users WHERE email = ?',
            [TARGET_EMAIL]
        );
        const match = await bcrypt.compare(NEW_PASSWORD, verify[0].password);
        console.log(`Verification: ${match ? 'PASS' : 'FAIL'}`);
    } else {
        console.log('Update failed - no rows affected.');
    }

    await connection.end();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production.fixed') });

async function searchRemoteMySQL() {
    console.log('🔍 Connecting to remote MySQL:', '92.113.22.70');

    let connection;
    try {
        // Use the credentials from .env.production.fixed
        connection = await mysql.createConnection({
            host: '92.113.22.70',
            user: 'u339372869_test2',
            password: '0165676135Aa@A',
            database: 'u339372869_test2'
        });

        const email = 'h2m@maxpi.com';
        console.log('🔍 Searching for:', email);

        // Search in all likely tables
        const tables = ['users', 'User', 'hr_employees', 'Employee', 'customers', 'Customer'];

        for (const table of tables) {
            try {
                const [rows] = await connection.execute(`SELECT * FROM ${table} WHERE LOWER(email) = LOWER(?)`, [email]);
                if (rows.length > 0) {
                    console.log(`✅ Found in ${table} table:`);
                    console.log(JSON.stringify(rows[0], null, 2));
                    return;
                } else {
                    console.log(`❌ Not found in ${table}`);
                }
            } catch (e) {
                // table might not exist
            }
        }

        // If not found, list some users to see what's in there
        try {
            const [users] = await connection.execute('SELECT id, email FROM users LIMIT 10');
            console.log('Sample users in remote DB:');
            console.table(users);
        } catch (e) { }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

searchRemoteMySQL();

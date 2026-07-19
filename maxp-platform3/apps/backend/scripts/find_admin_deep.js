const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: '92.113.22.70',
        user: 'u339372869_test2',
        password: '0165676135Aa@A',
        database: 'u339372869_test2',
        connectTimeout: 30000
    });

    const email = 'admin@mokhtarelhenawy.com';

    // Get ALL tables
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`Searching ${tableNames.length} tables for "${email}"...\n`);

    for (const table of tableNames) {
        // Get columns for this table
        const [cols] = await connection.execute('SHOW COLUMNS FROM ??', [table]);
        
        // Find text-like columns
        const textCols = cols.filter(c => {
            const type = c.Type.toLowerCase();
            return type.includes('varchar') || type.includes('text') || type.includes('char') || type.includes('email');
        });

        if (textCols.length === 0) continue;

        // Build WHERE clause: col1 LIKE ? OR col2 LIKE ? ...
        const conditions = textCols.map(c => `\`${c.Field}\` = ?`).join(' OR ');
        const params = textCols.map(() => email);

        try {
            const [rows] = await connection.execute(
                `SELECT * FROM \`${table}\` WHERE ${conditions} LIMIT 5`,
                params
            );
            if (rows.length > 0) {
                console.log(`FOUND in table "${table}":`);
                console.log(JSON.stringify(rows[0], null, 2));
                console.log();
            }
        } catch(e) {
            // Skip tables with issues
        }
    }

    // Also search with LIKE
    console.log('\n--- LIKE search across users table ---');
    const [likeRows] = await connection.execute(
        "SELECT * FROM users WHERE email LIKE ? OR email LIKE ? OR email LIKE ?",
        ['%mokhtarelhenawy%', '%admin%@%mokhtar%', 'admin@mokhtarelhenawy%']
    );
    likeRows.forEach(r => console.log(r.email, '-', r.role));

    await connection.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

const { Client } = require('pg');
async function main() {
    const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });
    await client.connect();
    const res = await client.query(`
        SELECT email, "firstName", "lastName", role 
        FROM users 
        WHERE "firstName" ILIKE '%shrouk%' 
           OR "lastName" ILIKE '%shrouk%' 
           OR email ILIKE '%shrouk%'
    `);
    console.log('Search results in max:');
    console.table(res.rows);
    await client.end();

    const clientP = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });
    try {
        await clientP.connect();
        const resP = await clientP.query(`
            SELECT email, "firstName", "lastName", role 
            FROM users 
            WHERE "firstName" ILIKE '%shrouk%' 
               OR "lastName" ILIKE '%shrouk%' 
               OR email ILIKE '%shrouk%'
        `);
        console.log('Search results in maxp:');
        console.table(resP.rows);
    } catch (e) {
        console.log('maxp check failed (likely no users table):', e.message);
    } finally {
        await clientP.end();
    }
}
main();

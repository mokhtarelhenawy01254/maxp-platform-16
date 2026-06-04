const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT u.email, u."firstName", u."lastName", c.name as "companyName", u."lastLoginAt"
            FROM "users" u
            LEFT JOIN "companies" c ON u."companyId" = c.id
            ORDER BY u."lastLoginAt" DESC NULLS LAST
        `);
        console.log('ALL USERS by Last Login:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();

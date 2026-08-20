const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' });
async function main() {
    const res = await pool.query(`
        SELECT id, "companyId", status, "phoneNumber", "metaPhoneNumberId", "metaWabaId", "metaDisplayPhoneNumber",
               "authState" IS NOT NULL as has_auth,
               LENGTH(COALESCE("authState"::text, '')) as auth_state_length,
               "createdAt", "updatedAt"
        FROM whatsapp_sessions
        WHERE "phoneNumber" LIKE '%201505129931%' OR "metaDisplayPhoneNumber" LIKE '%201505129931%'
    `);
    console.log('Sessions found:', res.rows.length);
    res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
    if (res.rows.length === 0) {
        const all = await pool.query(`
            SELECT id, "companyId", status, "phoneNumber", "metaDisplayPhoneNumber", "updatedAt"
            FROM whatsapp_sessions ORDER BY "updatedAt" DESC LIMIT 20
        `);
        console.log('\nRecent sessions:');
        all.rows.forEach(r => console.log(JSON.stringify(r)));
    }
    await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });

const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function deepSearch() {
    const client = new Client({ connectionString: process.env.POSTGRES_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM users");
        console.log('Total users:', res.rowCount);
        res.rows.forEach(user => {
            console.log(`User: ${user.id} | Email: ${user.email} | Name: ${user.firstName} ${user.lastName}`);
        });

        const res2 = await client.query("SELECT * FROM hr_employees");
        console.log('Total hr_employees:', res2.rowCount);
        res2.rows.forEach(emp => {
            console.log(`Employee: ${emp.id} | Email: ${emp.email} | Name: ${emp.firstName} ${emp.lastName}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

deepSearch();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const fs = require('fs');

async function main() {
    console.log('🚀 Starting RLS Hardening Deployment...');

    const prisma = await getSharedPrismaClientAsync();
    const sqlPath = path.join(__dirname, 'apply_rls_v1.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('📡 Executing RLS SQL Script...');

        // Simple split by semicolon for the inlined script
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`📝 Total statements to execute: ${statements.length}`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);
            await prisma.$executeRawUnsafe(statement);
        }

        console.log('✅ RLS Policies applied successfully!');
    } catch (error) {
        console.error('❌ Failed to apply RLS policies:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();

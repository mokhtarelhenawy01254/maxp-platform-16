const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function diagnoseRLS() {
    const prisma = await getSharedPrismaClientAsync();

    console.log('🔍 Diagnosing RLS Configuration...');

    try {
        // 1. Check if RLS is enabled on 'customers' table
        const rlsStatus = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('customers', 'orders', 'products')
    `;
        console.log('📋 Table RLS Status:', rlsStatus);

        // 2. Check Policies on 'customers'
        const policies = await prisma.$queryRaw`
      SELECT polname, polpermissive, polcmd, polroles
      FROM pg_policy 
      JOIN pg_class ON pg_policy.polrelid = pg_class.oid
      WHERE pg_class.relname = 'customers'
    `;
        console.log('🛡️  Policies on customers:', policies);

        // 3. Check Current User and Privileges
        const currentUser = await prisma.$queryRaw`SELECT current_user, session_user`;
        console.log('👤 Current User:', currentUser);

        const roles = await prisma.$queryRaw`
      SELECT rolname, rolbypassrls, rolsuper 
      FROM pg_roles 
      WHERE rolname = current_user
    `;
        console.log('🔑 Role Attributes:', roles);

    } catch (error) {
        console.error('❌ Diagnosis Failed:', error);
    } finally {
        process.exit(0);
    }
}

diagnoseRLS();

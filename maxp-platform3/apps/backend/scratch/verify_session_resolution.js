const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('--- Testing WhatsApp Session Resolution ---');
        
        // 1. Check all sessions
        const sessions = await prisma.whatsAppSession.findMany({
            select: { id: true, status: true, companyId: true, name: true }
        });
        
        if (sessions.length === 0) {
            console.log('No sessions found. Test aborted.');
            return;
        }

        const companyId = sessions[0].companyId;
        console.log(`Target Company ID: ${companyId}`);

        // 2. Simulate "all" resolution logic added to controller
        console.log('\nResolving "all" session...');
        
        const activeSession = await prisma.whatsAppSession.findFirst({
            where: {
                companyId: companyId,
                status: 'CONNECTED'
            }
        });

        if (activeSession) {
            console.log(`✅ SUCCESS: Resolved "all" to CONNECTED session: ${activeSession.id} (${activeSession.name})`);
        } else {
            console.log('⚠️ No CONNECTED session found. Fallback to first session...');
            const fallbackSession = await prisma.whatsAppSession.findFirst({
                where: { companyId: companyId }
            });
            if (fallbackSession) {
                console.log(`✅ SUCCESS: Resolved "all" to fallback session: ${fallbackSession.id} (${fallbackSession.name})`);
            } else {
                console.log('❌ FAILED: No sessions found for this company.');
            }
        }

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();

const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('--- Database Diagnostic ---');
        
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });
        console.log(`Found ${companies.length} companies:`, companies);

        const sessions = await prisma.whatsAppSession.findMany();
        console.log(`Found ${sessions.length} WhatsApp sessions:`);
        sessions.forEach(s => {
            console.log(` - ID: ${s.id}, Name: ${s.name}, Status: ${s.status}, Company: ${s.companyId}`);
        });

        if (sessions.length > 0) {
            const companyId = sessions[0].companyId;
            console.log(`\nTesting resolution for company: ${companyId}`);
            
            const activeSession = await prisma.whatsAppSession.findFirst({
                where: { companyId, status: 'CONNECTED' }
            });
            
            console.log('Result for "all" resolution:', activeSession ? `Resolved to ${activeSession.id}` : 'No CONNECTED session found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();

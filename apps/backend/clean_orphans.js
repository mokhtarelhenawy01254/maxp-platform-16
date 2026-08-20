const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function clean() {
    try {
        console.log("Cleaning orphaned rows in conversion_events...");
        const cleanedEvents = await prisma.$executeRawUnsafe(
            'DELETE FROM conversion_events WHERE "companyId" NOT IN (SELECT id FROM companies)'
        );
        console.log(`Cleaned ${cleanedEvents} orphaned records from conversion_events.`);

        console.log("Cleaning orphaned rows in app_usage_logs...");
        const cleanedLogs = await prisma.$executeRawUnsafe(
            'DELETE FROM app_usage_logs WHERE "companyAppId" NOT IN (SELECT id FROM company_apps)'
        );
        console.log(`Cleaned ${cleanedLogs} orphaned records from app_usage_logs.`);

        console.log("Cleaning orphaned rows in messages...");
        const cleanedMessages = await prisma.$executeRawUnsafe(
            'DELETE FROM messages WHERE "conversationId" NOT IN (SELECT id FROM conversations)'
        );
        console.log(`Cleaned ${cleanedMessages} orphaned records from messages.`);

        console.log("Cleaning orphaned rows in store_visits...");
        const cleanedVisits = await prisma.$executeRawUnsafe(
            'DELETE FROM store_visits WHERE "companyId" NOT IN (SELECT id FROM companies)'
        );
        console.log(`Cleaned ${cleanedVisits} orphaned records from store_visits.`);

        console.log("Cleaning orphaned rows in order_workflow_configs...");
        const cleanedWorkflows = await prisma.$executeRawUnsafe(
            'DELETE FROM order_workflow_configs WHERE "companyId" NOT IN (SELECT id FROM companies)'
        );
        console.log(`Cleaned ${cleanedWorkflows} orphaned records from order_workflow_configs.`);

        console.log("Cleaning orphaned rows in order_status_definitions...");
        const cleanedStatuses = await prisma.$executeRawUnsafe(
            'DELETE FROM order_status_definitions WHERE "companyId" NOT IN (SELECT id FROM companies)'
        );
        console.log(`Cleaned ${cleanedStatuses} orphaned records from order_status_definitions.`);

        process.exit(0);
    } catch (e) {
        console.error("Error cleaning database:", e);
        process.exit(1);
    }
}

clean();

const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  const sessionId = '1780338730217_6yzqbp';
  console.log(`--- TELEMETRY FOR SESSION ${sessionId} ---`);
  
  try {
    // 1. Fetch provider logs
    const providerLogs = await prisma.aiProviderLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    console.log(`Found ${providerLogs.length} provider logs:`);
    for (const log of providerLogs) {
      console.log(`[${log.createdAt.toISOString()}] ${log.action} | Status: ${log.status} | Latency: ${log.latencyMs}ms`);
      console.log(`Model: ${log.model} | Provider: ${log.provider}`);
      console.log(`Message: ${log.message?.slice(0, 300)}`);
      console.log(`Metadata: ${log.metadata}`);
      console.log('----------------------------------------');
    }

    // 2. Fetch failure logs
    const failureLogs = await prisma.aiFailureLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    console.log(`Found ${failureLogs.length} failure logs:`);
    for (const log of failureLogs) {
      console.log(`[${log.createdAt.toISOString()}] Error Type: ${log.errorType}`);
      console.log(`Error Message: ${log.errorMessage}`);
      console.log(`Context: ${log.context?.slice(0, 300)}`);
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

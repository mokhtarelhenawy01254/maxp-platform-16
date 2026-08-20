const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function check() {
  try {
    const tables = await getSharedPrismaClient().$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const names = tables.map(t => t.table_name).sort();
    console.log(names.join('\n'));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
check();

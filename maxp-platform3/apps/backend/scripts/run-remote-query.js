const { execFileSync } = require('child_process');

const remoteScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.company.findMany({
    where: { name: { contains: 'علاج' } },
    select: { id: true, name: true }
  });
  console.log('COMPANIES:', JSON.stringify(companies, null, 2));

  for (const c of companies) {
    const users = await prisma.user.findMany({
      where: { companyId: c.id },
      select: { id: true, email: true, role: true }
    });
    console.log(\`USERS FOR \${c.name}:\`, JSON.stringify(users, null, 2));
    
    // Also fetch their active agents
    const agents = await prisma.companyAgent.findMany({
      where: { companyId: c.id, status: 'ACTIVE' },
      select: { id: true, name: true, role: true, model: true }
    }).catch(() => []);
    console.log(\`AGENTS FOR \${c.name}:\`, JSON.stringify(agents, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
`;

const command = `cat << 'EOF' > /tmp/find-physio.js\n${remoteScript}\nEOF\ncd /var/www/backend2 && node /tmp/find-physio.js`;

try {
  console.log('Triggering migrate-agents.yml workflow...');
  const output = execFileSync('gh', [
    'workflow', 'run', 'migrate-agents.yml',
    '-f', `command=${command}`
  ], { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error('Failed to trigger workflow:', error.message);
  if (error.stdout) console.log(error.stdout);
  if (error.stderr) console.error(error.stderr);
}

const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  const companyId = 'cmqpbuw3y3oq1ju40or3mr8it';
  
  // 1. Get sessions
  const sessions = await prisma.$queryRawUnsafe(`
    SELECT id, name, "phoneNumber" FROM whatsapp_sessions WHERE "companyId" = $1;
  `, companyId);
  console.log('Sessions for Qadroun:', sessions);

  if (sessions.length === 0) {
    console.log('No WhatsApp sessions found for this company.');
    return;
  }

  const sessionIds = sessions.map(s => s.id);

  // 2. Get contacts in these sessions matching Mokhtar
  const contacts = await prisma.$queryRawUnsafe(`
    SELECT id, "sessionId", jid, "phoneNumber", name, "pushName"
    FROM whatsapp_contacts
    WHERE "sessionId" = ANY($1) AND (
      name ILIKE $2 OR name ILIKE $3 OR name ILIKE $4 OR name ILIKE $5
      OR "pushName" ILIKE $2 OR "pushName" ILIKE $3 OR "pushName" ILIKE $4 OR "pushName" ILIKE $5
    );
  `, sessionIds, '%mokhtar%', '%elhenawy%', '%مختار%', '%الهناوي%');
  
  console.log('Found matching contacts in Qadroun sessions:', contacts);

  if (contacts.length === 0) {
    console.log('No contact named Mokhtar found.');
    return;
  }

  // 3. For each contact, query the messages
  for (const contact of contacts) {
    console.log(`\n================ MESSAGES FOR CONTACT: ${contact.name || contact.pushName} (${contact.phoneNumber}) ================`);
    
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_messages';
    `);
    const colNames = columns.map(c => c.column_name);

    const selectFields = [];
    if (colNames.includes('id')) selectFields.push('id');
    if (colNames.includes('sessionId')) selectFields.push('"sessionId"');
    if (colNames.includes('remoteJid')) selectFields.push('"remoteJid"');
    if (colNames.includes('fromMe')) selectFields.push('"fromMe"');
    if (colNames.includes('messageType')) selectFields.push('"messageType"');
    if (colNames.includes('content')) selectFields.push('content');
    if (colNames.includes('mediaUrl')) selectFields.push('"mediaUrl"');
    if (colNames.includes('mediaType')) selectFields.push('"mediaType"');
    if (colNames.includes('timestamp')) selectFields.push('timestamp');
    if (colNames.includes('isAIResponse')) selectFields.push('"isAIResponse"');

    const selectQuery = `
      SELECT ${selectFields.join(', ')}
      FROM whatsapp_messages
      WHERE "sessionId" = $1 AND "remoteJid" = $2
      ORDER BY timestamp ASC;
    `;

    const messages = await prisma.$queryRawUnsafe(selectQuery, contact.sessionId, contact.jid);
    console.log(`Total messages: ${messages.length}`);
    
    // Print the last 20 messages directly
    const lastMessages = messages.slice(-20);
    console.log('Last 20 messages:');
    for (const msg of lastMessages) {
      console.log(`[${new Date(msg.timestamp).toISOString()}] ${msg.fromMe ? 'OUTBOUND' : 'INBOUND'} ${msg.isAIResponse ? '(AI)' : ''}`);
      console.log(`Content: ${msg.content || '(no content)'}`);
      if (msg.mediaUrl) {
        console.log(`Media URL: ${msg.mediaUrl}`);
        console.log(`Media Type: ${msg.mediaType}`);
      }
      console.log('--------------------------------------------------');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

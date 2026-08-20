const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'maxp', user: 'appuser', password: '0165676135' });
client.connect().then(async () => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS inbox_settings (
      id TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL UNIQUE,
      "defaultChatStatus" TEXT DEFAULT 'NEW',
      "autoCloseEnabled" BOOLEAN DEFAULT false,
      "autoCloseAfterMin" INTEGER DEFAULT 1440,
      "archiveAfterDays" INTEGER DEFAULT 30,
      "retentionDays" INTEGER DEFAULT 365,
      "maxChatsPerModerator" INTEGER DEFAULT 50,
      "allowTransfer" BOOLEAN DEFAULT true,
      "requireNoteOnClose" BOOLEAN DEFAULT false,
      "notifyOnNewChat" BOOLEAN DEFAULT true,
      "notifyOnTransfer" BOOLEAN DEFAULT true,
      "notifyOnClose" BOOLEAN DEFAULT false,
      "browserPushEnabled" BOOLEAN DEFAULT true,
      "soundEnabled" BOOLEAN DEFAULT true,
      "soundUrl" TEXT DEFAULT '/notification.mp3',
      "workingHoursEnabled" BOOLEAN DEFAULT false,
      "workingHoursStart" TEXT,
      "workingHoursEnd" TEXT,
      "workingDays" TEXT DEFAULT 'SAT,SUN,MON,TUE,WED,THU',
      "assignmentConfig" TEXT,
      "ownershipConfig" TEXT,
      "queueConfig" TEXT,
      "reassignmentConfig" TEXT,
      "skillConfig" TEXT,
      "slaConfig" TEXT,
      "notificationConfig" TEXT,
      "assignmentState" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('inbox_settings table created successfully');
  await client.end();
}).catch(e => { console.error(e); process.exit(1); });

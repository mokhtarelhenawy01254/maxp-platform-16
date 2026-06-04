/**
 * 🔧 One-time migration script to fix attendance date storage
 * 
 * The bug: checkIn() was storing dates using getStartOfDayInTimezone() which returns
 * timezone-offset UTC (e.g. 2026-04-03T22:00:00Z for April 4 Cairo).
 * PostgreSQL @db.Date truncates to UTC date → stored as April 3 instead of April 4.
 * 
 * The fix: Normalize all stored dates to YYYY-MM-DDT00:00:00.000Z format
 * so PostgreSQL DATE truncation lands on the correct calendar day.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fixAttendanceDates() {
  const prisma = getSharedPrismaClient();
  
  console.log('🔧 Starting attendance date fix migration...');
  
  // Get all attendance records
  const records = await prisma.attendance.findMany({
    select: { id: true, date: true, companyId: true },
    orderBy: { date: 'desc' }
  });
  
  console.log(`📊 Found ${records.length} attendance records to check`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const record of records) {
    const storedDate = new Date(record.date);
    const hours = storedDate.getUTCHours();
    const minutes = storedDate.getUTCMinutes();
    
    // If hours/minutes are NOT 00:00, this record was stored with timezone offset
    if (hours !== 0 || minutes !== 0) {
      // The stored date has timezone offset (e.g. T22:00:00Z)
      // We need to figure out what LOCAL date this was meant to represent.
      // Since Cairo is UTC+2/+3, a T22:00:00Z record means the LOCAL date
      // is the NEXT day. We reconstruct this:
      
      // Get the company timezone
      let timezone = 'Africa/Cairo'; // default
      try {
        const company = await prisma.company.findUnique({
          where: { id: record.companyId },
          select: { timezone: true }
        });
        timezone = company?.timezone || 'Africa/Cairo';
      } catch (e) {}
      
      // Format the stored UTC time in the company timezone to get the LOCAL date
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(storedDate);
      
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      
      const correctedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      
      console.log(`  🔧 Record ${record.id}: ${storedDate.toISOString()} → ${correctedDate.toISOString()}`);
      
      try {
        await prisma.attendance.update({
          where: { id: record.id },
          data: { date: correctedDate }
        });
        fixedCount++;
      } catch (err) {
        // Might fail if there's a unique constraint conflict (duplicate record for same user+date)
        console.error(`  ❌ Failed to fix record ${record.id}: ${err.message}`);
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`\n✅ Migration complete:`);
  console.log(`   Fixed: ${fixedCount} records`);
  console.log(`   Already correct: ${skippedCount} records`);
  console.log(`   Total: ${records.length} records`);
}

fixAttendanceDates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

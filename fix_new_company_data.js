const { PrismaClient } = require('./apps/backend/prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  const companyId = 'cmtd267gv0000ubf8qryd5io0';
  console.log('Fixing company:', companyId);

  // 1. Create schedules (only required fields)
  const allEvents = [
    'LOYALTY_POINTS_AWARDED','LOYALTY_TIER_UPGRADED','LOYALTY_TIER_DOWNGRADED','LOYALTY_POINTS_EXPIRY_WARNING','LOYALTY_POINTS_EXPIRED','LOYALTY_POINTS_REDEEMED',
    'CASHBACK_CREDITED','CASHBACK_REVERSED',
    'CUSTOMER_QUALITY_UPGRADED','CUSTOMER_QUALITY_DOWNGRADED',
    'AUTO_DISCOUNT_COUPON_GRANTED','AUTO_DISCOUNT_COUPON_EXPIRING','AUTO_DISCOUNT_CASHBACK_CONVERTED',
    'NEW_PRODUCT','PROMOTIONAL','BACK_IN_STOCK','PRICE_DROP','LOW_STOCK_ALERT'
  ];
  for (const ev of allEvents) {
    try {
      await prisma.customerNotificationSchedule.upsert({
        where: { companyId_eventType: { companyId, eventType: ev } },
        update: {},
        create: { companyId, eventType: ev, enabled: true, activeChannel: 'AUTO', delayValue: 0, delayUnit: 'HOURS' }
      });
    } catch(e) { console.log('schedule upsert failed', ev, e.message); }
  }
  const schedules = await prisma.customerNotificationSchedule.findMany({ where: { companyId } });
  console.log('Schedules count:', schedules.length);

  // 2. Create customers correctly
  const ts = 'mtd267b7';
  for (let i=4; i<=6; i++) {
    try {
      await prisma.customer.create({
        data: {
          companyId,
          firstName: `عميل`,
          lastName: `اختبار ${i}`,
          phone: `0100000000${i}`,
          email: `customer${i}-${ts}@test.local`,
          status: 'LEAD',
        }
      });
      console.log('Customer created', i);
    } catch(e) { console.log('customer failed', i, e.message); }
  }

  // 3. Fix earlier failed customers: check
  const customers = await prisma.customer.findMany({ where: { companyId }, select: { id:true, firstName:true, lastName:true, phone:true } });
  console.log('Customers total:', customers.length, customers);

  // 4. Check templates
  const templates = await prisma.whatsAppNotificationTemplate.findMany({ where: { companyId }, select: { eventType:true, name:true, category:true, channel:true, isActive:true } });
  console.log('Templates count:', templates.length, templates);

  // 5. Check company details
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id:true, name:true, email:true, slug:true, createdAt:true } });
  console.log('Company:', company);

  await prisma.$disconnect();
}
main().catch(e=>{console.error(e); process.exit(1)});

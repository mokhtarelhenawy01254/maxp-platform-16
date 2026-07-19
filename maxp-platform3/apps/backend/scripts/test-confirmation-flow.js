const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envLocal = path.join(__dirname, '..', '.env.local');
const envDefault = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}

const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');
const orderConfirmationService = require('../services/orderConfirmationService');

async function getCompanyId(prisma, user) {
  if (user.companyId) return user.companyId;
  const link = await prisma.userCompany.findFirst({ where: { userId: user.id }, select: { companyId: true } });
  return link?.companyId || null;
}

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: 'confirm.manager@test.local' },
    select: { id: true, email: true, companyId: true }
  });
  if (!user) throw new Error('Test user not found');

  const companyId = await getCompanyId(prisma, user);
  if (!companyId) throw new Error('Company ID not found for test user');

  const order = await prisma.order.findFirst({
    where: { companyId, orderNumber: { startsWith: 'ORD-TEST-' } },
    orderBy: { createdAt: 'desc' }
  });
  if (!order) throw new Error('No test order found');

  const confirmResult = await orderConfirmationService.confirmOrder(
    companyId,
    order.orderNumber,
    user.id,
    'Test confirmation run'
  );

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { orderNumber: true, status: true, confirmedAt: true, assignedTo: true, assignmentStrategy: true }
  });

  const assignment = await prisma.orderAssignment.findFirst({
    where: { orderId: order.id, isActive: true },
    select: { assignedTo: true, strategy: true, assignedAt: true }
  });

  const guestOrder = await prisma.guestOrder.findFirst({
    where: { companyId, orderNumber: { startsWith: 'GUEST-TEST-' } },
    orderBy: { createdAt: 'desc' }
  });
  if (!guestOrder) throw new Error('No guest test order found');

  const guestResult = await orderConfirmationService.confirmOrder(
    companyId,
    guestOrder.orderNumber,
    user.id,
    'Test confirmation run (guest)'
  );

  const updatedGuest = await prisma.guestOrder.findUnique({
    where: { id: guestOrder.id },
    select: { orderNumber: true, status: true, updatedAt: true }
  });

  const guestAssignment = await prisma.orderAssignment.findFirst({
    where: { guestOrderId: guestOrder.id, isActive: true },
    select: { assignedTo: true, strategy: true, assignedAt: true }
  });

  console.log('✅ Confirm regular order result:', confirmResult?.orderType || 'unknown');
  console.log('✅ Regular order status:', updatedOrder);
  console.log('✅ Regular assignment:', assignment || 'none');
  console.log('✅ Confirm guest order result:', guestResult?.orderType || 'unknown');
  console.log('✅ Guest order status:', updatedGuest);
  console.log('✅ Guest assignment:', guestAssignment || 'none');
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exitCode = 1;
});

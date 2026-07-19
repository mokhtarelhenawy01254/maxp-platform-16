const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

const envLocal = path.join(__dirname, '..', '.env.local');
const envDefault = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}

const { PrismaClient } = require(path.join(__dirname, '..', 'prisma', 'generated', 'postgresql_v2'));
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3007/api/v1';

async function getCompanyIdForAdmin() {
  const admin = await prisma.user.findUnique({
    where: { email: 'mokhtar@mokhtar.mokhtar' },
    select: { id: true, companyId: true }
  });
  if (!admin) throw new Error('Admin user not found');
  if (admin.companyId) return admin.companyId;
  const link = await prisma.userCompany.findFirst({ where: { userId: admin.id }, select: { companyId: true } });
  return link?.companyId || null;
}

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'mokhtar@mokhtar.mokhtar',
    password: 'mokhtar@mokhtar.mokhtar'
  });
  return res.data?.data?.token;
}

async function main() {
  const companyId = await getCompanyIdForAdmin();
  if (!companyId) throw new Error('Company ID not found');

  const [order, guest] = await Promise.all([
    prisma.order.findFirst({
      where: { companyId, orderNumber: { startsWith: 'ORD-TEST-' } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.guestOrder.findFirst({
      where: { companyId, orderNumber: { startsWith: 'GUEST-TEST-' } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!order) throw new Error('No test order found');
  if (!guest) throw new Error('No guest test order found');

  const token = await login();
  if (!token) throw new Error('Login failed to return token');

  const headers = { Authorization: `Bearer ${token}` };

  const queueRes = await axios.get(`${BASE_URL}/order-confirmation/queue`, { headers });
  console.log('✅ Queue total:', queueRes.data?.pagination?.total ?? 'n/a');

  const confirmRes = await axios.post(
    `${BASE_URL}/order-confirmation/confirm`,
    { orderId: order.orderNumber, notes: 'API test confirm' },
    { headers }
  );

  const confirmGuestRes = await axios.post(
    `${BASE_URL}/order-confirmation/confirm`,
    { orderId: guest.orderNumber, notes: 'API test confirm (guest)' },
    { headers }
  );

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { orderNumber: true, status: true, confirmedAt: true, assignedTo: true, assignmentStrategy: true }
  });

  const assignment = await prisma.orderAssignment.findFirst({
    where: { orderId: order.id, isActive: true },
    select: { assignedTo: true, strategy: true, assignedAt: true }
  });

  const updatedGuest = await prisma.guestOrder.findUnique({
    where: { id: guest.id },
    select: { orderNumber: true, status: true, updatedAt: true }
  });

  const guestAssignment = await prisma.orderAssignment.findFirst({
    where: { guestOrderId: guest.id, isActive: true },
    select: { assignedTo: true, strategy: true, assignedAt: true }
  });

  console.log('✅ Confirm API response (regular):', confirmRes.data?.success, confirmRes.data?.data?.orderType || 'n/a');
  console.log('✅ Updated regular order:', updatedOrder);
  console.log('✅ Assignment (regular):', assignment || 'none');
  console.log('✅ Confirm API response (guest):', confirmGuestRes.data?.success, confirmGuestRes.data?.data?.orderType || 'n/a');
  console.log('✅ Updated guest order:', updatedGuest);
  console.log('✅ Assignment (guest):', guestAssignment || 'none');
}

main()
  .catch((err) => {
    const message = err.response?.data ? JSON.stringify(err.response.data) : err.message || err;
    console.error('❌ API test failed:', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

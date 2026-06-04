const { t: i18n } = require('./i18n');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
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

const TEST_PASSWORD = 'Test@1234';

async function ensureCompanyId() {
  const admin = await prisma.user.findUnique({
    where: { email: 'mokhtar@mokhtar.mokhtar' },
    include: { userCompanies: true }
  });
  if (!admin) throw new Error('Admin user not found: mokhtar@mokhtar.mokhtar');
  const companyId = admin.companyId || admin.userCompanies?.[0]?.companyId;
  if (!companyId) throw new Error('Company ID not found for admin user');
  return companyId;
}

async function upsertTestUsers(companyId) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const usersData = [
    { email: 'confirm.manager@test.local', firstName: 'Confirm', lastName: 'Manager', role: 'MANAGER' },
    { email: 'confirm.agent@test.local', firstName: 'Confirm', lastName: 'Agent', role: 'AGENT' },
    { email: 'confirm.agent2@test.local', firstName: 'Confirm', lastName: 'Agent Two', role: 'AGENT' }
  ];

  const users = [];
  for (const data of usersData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: true,
        isEmailVerified: true,
        password: passwordHash,
        companyId
      },
      create: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: true,
        isEmailVerified: true,
        companyId,
        availability: 'available'
      }
    });

    await prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId
        }
      },
      update: {
        role: data.role,
        isActive: true,
        isDefault: false
      },
      create: {
        userId: user.id,
        companyId,
        role: data.role,
        isActive: true,
        isDefault: false
      }
    });

    users.push(user);
  }

  return users;
}

async function ensureSettings(companyId) {
  const settings = await prisma.orderConfirmationSettings.findUnique({ where: { companyId } });
  const updateData = {
    enabled: true,
    distributionEnabled: true,
    requireStatuses: JSON.stringify(['PENDING']),
    requireSourceTypes: JSON.stringify(['manual', 'storefront']),
    confirmStatus: 'CONFIRMED',
    eligibleRoles: JSON.stringify(['MANAGER', 'AGENT'])
  };

  if (settings) {
    await prisma.orderConfirmationSettings.update({ where: { companyId }, data: updateData });
    return;
  }

  await prisma.orderConfirmationSettings.create({
    data: {
      companyId,
      enabled: true,
      distributionEnabled: true,
      requireStatuses: JSON.stringify(['PENDING']),
      requireSourceTypes: JSON.stringify(['manual', 'storefront']),
      confirmStatus: 'CONFIRMED',
      eligibleRoles: JSON.stringify(['MANAGER', 'AGENT'])
    }
  });
}

async function upsertCustomer(companyId, data) {
  const existing = await prisma.customer.findFirst({
    where: { companyId, email: data.email }
  });
  if (existing) return existing;

  return await prisma.customer.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone
    }
  });
}

async function createOrders(companyId, customers) {
  const now = Date.now();
  const orders = [];
  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    const orderNumber = `ORD-TEST-${now}-${i + 1}`;
    const subtotal = 100 + i * 25;
    const shipping = 25;
    const total = subtotal + shipping;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        companyId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal,
        tax: 0,
        shipping,
        discount: 0,
        total,
        currency: 'EGP',
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        city: i18n.t('msg.98dfb7b0'),
        governorate: i18n.t('msg.98dfb7b0'),
        sourceType: i % 2 === 0 ? 'manual' : 'storefront'
      }
    });

    orders.push(order);
  }

  return orders;
}

async function createGuestOrders(companyId) {
  const now = Date.now();
  const guests = [];
  for (let i = 0; i < 2; i += 1) {
    const orderNumber = `GUEST-TEST-${now}-${i + 1}`;
    const total = 150 + i * 30;
    const guest = await prisma.guestOrder.create({
      data: {
        orderNumber,
        guestEmail: `guest${i + 1}@test.local`,
        guestPhone: `0100000000${i + 5}`,
        guestName: `Guest Tester ${i + 1}`,
        items: JSON.stringify([{ name: 'Test Item', qty: 1, price: total }]),
        total,
        shippingCost: 25,
        discountAmount: 0,
        finalTotal: total + 25,
        shippingAddress: 'Test Address, Cairo',
        paymentMethod: 'CASH',
        status: 'pending',
        companyId
      }
    });

    guests.push(guest);
  }

  return guests;
}

async function main() {
  const companyId = await ensureCompanyId();
  await ensureSettings(companyId);

  const users = await upsertTestUsers(companyId);

  const customers = [];
  customers.push(await upsertCustomer(companyId, {
    firstName: 'Test',
    lastName: 'Customer One',
    email: 'customer1@test.local',
    phone: '01000000001'
  }));
  customers.push(await upsertCustomer(companyId, {
    firstName: 'Test',
    lastName: 'Customer Two',
    email: 'customer2@test.local',
    phone: '01000000002'
  }));
  customers.push(await upsertCustomer(companyId, {
    firstName: 'Test',
    lastName: 'Customer Three',
    email: 'customer3@test.local',
    phone: '01000000003'
  }));

  const orders = await createOrders(companyId, customers);
  const guestOrders = await createGuestOrders(companyId);

  console.log('✅ Test users created/updated:', users.map(u => u.email));
  console.log('✅ Test orders created:', orders.map(o => o.orderNumber));
  console.log('✅ Guest test orders created:', guestOrders.map(o => o.orderNumber));
  console.log(`✅ Test password for new users: ${TEST_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

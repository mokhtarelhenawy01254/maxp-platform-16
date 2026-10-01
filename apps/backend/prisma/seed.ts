import { PrismaClient, UserRole, SubscriptionPlan, CustomerStatus } from './generated/postgresql_v2';
import bcrypt from 'bcryptjs';
import { seedTemplateCoverage } from './seeders/templateCoverageSeeder';

const prisma = new PrismaClient();

/**
 * Database Seeder
 * 
 * Seeds the database with initial data for development and testing
 */

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create demo company
  const company = await prisma.company.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'شركة التواصل التجريبية',
      email: 'demo@example.com',
      phone: '+966501234567',
      website: 'https://demo.example.com',
      address: 'الرياض، المملكة العربية السعودية',
      settings: {
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
        language: 'ar',
        features: {
          ai: true,
          ecommerce: true,
          analytics: true,
        },
      },
    },
  });

  console.log('✅ Company created:', company.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'أحمد',
      lastName: 'المدير',
      role: UserRole.COMPANY_ADMIN,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create manager user
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: hashedPassword,
      firstName: 'فاطمة',
      lastName: 'المشرفة',
      role: UserRole.MANAGER,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  console.log('✅ Manager user created:', managerUser.email);

  // Create agent users
  const agents = await Promise.all([
    prisma.user.upsert({
      where: { email: 'agent1@example.com' },
      update: {},
      create: {
        email: 'agent1@example.com',
        password: hashedPassword,
        firstName: 'محمد',
        lastName: 'الوكيل',
        role: UserRole.AGENT,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        companyId: company.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'agent2@example.com' },
      update: {},
      create: {
        email: 'agent2@example.com',
        password: hashedPassword,
        firstName: 'سارة',
        lastName: 'المساعدة',
        role: UserRole.AGENT,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        companyId: company.id,
      },
    }),
  ]);

  console.log('✅ Agent users created:', agents.length);

  // Create product categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'الإلكترونيات',
        description: 'أجهزة إلكترونية ومعدات تقنية',
        companyId: company.id,
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'الملابس',
        description: 'ملابس رجالية ونسائية وأطفال',
        companyId: company.id,
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'المنزل والحديقة',
        description: 'أدوات منزلية ومعدات الحديقة',
        companyId: company.id,
        sortOrder: 3,
      },
    }),
  ]);

  console.log('✅ Categories created:', categories.length);

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'هاتف ذكي متقدم',
        description: 'هاتف ذكي بمواصفات عالية وكاميرا متطورة',
        sku: 'PHONE-001',
        price: 2999.99,
        comparePrice: 3499.99,
        cost: 2000.00,
        stock: 50,
        categoryId: categories[0].id,
        companyId: company.id,
        isFeatured: true,
        tags: JSON.stringify(['هاتف', 'ذكي', 'تقنية']),
        images: JSON.stringify(['/images/phone1.jpg', '/images/phone2.jpg']),
      },
    }),
    prisma.product.create({
      data: {
        name: 'قميص قطني أنيق',
        description: 'قميص قطني عالي الجودة مناسب للمناسبات الرسمية',
        sku: 'SHIRT-001',
        price: 199.99,
        comparePrice: 249.99,
        cost: 100.00,
        stock: 100,
        categoryId: categories[1].id,
        companyId: company.id,
        tags: JSON.stringify(['قميص', 'قطن', 'رسمي']),
        images: JSON.stringify(['/images/shirt1.jpg']),
      },
    }),
    prisma.product.create({
      data: {
        name: 'طقم أدوات المطبخ',
        description: 'طقم كامل من أدوات المطبخ عالية الجودة',
        sku: 'KITCHEN-001',
        price: 599.99,
        cost: 300.00,
        stock: 25,
        categoryId: categories[2].id,
        companyId: company.id,
        tags: JSON.stringify(['مطبخ', 'أدوات', 'طبخ']),
        images: JSON.stringify(['/images/kitchen1.jpg', '/images/kitchen2.jpg']),
      },
    }),
  ]);

  console.log('✅ Products created:', products.length);

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        firstName: 'خالد',
        lastName: 'العتيبي',
        email: 'khalid@example.com',
        phone: '+966501111111',
        status: CustomerStatus.CUSTOMER,
        tags: JSON.stringify(['vip', 'متكرر']),
        notes: 'عميل مهم ومتكرر',
        companyId: company.id,
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'نورا',
        lastName: 'الأحمد',
        email: 'nora@example.com',
        phone: '+966502222222',
        status: CustomerStatus.PROSPECT,
        tags: JSON.stringify(['جديد']),
        notes: 'عميل محتمل مهتم بالمنتجات',
        companyId: company.id,
      },
    }),
    prisma.customer.create({
      data: {
        firstName: 'عبدالله',
        lastName: 'المطيري',
        phone: '+966503333333',
        status: CustomerStatus.LEAD,
        tags: JSON.stringify(['فيسبوك']),
        notes: 'تواصل عبر فيسبوك ماسنجر',
        facebookId: 'fb_123456789',
        companyId: company.id,
      },
    }),
  ]);

  console.log('✅ Customers created:', customers.length);

  // Create sample conversations
  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        customerId: customers[0].id,
        assignedUserId: agents[0].id,
        channel: 'FACEBOOK',
        subject: 'استفسار عن المنتجات',
        lastMessageAt: new Date(),
        lastMessagePreview: 'مرحباً، أريد معرفة المزيد عن الهواتف الذكية',
        companyId: company.id,
      },
    }),
    prisma.conversation.create({
      data: {
        customerId: customers[1].id,
        assignedUserId: agents[1].id,
        channel: 'EMAIL',
        subject: 'طلب عرض سعر',
        lastMessageAt: new Date(Date.now() - 3600000), // 1 hour ago
        lastMessagePreview: 'أحتاج عرض سعر لطقم أدوات المطبخ',
        companyId: company.id,
      },
    }),
  ]);

  console.log('✅ Conversations created:', conversations.length);

  // Create sample messages
  await Promise.all([
    prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        content: 'مرحباً، أريد معرفة المزيد عن الهواتف الذكية المتوفرة لديكم',
        isFromCustomer: true,
        isRead: true,
        readAt: new Date(),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        senderId: agents[0].id,
        content: 'أهلاً وسهلاً! لدينا مجموعة رائعة من الهواتف الذكية. هل تبحث عن مواصفات معينة؟',
        isFromCustomer: false,
        isRead: false,
      },
    }),
    prisma.message.create({
      data: {
        conversationId: conversations[1].id,
        content: 'أحتاج عرض سعر لطقم أدوات المطبخ الكامل',
        isFromCustomer: true,
        isRead: true,
        readAt: new Date(),
      },
    }),
  ]);

  console.log('✅ Messages created');

  // Create sample order
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-001',
      customerId: customers[0].id,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      subtotal: 2999.99,
      tax: 449.99,
      shipping: 50.00,
      total: 3499.98,
      currency: 'SAR',
      notes: 'توصيل سريع',
      shippingAddress: {
        name: 'خالد العتيبي',
        phone: '+966501111111',
        address: 'شارع الملك فهد، الرياض',
        city: 'الرياض',
        country: 'السعودية',
        postalCode: '12345',
      },
      companyId: company.id,
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 1,
            price: 2999.99,
            total: 2999.99,
          },
        ],
      },
    },
  });

  console.log('✅ Order created:', order.orderNumber);

  // Create integrations
  await Promise.all([
    prisma.integration.create({
      data: {
        name: 'Facebook Messenger',
        type: 'facebook',
        platform: 'FACEBOOK',
        externalId: 'demo_page_id',
        accessToken: 'demo_access_token',
        config: {
          appId: 'demo_app_id',
          pageId: 'demo_page_id',
          accessToken: 'demo_access_token',
        },
        settings: JSON.stringify({
          pageName: 'Demo Page',
          category: 'Business',
          connectedAt: new Date().toISOString(),
        }),
        status: 'ACTIVE',
        isActive: true,
        companyId: company.id,
      },
    }),
    prisma.integration.create({
      data: {
        name: 'Google Gemini AI',
        type: 'ai',
        platform: 'AI',
        externalId: 'gemini-pro',
        config: {
          apiKey: 'demo_api_key',
          model: 'gemini-pro',
          temperature: 0.7,
        },
        settings: JSON.stringify({
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 1000,
        }),
        status: 'ACTIVE',
        isActive: true,
        companyId: company.id,
      },
    }),
  ]);

  console.log('✅ Integrations created');

  // Add template coverage seeding
  await seedTemplateCoverage();

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('Admin: admin@example.com / admin123');
  console.log('Manager: manager@example.com / admin123');
  console.log('Agent 1: agent1@example.com / admin123');
  console.log('Agent 2: agent2@example.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

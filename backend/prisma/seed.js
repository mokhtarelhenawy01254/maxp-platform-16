"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const client_1 = require("./generated/postgresql");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    const company = await prisma.company.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            name: 'شركة التواصل التجريبية',
            email: 'demo@example.com',
            phone: '+966501234567',
            website: 'https://demo.example.com',
            plan: 'PRO',
            address: 'الرياض، المملكة العربية السعودية',
            settings: JSON.stringify({
                timezone: 'Asia/Riyadh',
                currency: 'SAR',
                language: 'ar',
                features: {
                    ai: true,
                    ecommerce: true,
                    analytics: true,
                },
            }),
        },
    });
    console.log('✅ Company created:', company.name);
    const hashedPassword = await bcryptjs_1.default.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: hashedPassword,
            firstName: 'أحمد',
            lastName: 'المدير',
            role: 'COMPANY_ADMIN',
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            companyId: company.id,
        },
    });
    console.log('✅ Admin user created:', adminUser.email);
    const managerUser = await prisma.user.upsert({
        where: { email: 'manager@example.com' },
        update: {},
        create: {
            email: 'manager@example.com',
            password: hashedPassword,
            firstName: 'فاطمة',
            lastName: 'المشرفة',
            role: 'MANAGER',
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            companyId: company.id,
        },
    });
    console.log('✅ Manager user created:', managerUser.email);
    const agents = await Promise.all([
        prisma.user.upsert({
            where: { email: 'agent1@example.com' },
            update: {},
            create: {
                email: 'agent1@example.com',
                password: hashedPassword,
                firstName: 'محمد',
                lastName: 'الوكيل',
                role: 'AGENT',
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
                role: 'AGENT',
                isActive: true,
                isEmailVerified: true,
                emailVerifiedAt: new Date(),
                companyId: company.id,
            },
        }),
    ]);
    console.log('✅ Agent users created:', agents.length);
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
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                firstName: 'خالد',
                lastName: 'العتيبي',
                email: 'khalid@example.com',
                phone: '+966501111111',
                status: 'ACTIVE',
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
                status: 'LEAD',
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
                status: 'LEAD',
                tags: JSON.stringify(['فيسبوك']),
                notes: 'تواصل عبر فيسبوك ماسنجر',
                facebookId: 'fb_123456789',
                companyId: company.id,
            },
        }),
    ]);
    console.log('✅ Customers created:', customers.length);
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
                lastMessageAt: new Date(Date.now() - 3600000),
                lastMessagePreview: 'أحتاج عرض سعر لطقم أدوات المطبخ',
                companyId: company.id,
            },
        }),
    ]);
    console.log('✅ Conversations created:', conversations.length);
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
            shippingAddress: JSON.stringify({
                name: 'خالد العتيبي',
                phone: '+966501111111',
                address: 'شارع الملك فهد، الرياض',
                city: 'الرياض',
                country: 'السعودية',
                postalCode: '12345',
            }),
            companyId: company.id,
            orderItems: { // Fixed from items
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
    await Promise.all([
        prisma.integration.create({
            data: {
                id: 'int_facebook_' + Date.now(),
                name: 'Facebook Messenger',
                type: 'facebook',
                platform: 'facebook',
                externalId: 'ext_fb_' + Date.now(),
                config: JSON.stringify({
                    appId: 'demo_app_id',
                    pageId: 'demo_page_id',
                    accessToken: 'demo_access_token',
                }),
                isActive: true,
                companyId: company.id,
            },
        }),
        prisma.integration.create({
            data: {
                id: 'int_gemini_' + Date.now(),
                name: 'Google Gemini AI',
                type: 'ai',
                platform: 'google',
                externalId: 'ext_gemini_' + Date.now(),
                config: JSON.stringify({
                    apiKey: 'demo_api_key',
                    model: 'gemini-pro',
                    temperature: 0.7,
                }),
                isActive: true,
                companyId: company.id,
            },
        }),
    ]);
    console.log('✅ Integrations created');
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
//# sourceMappingURL=seed.js.map
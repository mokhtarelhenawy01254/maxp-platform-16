const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
  errorFormat: 'minimal',
});

const APP_SLUG = 'dental-lab-app';
const COMPANY_EMAIL = 'dental-lab-demo@maxp.local';
const COMPANY_NAME = 'معمل الأسنان التجريبي';
const ADMIN_EMAIL = 'dentallab.admin@maxp.local';
const ADMIN_PASSWORD = 'Maxp@12345';
const DENTIST_PHONE = '01000000000';
const DENTIST_PORTAL_PIN = '1234';

const APP_DATA = {
  slug: APP_SLUG,
  name: 'نظام معمل الأسنان',
  description: 'نظام متكامل لإدارة معامل الأسنان — حالات التركيبات، مراحل الإنتاج، تعيين الفنيين، رفع الملفات، فواتير الدكاترة، وبوابة للدكتور.',
  category: 'MEDICAL',
  pricingModel: 'SUBSCRIPTION',
  monthlyPrice: 199,
  yearlyPrice: 1990,
  unitPrice: null,
  unitName: null,
  trialDays: 14,
  requiredApps: [],
  features: {
    cases: { enabled: true, name: 'إدارة الحالات', description: 'إدارة حالات التركيبات ومتابعتها من الاستلام حتى التسليم.', access: 'PAID' },
    stages: { enabled: true, name: 'مراحل الإنتاج', description: 'تحديد ومتابعة مراحل إنتاج التركيبات داخل المعمل.', access: 'PAID' },
    assignments: { enabled: true, name: 'تعيين الفنيين', description: 'تعيين الفنيين على الحالات ومتابعة أعباء العمل.', access: 'PAID' },
    attachments: { enabled: true, name: 'رفع الملفات', description: 'رفع صور وملفات الحالات والتركيبات.', access: 'PAID' },
    invoices: { enabled: true, name: 'فواتير الدكاترة', description: 'إصدار ومتابعة فواتير دكاترة الأسنان والتحصيل.', access: 'PAID' },
    doctorPortal: { enabled: true, name: 'بوابة ومتجر الدكتور', description: 'بوابة للدكتور لمتابعة حالاته مع متجر للطلبات.', access: 'PAID' },
    settings: { enabled: true, name: 'الإعدادات', description: 'إعدادات المعمل وأنواع العمل والأسعار.', access: 'PAID' },
  },
  isActive: true,
  isPublic: true,
  isFeatured: false,
  isPopular: false,
  icon: 'stethoscope',
  coverImage: null,
  engineCompatibility: null,
};

function hasModel(modelName) {
  return typeof prisma[modelName]?.create === 'function';
}

async function seedSampleData(companyId) {
  const workTypeModel = ['workType', 'labWorkType', 'dentalWorkType'].find(hasModel);
  const dentistModel = ['dentist', 'labDentist', 'dentalDentist', 'dentalLabDoctor'].find(hasModel);
  const technicianModel = ['technician', 'labTechnician', 'dentalTechnician'].find(hasModel);

  if (!workTypeModel && !dentistModel && !technicianModel) {
    console.log('⚠️  Dental Lab data models are not exposed by the Prisma client yet — skipping sample data seeding.');
    return;
  }

  if (workTypeModel) {
    const workTypeCount = await prisma[workTypeModel].count({ where: { companyId } });
    if (workTypeCount === 0) {
      const workTypes = [
        { name: 'تلبيسة زيركون', price: 400, leadTimeDays: 5 },
        { name: 'تلبيسة إيماكس', price: 500, leadTimeDays: 7 },
        { name: 'جسر 3 أسنان', price: 900, leadTimeDays: 10 },
        { name: 'طقم كامل', price: 2500, leadTimeDays: 14 },
      ];
      for (const wt of workTypes) {
        await prisma[workTypeModel].create({
          data: { companyId, name: wt.name, price: wt.price, leadTimeDays: wt.leadTimeDays },
        });
      }
      console.log(`✅ ${workTypes.length} work types created.`);
    } else {
      console.log('✅ Work types already exist — skipping.');
    }
  }

  if (dentistModel) {
    const dentistCount = await prisma[dentistModel].count({ where: { companyId } });
    if (dentistCount === 0) {
      await prisma[dentistModel].create({
        data: { companyId, name: 'د. أحمد مصطفى', phone: DENTIST_PHONE, portalPin: DENTIST_PORTAL_PIN },
      });
      console.log('✅ Dentist د. أحمد مصطفى created.');
    } else {
      console.log('✅ Dentist already exists — skipping.');
    }
  }

  if (technicianModel) {
    const technicianCount = await prisma[technicianModel].count({ where: { companyId } });
    if (technicianCount === 0) {
      const technicians = [
        { name: 'محمد عبد الله', role: 'TECHNICIAN' },
        { name: 'سارة أحمد', role: 'CAD' },
      ];
      for (const tech of technicians) {
        await prisma[technicianModel].create({
          data: { companyId, name: tech.name, role: tech.role },
        });
      }
      console.log(`✅ ${technicians.length} technicians created.`);
    } else {
      console.log('✅ Technicians already exist — skipping.');
    }
  }
}

async function main() {
  console.log('--- Setup Dental Lab Demo ---');

  const existingApp = await prisma.marketplaceApp.findUnique({ where: { slug: APP_SLUG } });
  const app = existingApp
    ? await prisma.marketplaceApp.update({ where: { slug: APP_SLUG }, data: APP_DATA })
    : await prisma.marketplaceApp.create({ data: APP_DATA });
  console.log(`✅ MarketplaceApp (${existingApp ? 'updated' : 'created'}): ${app.slug} (${app.id})`);

  const company = await prisma.company.upsert({
    where: { email: COMPANY_EMAIL },
    update: { name: COMPANY_NAME, isActive: true },
    create: { name: COMPANY_NAME, email: COMPANY_EMAIL, currency: 'EGP', isActive: true },
  });
  console.log(`✅ Company (${company.name}): ${company.id}`);

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: hashedPassword, role: 'OWNER', companyId: company.id, isActive: true },
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'مدير',
      lastName: 'معمل الأسنان',
      role: 'OWNER',
      companyId: company.id,
      isActive: true,
    },
  });
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
    update: { role: 'OWNER', isActive: true, isDefault: true },
    create: { userId: adminUser.id, companyId: company.id, role: 'OWNER', isActive: true, isDefault: true },
  });
  console.log(`✅ Owner admin user: ${adminUser.email}`);

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const companyApp = await prisma.companyApp.upsert({
    where: { companyId_appId: { companyId: company.id, appId: app.id } },
    update: { activePricingModel: 'SUBSCRIPTION', status: 'ACTIVE', trialEndsAt, validUntil },
    create: { companyId: company.id, appId: app.id, activePricingModel: 'SUBSCRIPTION', status: 'ACTIVE', trialEndsAt, validUntil },
  });
  console.log(`✅ CompanyApp activated: ${app.slug} (${companyApp.status})`);

  await seedSampleData(company.id);

  console.log('\n--- Summary ---');
  console.log(`Company:     ${company.name} (${company.id})`);
  console.log(`Admin email: ${adminUser.email}`);
  console.log(`Admin pass:  ${ADMIN_PASSWORD}`);
  console.log(`Dentist:     د. أحمد مصطفى / phone ${DENTIST_PHONE} / PIN ${DENTIST_PORTAL_PIN}`);
  console.log(`App:         ${app.slug} — ${companyApp.status} (trial until ${trialEndsAt.toISOString()})`);
}

main()
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
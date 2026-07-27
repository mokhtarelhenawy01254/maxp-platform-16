const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

// نفس الحالات المحدثة من orderStatusController.js
const DEFAULT_SHIPPING_STATUSES = [
  { code: 'NOT_SHIPPED', name: 'لم يتم الشحن', nameEn: 'Not Shipped', color: '#6B7280', icon: 'Package', sortOrder: 1 },
  { code: 'READY_TO_SHIP', name: 'جاهز للشحن', nameEn: 'Ready to Ship', color: '#F59E0B', icon: 'Package', sortOrder: 2 },
  { code: 'SHIPPED', name: 'تم الشحن', nameEn: 'Shipped', color: '#3B82F6', icon: 'Truck', sortOrder: 3 },
  { code: 'OUT_FOR_DELIVERY', name: 'قيد التوصيل', nameEn: 'Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 4 },
  { code: 'DELIVERED', name: 'تم التسليم', nameEn: 'Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 5 },
  { code: 'RETURNED', name: 'تم الإرجاع', nameEn: 'Returned', color: '#EF4444', icon: 'RotateCcw', sortOrder: 6 },
  { code: 'LOST', name: 'مفقود', nameEn: 'Lost', color: '#DC2626', icon: 'AlertCircle', sortOrder: 7 },
  // حالات تربو الرسمية 1-13
  { code: 'turbo_saved', name: 'تربو: محفوظة قبل الشحن', nameEn: 'Turbo: Saved', color: '#6366F1', icon: 'Clock', sortOrder: 8 },
  { code: 'turbo_sent', name: 'تربو: مرسلة لشركة تربو', nameEn: 'Turbo: Sent', color: '#3B82F6', icon: 'CheckCircle', sortOrder: 9 },
  { code: 'processing', name: 'تربو: قيد التنفيذ بالفرع', nameEn: 'Turbo: Processing', color: '#8B5CF6', icon: 'Package', sortOrder: 10 },
  { code: 'out_for_delivery', name: 'تربو: مع الكابتن / مسلمة للمندوب', nameEn: 'Turbo: Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 11, mapsToSystem: 'SHIPPED' },
  { code: 'returned_to_company', name: 'تربو: مرتجعة مع الشركة', nameEn: 'Turbo: Returned With Company', color: '#991B1B', icon: 'RotateCcw', sortOrder: 12, mapsToSystem: 'RETURNED' },
  { code: 'cancelled', name: 'تربو: ملغي من الشحن', nameEn: 'Turbo: Cancelled', color: '#DC2626', icon: 'XCircle', sortOrder: 13, mapsToSystem: 'CANCELLED' },
  { code: 'delivered', name: 'تربو: تم التسليم', nameEn: 'Turbo: Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 14, mapsToSystem: 'DELIVERED' },
  { code: 'remitted', name: 'تربو: تم التوريد وتحصيل المبلغ', nameEn: 'Turbo: Remitted', color: '#047857', icon: 'CheckCircle', sortOrder: 15, mapsToSystem: 'DELIVERED' },
  { code: 'archived', name: 'تربو: شحنة محذوفة في تربو', nameEn: 'Turbo: Archived', color: '#78716C', icon: 'Trash2', sortOrder: 16 },
  { code: 'returned_resent', name: 'تربو: معاد إرسالها', nameEn: 'Turbo: Resent', color: '#2563EB', icon: 'RotateCcw', sortOrder: 17, mapsToSystem: 'PROCESSING' },
  { code: 'returned_missing', name: 'تربو: مرتجع مفقود', nameEn: 'Turbo: Missing', color: '#7F1D1D', icon: 'AlertCircle', sortOrder: 18, mapsToSystem: 'RETURNED' },
  { code: 'returned_destroyed', name: 'تربو: مرتجع معدوم', nameEn: 'Turbo: Destroyed', color: '#451A03', icon: 'XCircle', sortOrder: 19, mapsToSystem: 'RETURNED' },
  { code: 'delayed', name: 'تربو: مؤجلة مع المندوب', nameEn: 'Turbo: Delayed', color: '#F97316', icon: 'Clock', sortOrder: 20, mapsToSystem: 'ON_HOLD' }
];

async function seedShippingStatuses() {
  // Find all companies that have Turbo enabled
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { turboEnabled: true },
        { turboApiKey: { not: null } },
        { name: { contains: 'swan', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true }
  });

  console.log(`🔍 Found ${companies.length} companies with Turbo enabled`);

  for (const company of companies) {
    console.log(`\n🏢 Processing: ${company.name} (${company.id})`);
    let created = 0, updated = 0, skipped = 0;

    for (const status of DEFAULT_SHIPPING_STATUSES) {
      try {
        const existing = await prisma.orderStatusConfig.findFirst({
          where: { companyId: company.id, code: status.code }
        });

        if (!existing) {
          await prisma.orderStatusConfig.create({
            data: {
              companyId: company.id,
              ...status,
              statusType: 'shipping',
              source: status.code.startsWith('turbo_') || ['processing','out_for_delivery','returned_to_company','cancelled','delivered','remitted','archived','returned_resent','returned_missing','returned_destroyed','delayed'].includes(status.code) ? 'turbo' : 'system',
              isSystemStatus: true,
              isActive: true
            }
          });
          created++;
          console.log(`  ✅ Created: ${status.code} → ${status.name}`);
        } else {
          // Update name, color, icon, sortOrder
          await prisma.orderStatusConfig.update({
            where: { id: existing.id },
            data: {
              name: status.name,
              nameEn: status.nameEn,
              color: status.color,
              icon: status.icon,
              sortOrder: status.sortOrder,
              statusType: 'shipping',
              source: status.code.startsWith('turbo_') || ['processing','out_for_delivery','returned_to_company','cancelled','delivered','remitted','archived','returned_resent','returned_missing','returned_destroyed','delayed'].includes(status.code) ? 'turbo' : 'system',
              isSystemStatus: true,
              isActive: true
            }
          });
          updated++;
        }
      } catch (error) {
        if (!error.message.includes('unique constraint') && !error.message.includes('Unique constraint')) {
          console.error(`  ❌ Error for ${status.code}: ${error.message}`);
        }
        skipped++;
      }
    }

    console.log(`  📊 Summary: Created ${created}, Updated ${updated}, Skipped ${skipped}`);
  }

  // Delete old TURBO_ prefixed statuses (outdated naming)
  const deletedOld = await prisma.orderStatusConfig.deleteMany({
    where: {
      code: { startsWith: 'TURBO_' },
      statusType: 'shipping'
    }
  });
  if (deletedOld.count > 0) {
    console.log(`\n🗑️ Cleaned up ${deletedOld.count} old TURBO_ prefixed statuses`);
  }

  console.log('\n====================================================');
  console.log('✅🎉 SEEDING COMPLETE! All shipping statuses aligned.');
  console.log('====================================================');

  process.exit(0);
}

seedShippingStatuses().catch(e => { console.error(e); process.exit(1); });

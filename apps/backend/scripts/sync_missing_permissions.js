/**
 * Sync missing granular permissions for all built-in __system__ roles.
 *
 * This fixes the case where new permissions were added to seedPermissions.js
 * (e.g. granular orders permissions) but the existing Role records in the DB
 * were never updated — so COMPANY_ADMIN/OWNER/MANAGER lack the new keys.
 *
 * Safe to re-run; upserts permissions and replaces RolePermission records
 * for each built-in role to match the seed definition exactly.
 *
 * Run: node scripts/sync_missing_permissions.js
 */
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════
// Duplicated from seedPermissions.js so this script is self-contained
// ═══════════════════════════════════════════════════════════════════

const PERMISSIONS = [
  { key: 'dashboard.view', name: 'عرض لوحة التحكم', domain: 'DASHBOARD' },
  { key: 'dashboard.view.all', name: 'عرض كل الإحصائيات', domain: 'DASHBOARD' },
  { key: 'dashboard.view.team', name: 'عرض لوحة الفريق', domain: 'DASHBOARD' },
  { key: 'dashboard.view.own', name: 'عرض لوحتي فقط', domain: 'DASHBOARD' },
  { key: 'analytics.view', name: 'عرض التحليلات', domain: 'DASHBOARD' },
  { key: 'analytics.view.own', name: 'عرض تحليلاتي فقط', domain: 'DASHBOARD' },
  { key: 'orders.view', name: 'عرض الطلبات', domain: 'ORDERS' },
  { key: 'orders.create', name: 'إنشاء طلب', domain: 'ORDERS' },
  { key: 'orders.edit', name: 'تعديل طلب', domain: 'ORDERS' },
  { key: 'orders.delete', name: 'حذف طلب', domain: 'ORDERS' },
  { key: 'orders.status.change', name: 'تغيير حالة الطلب', domain: 'ORDERS' },
  { key: 'orders.assign', name: 'تعيين طلب لمستخدم', domain: 'ORDERS' },
  { key: 'orders.export', name: 'تصدير الطلبات', domain: 'ORDERS' },
  { key: 'orders.bulk.create', name: 'إنشاء طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.invoice.print', name: 'طباعة الفواتير', domain: 'ORDERS' },
  { key: 'orders.incomplete.view', name: 'عرض الطلبات الناقصة', domain: 'ORDERS' },
  { key: 'orders.incomplete.edit', name: 'تعديل الطلبات الناقصة', domain: 'ORDERS' },
  { key: 'orders.incomplete.delete', name: 'حذف الطلبات الناقصة', domain: 'ORDERS' },
  { key: 'orders.preparation.view', name: 'عرض قائمة التجهيز', domain: 'ORDERS' },
  { key: 'orders.preparation.manage', name: 'إدارة قائمة التجهيز', domain: 'ORDERS' },
  { key: 'orders.workspace.view', name: 'عرض مساحة العمل', domain: 'ORDERS' },
  { key: 'orders.confirmation.view', name: 'عرض تأكيدات الطلبات', domain: 'ORDERS' },
  { key: 'orders.confirmation.manage', name: 'إدارة تأكيدات الطلبات', domain: 'ORDERS' },
  { key: 'orders.quickstatus.view', name: 'عرض تغيير الحالة السريع', domain: 'ORDERS' },
  { key: 'orders.quickstatus.manage', name: 'إدارة تغيير الحالة السريع', domain: 'ORDERS' },
  { key: 'orders.turbo.view', name: 'عرض سجلات Turbo', domain: 'ORDERS' },
  { key: 'orders.turbo.manage', name: 'إدارة سجلات Turbo', domain: 'ORDERS' },
  { key: 'orders.bosta.view', name: 'عرض سجلات Bosta', domain: 'ORDERS' },
  { key: 'orders.bosta.manage', name: 'إدارة سجلات Bosta', domain: 'ORDERS' },
  { key: 'orders.stats.view', name: 'عرض إحصائيات الطلبات', domain: 'ORDERS' },
  { key: 'orders.automation.view', name: 'عرض أتمتة الطلبات', domain: 'ORDERS' },
  { key: 'orders.automation.manage', name: 'إدارة أتمتة الطلبات', domain: 'ORDERS' },
  { key: 'orders.invoices.view', name: 'عرض فواتير الطلبات', domain: 'ORDERS' },
  { key: 'orders.invoices.manage', name: 'إدارة فواتير الطلبات', domain: 'ORDERS' },
  { key: 'orders.invoices.print', name: 'طباعة فواتير الطلبات', domain: 'ORDERS' },
  { key: 'orders.manual.create', name: 'إنشاء طلب يدوي', domain: 'ORDERS' },
  { key: 'orders.status-summary.view', name: 'عرض تقرير الحالات', domain: 'ORDERS' },
  { key: 'orders.returns.view', name: 'عرض المرتجعات', domain: 'ORDERS' },
  { key: 'orders.returns.manage', name: 'إدارة المرتجعات', domain: 'ORDERS' },
  { key: 'orders.returns.approve', name: 'الموافقة على المرتجعات', domain: 'ORDERS' },
  { key: 'orders.shipping.view', name: 'عرض شركات الشحن', domain: 'ORDERS' },
  { key: 'orders.shipping.manage', name: 'إدارة شركات الشحن', domain: 'ORDERS' },
  { key: 'orders.tickets.view', name: 'عرض تذاكر Turbo', domain: 'ORDERS' },
  { key: 'orders.tickets.create', name: 'إنشاء تذكرة Turbo', domain: 'ORDERS' },
  { key: 'orders.tickets.manage', name: 'إدارة تذاكر Turbo', domain: 'ORDERS' },
  { key: 'orders.bulk-search.view', name: 'بحث متقدم في الطلبات', domain: 'ORDERS' },
  { key: 'orders.product-reviews.view', name: 'عرض تقييمات المنتجات', domain: 'ORDERS' },
  { key: 'orders.pos.view', name: 'عرض نقطة البيع', domain: 'ORDERS' },
  { key: 'orders.pos.manage', name: 'إدارة نقطة البيع', domain: 'ORDERS' },
  { key: 'orders.settings.view', name: 'عرض إعدادات الطلبات', domain: 'ORDERS' },
  { key: 'orders.settings.manage', name: 'إدارة إعدادات الطلبات', domain: 'ORDERS' },
  { key: 'orders.customer-blocks.view', name: 'عرض حظر العملاء', domain: 'ORDERS' },
  { key: 'orders.customer-blocks.manage', name: 'إدارة حظر العملاء', domain: 'ORDERS' },
  { key: 'orders.turbo-settings.view', name: 'عرض إعدادات Turbo', domain: 'ORDERS' },
  { key: 'orders.turbo-settings.manage', name: 'إدارة إعدادات Turbo', domain: 'ORDERS' },
  { key: 'orders.return-settings.view', name: 'عرض إعدادات المرتجعات', domain: 'ORDERS' },
  { key: 'orders.return-settings.manage', name: 'إدارة إعدادات المرتجعات', domain: 'ORDERS' },
  { key: 'orders.cancellation-reasons.view', name: 'عرض أسباب الإلغاء', domain: 'ORDERS' },
  { key: 'orders.cancellation-reasons.manage', name: 'إدارة أسباب الإلغاء', domain: 'ORDERS' },
  { key: 'orders.integrations.view', name: 'عرض التكاملات', domain: 'ORDERS' },
  { key: 'orders.integrations.manage', name: 'إدارة التكاملات', domain: 'ORDERS' },
  { key: 'orders.workflow.view', name: 'عرض تدفق العمل', domain: 'ORDERS' },
  { key: 'orders.workflow.manage', name: 'إدارة تدفق العمل', domain: 'ORDERS' },
  { key: 'orders.whatsapp-notifications.view', name: 'عرض إشعارات واتساب', domain: 'ORDERS' },
  { key: 'orders.whatsapp-notifications.manage', name: 'إدارة إشعارات واتساب', domain: 'ORDERS' },
  { key: 'products.view', name: 'عرض المنتجات', domain: 'PRODUCTS' },
  { key: 'products.create', name: 'إنشاء منتج', domain: 'PRODUCTS' },
  { key: 'products.edit', name: 'تعديل منتج', domain: 'PRODUCTS' },
  { key: 'products.delete', name: 'حذف منتج', domain: 'PRODUCTS' },
  { key: 'products.categories', name: 'إدارة التصنيفات', domain: 'PRODUCTS' },
  { key: 'customers.view', name: 'عرض العملاء', domain: 'CUSTOMERS' },
  { key: 'customers.view.all', name: 'عرض كل العملاء', domain: 'CUSTOMERS' },
  { key: 'customers.view.team', name: 'عرض عملاء الفريق', domain: 'CUSTOMERS' },
  { key: 'customers.view.own', name: 'عرض عملائي فقط', domain: 'CUSTOMERS' },
  { key: 'customers.create', name: 'إضافة عميل', domain: 'CUSTOMERS' },
  { key: 'customers.edit', name: 'تعديل عميل', domain: 'CUSTOMERS' },
  { key: 'customers.delete', name: 'حذف عميل', domain: 'CUSTOMERS' },
  { key: 'inbox.view', name: 'عرض صندوق الوارد', domain: 'INBOX' },
  { key: 'inbox.view.all', name: 'عرض كل المحادثات', domain: 'INBOX' },
  { key: 'inbox.view.team', name: 'محادثات الفريق', domain: 'INBOX' },
  { key: 'inbox.view.own', name: 'محادثاتي فقط', domain: 'INBOX' },
  { key: 'inbox.send', name: 'إرسال رسالة', domain: 'INBOX' },
  { key: 'inbox.transfer', name: 'تحويل محادثة', domain: 'INBOX' },
  { key: 'inbox.close', name: 'إنهاء محادثة', domain: 'INBOX' },
  { key: 'inbox.archive', name: 'أرشفة محادثة', domain: 'INBOX' },
  { key: 'notes.create', name: 'إضافة ملاحظة', domain: 'NOTES' },
  { key: 'notes.view', name: 'عرض الملاحظات', domain: 'NOTES' },
  { key: 'notes.view.all', name: 'عرض كل الملاحظات', domain: 'NOTES' },
  { key: 'tags.manage', name: 'إدارة الوسوم', domain: 'TAGS' },
  { key: 'settings.view', name: 'عرض الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.read', name: 'قراءة الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.manage', name: 'تعديل الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.billing', name: 'إدارة الفواتير', domain: 'SETTINGS' },
  { key: 'settings.integrations', name: 'إدارة التكاملات', domain: 'SETTINGS' },
  { key: 'settings.whatsapp.manage', name: 'إدارة واتساب', domain: 'SETTINGS' },
  { key: 'settings.roles.manage', name: 'إدارة الأدوار', domain: 'SETTINGS' },
  { key: 'settings.moderators.manage', name: 'إدارة المشرفين', domain: 'SETTINGS' },
  { key: 'settings.notifications.manage', name: 'إدارة الإشعارات', domain: 'SETTINGS' },
  { key: 'settings.chat.manage', name: 'إدارة الدردشة', domain: 'SETTINGS' },
  { key: 'users.manage', name: 'إدارة المستخدمين', domain: 'USERS' },
  { key: 'users.view', name: 'عرض المستخدمين', domain: 'USERS' },
  { key: 'teams.manage', name: 'إدارة الفرق', domain: 'TEAMS' },
  { key: 'teams.view', name: 'عرض الفرق', domain: 'TEAMS' },
  { key: 'numbers.manage', name: 'إدارة الأرقام', domain: 'NUMBERS' },
  { key: 'numbers.view', name: 'عرض الأرقام', domain: 'NUMBERS' },
  { key: 'numbers.assign', name: 'تعيين رقم', domain: 'NUMBERS' },
  { key: 'notifications.view', name: 'عرض الإشعارات', domain: 'NOTIFICATIONS' },
  { key: 'notifications.manage', name: 'إدارة الإشعارات', domain: 'NOTIFICATIONS' },
  { key: 'reports.view', name: 'عرض التقارير', domain: 'REPORTS' },
  { key: 'reports.view.own', name: 'تقاريري فقط', domain: 'REPORTS' },
  { key: 'reports.view.team', name: 'تقارير الفريق', domain: 'REPORTS' },
  { key: 'reports.view.all', name: 'كل التقارير', domain: 'REPORTS' },
  { key: 'bulkOrders.view', name: 'عرض الطلبات الجماعية', domain: 'BULK_ORDERS' },
  { key: 'bulkOrders.create', name: 'إنشاء طلب جماعي', domain: 'BULK_ORDERS' },
  { key: 'bulkOrders.edit', name: 'تعديل طلب جماعي', domain: 'BULK_ORDERS' },
  { key: 'bulkOrders.delete', name: 'حذف طلب جماعي', domain: 'BULK_ORDERS' },
  { key: 'bulkOrders.export', name: 'تصدير الطلبات الجماعية', domain: 'BULK_ORDERS' },
  { key: 'marketing.campaigns', name: 'إدارة الحملات', domain: 'MARKETING' },
  { key: 'marketing.coupons', name: 'إدارة الكوبونات', domain: 'MARKETING' },
  { key: 'marketing.broadcast', name: 'البث الجماعي', domain: 'MARKETING' },
  { key: 'marketing.whatsapp-campaigns', name: 'حملات واتساب', domain: 'MARKETING' },
  { key: 'hr.employees', name: 'إدارة الموظفين', domain: 'HR' },
  { key: 'hr.attendance', name: 'إدارة الحضور', domain: 'HR' },
  { key: 'hr.payroll', name: 'إدارة الرواتب', domain: 'HR' },
  { key: 'finance.invoices', name: 'إدارة الفواتير', domain: 'FINANCE' },
  { key: 'finance.payments', name: 'إدارة المدفوعات', domain: 'FINANCE' },
  { key: 'ai.config', name: 'إعدادات AI', domain: 'AI' },
  { key: 'ai.agents', name: 'إدارة الوكلاء', domain: 'AI' },
  { key: 'ai.keys', name: 'إدارة المفاتيح', domain: 'AI' },
  { key: 'inventory.view', name: 'عرض المخزون', domain: 'INVENTORY' },
  { key: 'inventory.manage', name: 'إدارة المخزون', domain: 'INVENTORY' },
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

const BUILT_IN_ROLES = {
  OWNER: { name: 'مالك الشركة', description: 'صلاحيات كاملة غير محدودة', priority: 1000, isSystem: true, permissions: ALL_PERMISSION_KEYS },
  COMPANY_ADMIN: { name: 'مدير الشركة', description: 'صلاحيات كاملة لإدارة الشركة', priority: 800, isSystem: true, permissions: ALL_PERMISSION_KEYS.filter(k => !['settings.billing', 'settings.integrations', 'ai.keys', 'ai.config'].includes(k)) },
  MANAGER: { name: 'مدير', description: 'صلاحيات إدارية محدودة', priority: 500, isSystem: true, permissions: ['dashboard.view', 'dashboard.view.all', 'dashboard.view.team', 'analytics.view', 'orders.view', 'orders.create', 'orders.edit', 'orders.status.change', 'orders.assign', 'orders.export', 'orders.preparation.view', 'orders.preparation.manage', 'orders.invoices.view', 'orders.manual.create', 'orders.status-summary.view', 'orders.shipping.view', 'orders.workflow.view', 'orders.settings.view', 'products.view', 'products.create', 'products.edit', 'customers.view', 'customers.view.all', 'customers.view.team', 'customers.create', 'customers.edit', 'inbox.view', 'inbox.view.all', 'inbox.view.team', 'inbox.send', 'inbox.transfer', 'inbox.close', 'notes.create', 'notes.view', 'notes.view.all', 'tags.manage', 'settings.view', 'settings.read', 'settings.notifications.manage', 'users.view', 'teams.view', 'numbers.view', 'notifications.view', 'reports.view', 'reports.view.team', 'reports.view.all', 'bulkOrders.view', 'bulkOrders.create', 'bulkOrders.edit', 'bulkOrders.export', 'marketing.campaigns', 'marketing.coupons', 'marketing.broadcast', 'inventory.view', 'hr.employees', 'hr.attendance'] },
  AGENT: { name: 'موظف', description: 'صلاحيات أساسية للعمل اليومي', priority: 200, isSystem: true, permissions: ['dashboard.view', 'orders.view', 'orders.create', 'orders.status.change', 'orders.preparation.view', 'orders.invoices.view', 'orders.manual.create', 'products.view', 'customers.view', 'customers.view.own', 'customers.create', 'inbox.view', 'inbox.view.own', 'inbox.send', 'inbox.close', 'notes.create', 'notes.view', 'reports.view', 'reports.view.own', 'notifications.view', 'inventory.view'] },
  AFFILIATE: { name: 'مسوق', description: 'صلاحيات التسويق فقط', priority: 100, isSystem: true, permissions: ['marketing.campaigns', 'marketing.coupons', 'reports.view'] },
};

async function sync() {
  console.log('🔍 Syncing permissions and built-in roles...\n');

  // 1. Upsert all permissions
  const permMap = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { name: perm.name, domain: perm.domain },
    });
    permMap[perm.key] = created.id;
  }
  console.log(`✅ ${PERMISSIONS.length} permissions synced`);

  // 2. Sync each built-in role (find by key + __system__ or null companyId)
  for (const [key, def] of Object.entries(BUILT_IN_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { key, OR: [{ companyId: '__system__' }, { companyId: null }] },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          key,
          name: def.name,
          description: def.description,
          priority: def.priority,
          isBuiltIn: true,
          isSystem: def.isSystem,
          companyId: '__system__',
        },
      });
      console.log(`  ➕ Created new role: ${key}`);
    } else if (role.companyId === null) {
      // Fix legacy role with null companyId
      await prisma.role.update({
        where: { id: role.id },
        data: { companyId: '__system__' },
      });
      console.log(`  🔧 Fixed companyId null → __system__ for role: ${key}`);
    }

    // 3. Replace all RolePermission records
    const permIds = def.permissions.map(pk => permMap[pk]).filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permIds.map(permId => ({ roleId: role.id, permissionId: permId })),
    });

    const oldCount = (await prisma.rolePermission.findMany({ where: { roleId: role.id } })).length;
    console.log(`  ✅ ${key}: ${permIds.length} permissions set`);
  }

  console.log('\n🎉 Sync complete!');
  await prisma.$disconnect();
}

sync().catch(e => { console.error('❌', e); process.exit(1); });

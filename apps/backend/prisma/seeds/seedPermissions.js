const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();

const PERMISSIONS = [
  // Dashboard
  { key: 'dashboard.view', name: 'عرض لوحة التحكم', domain: 'DASHBOARD' },
  { key: 'dashboard.view.all', name: 'عرض كل الإحصائيات', domain: 'DASHBOARD' },
  { key: 'dashboard.view.team', name: 'عرض لوحة الفريق', domain: 'DASHBOARD' },
  { key: 'dashboard.view.own', name: 'عرض لوحتي فقط', domain: 'DASHBOARD' },
  { key: 'analytics.view', name: 'عرض التحليلات', domain: 'DASHBOARD' },
  { key: 'analytics.view.own', name: 'عرض تحليلاتي فقط', domain: 'DASHBOARD' },

  // Orders — main
  { key: 'orders.view', name: 'عرض الطلبات', domain: 'ORDERS' },
  { key: 'orders.create', name: 'إنشاء طلب', domain: 'ORDERS' },
  { key: 'orders.edit', name: 'تعديل طلب', domain: 'ORDERS' },
  { key: 'orders.delete', name: 'حذف طلب', domain: 'ORDERS' },
  { key: 'orders.status.change', name: 'تغيير حالة الطلب', domain: 'ORDERS' },
  { key: 'orders.assign', name: 'تعيين طلب لمستخدم', domain: 'ORDERS' },
  { key: 'orders.export', name: 'تصدير الطلبات', domain: 'ORDERS' },
  { key: 'orders.bulk.create', name: 'إنشاء طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.bulk.view', name: 'عرض طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.bulk.edit', name: 'تعديل طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.bulk.delete', name: 'حذف طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.bulk.export', name: 'تصدير طلبات bulk', domain: 'ORDERS' },
  { key: 'orders.invoice.print', name: 'طباعة الفواتير', domain: 'ORDERS' },

  // Orders — Incomplete Orders section
  { key: 'orders.incomplete.view', name: 'عرض الطلبات الناقصة', domain: 'ORDERS' },
  { key: 'orders.incomplete.edit', name: 'تعديل الطلبات الناقصة', domain: 'ORDERS' },
  { key: 'orders.incomplete.delete', name: 'حذف الطلبات الناقصة', domain: 'ORDERS' },

  // Orders — Preparation Queue section
  { key: 'orders.preparation.view', name: 'عرض قائمة التجهيز', domain: 'ORDERS' },
  { key: 'orders.preparation.manage', name: 'إدارة قائمة التجهيز', domain: 'ORDERS' },

  // Orders — Agent Workspace / Confirmation Queue section
  { key: 'orders.workspace.view', name: 'عرض مساحة العمل', domain: 'ORDERS' },
  { key: 'orders.confirmation.view', name: 'عرض تأكيدات الطلبات', domain: 'ORDERS' },
  { key: 'orders.confirmation.manage', name: 'إدارة تأكيدات الطلبات', domain: 'ORDERS' },

  // Orders — Quick Status Change section
  { key: 'orders.quickstatus.view', name: 'عرض تغيير الحالة السريع', domain: 'ORDERS' },
  { key: 'orders.quickstatus.manage', name: 'إدارة تغيير الحالة السريع', domain: 'ORDERS' },

  // Orders — Turbo Records section
  { key: 'orders.turbo.view', name: 'عرض سجلات Turbo', domain: 'ORDERS' },
  { key: 'orders.turbo.manage', name: 'إدارة سجلات Turbo', domain: 'ORDERS' },

  // Orders — Bosta Records section
  { key: 'orders.bosta.view', name: 'عرض سجلات Bosta', domain: 'ORDERS' },
  { key: 'orders.bosta.manage', name: 'إدارة سجلات Bosta', domain: 'ORDERS' },

  // Orders — Stats section
  { key: 'orders.stats.view', name: 'عرض إحصائيات الطلبات', domain: 'ORDERS' },

  // Orders — Automation
  { key: 'orders.automation.view', name: 'عرض أتمتة الطلبات', domain: 'ORDERS' },
  { key: 'orders.automation.manage', name: 'إدارة أتمتة الطلبات', domain: 'ORDERS' },

  // Orders — Invoices section
  { key: 'orders.invoices.view', name: 'عرض فواتير الطلبات', domain: 'ORDERS' },
  { key: 'orders.invoices.manage', name: 'إدارة فواتير الطلبات', domain: 'ORDERS' },
  { key: 'orders.invoices.print', name: 'طباعة فواتير الطلبات', domain: 'ORDERS' },

  // Orders — Manual Order
  { key: 'orders.manual.create', name: 'إنشاء طلب يدوي', domain: 'ORDERS' },

  // Orders — Status Summary Report
  { key: 'orders.status-summary.view', name: 'عرض تقرير الحالات', domain: 'ORDERS' },

  // Orders — Returns
  { key: 'orders.returns.view', name: 'عرض المرتجعات', domain: 'ORDERS' },
  { key: 'orders.returns.manage', name: 'إدارة المرتجعات', domain: 'ORDERS' },
  { key: 'orders.returns.approve', name: 'الموافقة على المرتجعات', domain: 'ORDERS' },

  // Orders — Shipping Companies
  { key: 'orders.shipping.view', name: 'عرض شركات الشحن', domain: 'ORDERS' },
  { key: 'orders.shipping.manage', name: 'إدارة شركات الشحن', domain: 'ORDERS' },

  // Internal Courier Fleet
  { key: 'courier.view', name: 'عرض أسطول المناديب', domain: 'COURIER_FLEET' },
  { key: 'courier.manage', name: 'إدارة وتعديل المناديب', domain: 'COURIER_FLEET' },
  { key: 'courier.runs.view', name: 'عرض رحلات التوزيع والمانيفست', domain: 'COURIER_FLEET' },
  { key: 'courier.runs.manage', name: 'إنشاء وإسناد رحلات التوزيع', domain: 'COURIER_FLEET' },
  { key: 'courier.settlement.view', name: 'عرض تسويات وتوريد المناديب', domain: 'COURIER_FLEET' },
  { key: 'courier.settlement.manage', name: 'إجراء تسويات وتوريد النقدية', domain: 'COURIER_FLEET' },
  { key: 'courier.settings.view', name: 'عرض إعدادات أسطول المناديب', domain: 'COURIER_FLEET' },
  { key: 'courier.settings.manage', name: 'تعديل إعدادات أسطول المناديب', domain: 'COURIER_FLEET' },

  // Orders — Turbo Tickets
  { key: 'orders.tickets.view', name: 'عرض تذاكر Turbo', domain: 'ORDERS' },
  { key: 'orders.tickets.create', name: 'إنشاء تذكرة Turbo', domain: 'ORDERS' },
  { key: 'orders.tickets.manage', name: 'إدارة تذاكر Turbo', domain: 'ORDERS' },

  // Orders — Bulk Search
  { key: 'orders.bulk-search.view', name: 'عرض البحث المجمع', domain: 'ORDERS' },

  // Orders — POS (Point of Sale)
  { key: 'orders.pos.view', name: 'عرض نقطة البيع', domain: 'ORDERS' },
  { key: 'orders.pos.manage', name: 'إدارة نقطة البيع', domain: 'ORDERS' },

  // Orders — Order Settings
  { key: 'orders.settings.view', name: 'عرض إعدادات الطلبات', domain: 'ORDERS' },
  { key: 'orders.settings.manage', name: 'إدارة إعدادات الطلبات', domain: 'ORDERS' },

  // Orders — Customer Blocks
  { key: 'orders.customer-blocks.view', name: 'عرض حظر العملاء', domain: 'ORDERS' },
  { key: 'orders.customer-blocks.manage', name: 'إدارة حظر العملاء', domain: 'ORDERS' },

  // Orders — Turbo Settings
  { key: 'orders.turbo-settings.view', name: 'عرض إعدادات Turbo', domain: 'ORDERS' },
  { key: 'orders.turbo-settings.manage', name: 'إدارة إعدادات Turbo', domain: 'ORDERS' },

  // Orders — Return Settings
  { key: 'orders.return-settings.view', name: 'عرض إعدادات المرتجعات', domain: 'ORDERS' },
  { key: 'orders.return-settings.manage', name: 'إدارة إعدادات المرتجعات', domain: 'ORDERS' },

  // Orders — Cancellation Reasons
  { key: 'orders.cancellation-reasons.view', name: 'عرض أسباب الإلغاء', domain: 'ORDERS' },
  { key: 'orders.cancellation-reasons.manage', name: 'إدارة أسباب الإلغاء', domain: 'ORDERS' },

  // Orders — Platform Integrations
  { key: 'orders.integrations.view', name: 'عرض التكاملات', domain: 'ORDERS' },
  { key: 'orders.integrations.manage', name: 'إدارة التكاملات', domain: 'ORDERS' },

  // Orders — Order Workflow
  { key: 'orders.workflow.view', name: 'عرض مسار الطلبات', domain: 'ORDERS' },
  { key: 'orders.workflow.manage', name: 'إدارة مسار الطلبات', domain: 'ORDERS' },

  // Orders — Product Reviews
  { key: 'orders.product-reviews.view', name: 'عرض تقييمات المنتجات', domain: 'ORDERS' },

  // Orders — WhatsApp Order Notifications
  { key: 'orders.whatsapp-notifications.view', name: 'عرض إشعارات واتساب للطلبات', domain: 'ORDERS' },
  { key: 'orders.whatsapp-notifications.manage', name: 'إدارة إشعارات واتساب للطلبات', domain: 'ORDERS' },

  // Products
  { key: 'products.view', name: 'عرض المنتجات', domain: 'PRODUCTS' },
  { key: 'products.create', name: 'إنشاء منتج', domain: 'PRODUCTS' },
  { key: 'products.edit', name: 'تعديل منتج', domain: 'PRODUCTS' },
  { key: 'products.delete', name: 'حذف منتج', domain: 'PRODUCTS' },
  { key: 'products.categories.manage', name: 'إدارة التصنيفات', domain: 'PRODUCTS' },

  // Customers
  { key: 'customers.view', name: 'عرض العملاء', domain: 'CUSTOMERS' },
  { key: 'customers.view.all', name: 'عرض كل العملاء', domain: 'CUSTOMERS' },
  { key: 'customers.view.team', name: 'عرض عملاء الفريق', domain: 'CUSTOMERS' },
  { key: 'customers.view.own', name: 'عرض عملائي فقط', domain: 'CUSTOMERS' },
  { key: 'customers.create', name: 'إضافة عميل', domain: 'CUSTOMERS' },
  { key: 'customers.edit', name: 'تعديل عميل', domain: 'CUSTOMERS' },
  { key: 'customers.delete', name: 'حذف عميل', domain: 'CUSTOMERS' },
  { key: 'customers.export', name: 'تصدير العملاء', domain: 'CUSTOMERS' },

  // Conversations (Inbox)
  { key: 'inbox.view', name: 'عرض المحادثات', domain: 'CONVERSATIONS' },
  { key: 'inbox.view.all', name: 'عرض كل المحادثات', domain: 'CONVERSATIONS' },
  { key: 'inbox.view.team', name: 'عرض محادثات الفريق', domain: 'CONVERSATIONS' },
  { key: 'inbox.view.own', name: 'عرض محادثاتي فقط', domain: 'CONVERSATIONS' },
  { key: 'inbox.send', name: 'إرسال رسالة', domain: 'CONVERSATIONS' },
  { key: 'inbox.transfer', name: 'تحويل محادثة', domain: 'CONVERSATIONS' },
  { key: 'inbox.close', name: 'إغلاق محادثة', domain: 'CONVERSATIONS' },
  { key: 'inbox.archive', name: 'أرشفة محادثة', domain: 'CONVERSATIONS' },

  // Notes & Tags
  { key: 'notes.create', name: 'إنشاء ملاحظة', domain: 'CONVERSATIONS' },
  { key: 'notes.view', name: 'عرض الملاحظات', domain: 'CONVERSATIONS' },
  { key: 'notes.view.all', name: 'عرض كل الملاحظات', domain: 'CONVERSATIONS' },
  { key: 'tags.manage', name: 'إدارة الوسوم', domain: 'CONVERSATIONS' },

  // Settings
  { key: 'settings.view', name: 'عرض الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.read', name: 'قراءة الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.manage', name: 'إدارة الإعدادات', domain: 'SETTINGS' },
  { key: 'settings.whatsapp', name: 'إدارة واتساب', domain: 'SETTINGS' },
  { key: 'settings.whatsapp.manage', name: 'إدارة إعدادات واتساب', domain: 'SETTINGS' },
  { key: 'settings.roles.manage', name: 'إدارة إعدادات الأدوار', domain: 'SETTINGS' },
  { key: 'settings.moderators.manage', name: 'إدارة المشرفين', domain: 'SETTINGS' },
  { key: 'settings.notifications.manage', name: 'إدارة الإشعارات', domain: 'SETTINGS' },
  { key: 'settings.chat.manage', name: 'إعدادات الشات', domain: 'SETTINGS' },
  { key: 'settings.integrations', name: 'إدارة التكاملات', domain: 'SETTINGS' },
  { key: 'settings.billing', name: 'إدارة الفواتير', domain: 'SETTINGS' },

  // Users
  { key: 'users.view', name: 'عرض المستخدمين', domain: 'USERS' },
  { key: 'users.manage', name: 'إدارة المستخدمين', domain: 'USERS' },
  { key: 'users.invite', name: 'دعوة مستخدم', domain: 'USERS' },
  { key: 'users.edit', name: 'تعديل مستخدم', domain: 'USERS' },
  { key: 'users.delete', name: 'حذف مستخدم', domain: 'USERS' },

  // Roles
  { key: 'roles.view', name: 'عرض الصلاحيات', domain: 'ROLES' },
  { key: 'roles.manage', name: 'إدارة الصلاحيات', domain: 'ROLES' },
  { key: 'roles.assign', name: 'تعيين صلاحيات', domain: 'ROLES' },

  // Teams
  { key: 'teams.view', name: 'عرض الفرق', domain: 'USERS' },
  { key: 'teams.manage', name: 'إدارة الفرق', domain: 'USERS' },

  // Reports
  { key: 'reports.view', name: 'عرض التقارير', domain: 'REPORTS' },
  { key: 'reports.view.own', name: 'عرض تقاريري', domain: 'REPORTS' },
  { key: 'reports.view.team', name: 'عرض تقارير الفريق', domain: 'REPORTS' },
  { key: 'reports.view.all', name: 'عرض كل التقارير', domain: 'REPORTS' },
  { key: 'reports.export', name: 'تصدير التقارير', domain: 'REPORTS' },

  // WhatsApp
  { key: 'whatsapp.sessions', name: 'إدارة جلسات واتساب', domain: 'WHATSAPP' },
  { key: 'whatsapp.templates', name: 'إدارة القوالب', domain: 'WHATSAPP' },
  { key: 'whatsapp.settings', name: 'إعدادات واتساب', domain: 'WHATSAPP' },
  { key: 'whatsapp.reply', name: 'الرد على رسائل واتساب', domain: 'WHATSAPP' },
  { key: 'whatsapp.broadcast', name: 'البث الجماعي', domain: 'WHATSAPP' },
  { key: 'whatsapp.groups.manage', name: 'إدارة المجموعات', domain: 'WHATSAPP' },
  { key: 'whatsapp.chats.manage', name: 'إدارة المحادثات', domain: 'WHATSAPP' },
  { key: 'whatsapp.contacts.manage', name: 'إدارة جهات الاتصال', domain: 'WHATSAPP' },
  { key: 'whatsapp.labels.manage', name: 'إدارة العلامات', domain: 'WHATSAPP' },
  { key: 'whatsapp.analytics.view', name: 'عرض تحليلات واتساب', domain: 'WHATSAPP' },
  { key: 'whatsapp.quick-replies.manage', name: 'إدارة الردود السريعة', domain: 'WHATSAPP' },

  // Facebook
  { key: 'facebook.pages', name: 'إدارة الصفحات', domain: 'FACEBOOK' },
  { key: 'facebook.ads', name: 'إدارة الإعلانات', domain: 'FACEBOOK' },
  { key: 'facebook.messaging', name: 'إدارة الرسايل', domain: 'FACEBOOK' },

  // Number Assignments
  { key: 'numbers.view', name: 'عرض الأرقام', domain: 'WHATSAPP' },
  { key: 'numbers.manage', name: 'إدارة الأرقام', domain: 'WHATSAPP' },
  { key: 'numbers.assign', name: 'تعيين الأرقام', domain: 'WHATSAPP' },

  // Notifications
  { key: 'notifications.view', name: 'عرض الإشعارات', domain: 'SETTINGS' },
  { key: 'notifications.manage', name: 'إدارة الإشعارات', domain: 'SETTINGS' },

  // Bulk Orders (legacy)
  { key: 'bulkOrders.view', name: 'عرض الطلبات bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.create', name: 'إنشاء طلب bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.edit', name: 'تعديل طلب bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.delete', name: 'حذف طلب bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.export', name: 'تصدير طلبات bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.import', name: 'استيراد طلبات bulk', domain: 'ORDERS' },
  { key: 'bulkOrders.execute', name: 'تنفيذ طلبات bulk', domain: 'ORDERS' },

  // Marketing
  { key: 'marketing.campaigns', name: 'إدارة الحملات', domain: 'MARKETING' },
  { key: 'marketing.coupons', name: 'إدارة الكوبونات', domain: 'MARKETING' },
  { key: 'marketing.broadcast', name: 'البث الجماعي', domain: 'MARKETING' },

  // Storefront
  { key: 'storefront.theme', name: 'تعديل الثيم', domain: 'STOREFRONT' },
  { key: 'storefront.pages', name: 'إدارة الصفحات', domain: 'STOREFRONT' },

  // HR
  { key: 'hr.employees', name: 'إدارة الموظفين', domain: 'HR' },
  { key: 'hr.attendance', name: 'إدارة الحضور', domain: 'HR' },
  { key: 'hr.payroll', name: 'إدارة الرواتب', domain: 'HR' },

  // Finance
  { key: 'finance.invoices', name: 'إدارة الفواتير', domain: 'FINANCE' },
  { key: 'finance.payments', name: 'إدارة المدفوعات', domain: 'FINANCE' },

  // AI
  { key: 'ai.config', name: 'إعدادات AI', domain: 'AI' },
  { key: 'ai.agents', name: 'إدارة الوكلاء', domain: 'AI' },
  { key: 'ai.keys', name: 'إدارة المفاتيح', domain: 'AI' },

  // Inventory
  { key: 'inventory.view', name: 'عرض المخزون', domain: 'INVENTORY' },
  { key: 'inventory.manage', name: 'إدارة المخزون', domain: 'INVENTORY' },
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

const BUILT_IN_ROLES = {
  OWNER: {
    name: 'مالك الشركة',
    description: 'صلاحيات كاملة غير محدودة',
    priority: 1000,
    isSystem: true,
    permissions: ALL_PERMISSION_KEYS,
  },
  COMPANY_ADMIN: {
    name: 'مدير الشركة',
    description: 'صلاحيات كاملة لإدارة الشركة',
    priority: 800,
    isSystem: true,
    permissions: ALL_PERMISSION_KEYS.filter(k =>
      !['settings.billing', 'settings.integrations', 'ai.keys', 'ai.config'].includes(k)
    ),
  },
  MANAGER: {
    name: 'مدير',
    description: 'صلاحيات إدارية محدودة',
    priority: 500,
    isSystem: true,
    permissions: [
      'dashboard.view', 'dashboard.view.all', 'dashboard.view.team',
      'analytics.view',
      'orders.view', 'orders.create', 'orders.edit', 'orders.status.change', 'orders.assign', 'orders.export',
      'orders.preparation.view', 'orders.preparation.manage',
      'orders.invoices.view', 'orders.manual.create', 'orders.status-summary.view',
      'orders.shipping.view', 'orders.workflow.view', 'orders.settings.view',
      'products.view', 'products.create', 'products.edit',
      'customers.view', 'customers.view.all', 'customers.view.team',
      'customers.create', 'customers.edit',
      'inbox.view', 'inbox.view.all', 'inbox.view.team',
      'inbox.send', 'inbox.transfer', 'inbox.close',
      'notes.create', 'notes.view', 'notes.view.all',
      'tags.manage',
      'settings.view', 'settings.read',
      'settings.notifications.manage',
      'users.view',
      'teams.view',
      'numbers.view',
      'notifications.view',
      'reports.view', 'reports.view.team', 'reports.view.all',
      'bulkOrders.view', 'bulkOrders.create', 'bulkOrders.edit', 'bulkOrders.export',
      'marketing.campaigns', 'marketing.coupons', 'marketing.broadcast',
      'inventory.view',
      'hr.employees', 'hr.attendance',
      'whatsapp.reply', 'whatsapp.broadcast', 'whatsapp.groups.manage',
      'whatsapp.chats.manage', 'whatsapp.contacts.manage', 'whatsapp.labels.manage',
      'whatsapp.analytics.view', 'whatsapp.quick-replies.manage',
    ],
  },
  AGENT: {
    name: 'موظف',
    description: 'صلاحيات أساسية للعمل اليومي',
    priority: 200,
    isSystem: true,
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.create', 'orders.status.change',
      'orders.preparation.view',
      'orders.invoices.view', 'orders.manual.create',
      'products.view',
      'customers.view', 'customers.view.own',
      'customers.create',
      'inbox.view', 'inbox.view.own',
      'inbox.send', 'inbox.close',
      'notes.create', 'notes.view',
      'reports.view', 'reports.view.own',
      'notifications.view',
      'inventory.view',
      'whatsapp.reply',
      'whatsapp.quick-replies.manage',
    ],
  },
  AFFILIATE: {
    name: 'مسوق',
    description: 'صلاحيات التسويق فقط',
    priority: 100,
    isSystem: true,
    permissions: [
      'marketing.campaigns', 'marketing.coupons',
      'reports.view',
      'products.view', 'products.create',
    ],
  },
};

async function seed() {
  console.log('🌱 Seeding permissions and roles...');

  // Upsert all permissions
  const permissionMap = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { name: perm.name, domain: perm.domain },
    });
    permissionMap[perm.key] = created.id;
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);

  // Upsert built-in roles (no companyId = global)
  for (const [key, role] of Object.entries(BUILT_IN_ROLES)) {
    let dbRole = await prisma.role.findFirst({
      where: { key, OR: [{ companyId: '__system__' }, { companyId: null }] },
    });

    if (dbRole) {
      dbRole = await prisma.role.update({
        where: { id: dbRole.id },
        data: {
          name: role.name,
          description: role.description,
          priority: role.priority,
        },
      });
      if (dbRole.companyId === null) {
        await prisma.role.update({
          where: { id: dbRole.id },
          data: { companyId: '__system__' },
        });
      }
    } else {
      dbRole = await prisma.role.create({
        data: {
          key,
          name: role.name,
          description: role.description,
          priority: role.priority,
          isBuiltIn: true,
          isSystem: role.isSystem,
          companyId: '__system__',
        },
      });
    }

    // Set permissions for this role
    const permIds = role.permissions.map(pk => permissionMap[pk]).filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: dbRole.id } });
    await prisma.rolePermission.createMany({
      data: permIds.map(permId => ({ roleId: dbRole.id, permissionId: permId })),
    });

    console.log(`✅ Role "${key}" seeded with ${permIds.length} permissions`);
  }

  console.log('🎉 Seed complete!');
}

module.exports = { PERMISSIONS, BUILT_IN_ROLES };

if (require.main === module) {
  seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

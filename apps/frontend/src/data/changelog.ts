/**
 * Changelog Data File
 * سجل التغييرات والتحديثات
 *
 * How to add new entries:
 * 1. Add a new object to the changelog array at the TOP
 * 2. Include: version, date, type, title, description
 *
 * Types:
 * - 'feature': ✨ ميزة جديدة
 * - 'fix': 🐛 إصلاح خطأ
 * - 'improvement': 🔧 تحسين
 */

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  type: "feature" | "fix" | "improvement";
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

export const changelog: ChangelogEntry[] = [
  // 🔝 Add new entries at the TOP of this array
  {
    id: "v2.8.3-task-visibility-and-auto-testing",
    version: "2.8.3",
    date: "2026-01-21",
    type: "feature",
    title: "Task Details Visibility & Enhanced Auto-Testing",
    titleAr: "👁️ تحكم في ظهور تفاصيل المهام وتحسين الاختبار التلقائي",
    description:
      "New settings to toggle visibility of task details (Description, Checklists, Attachments, etc.). Enhanced verification/testing workflow: Auto-created testing subtasks now include a full copy of the original task's description, checklists (reset), and attachments.",
    descriptionAr:
      "إعدادات جديدة للتحكم في ظهور أجزاء تفاصيل المهمة (الوصف، المرفقات، القوائم، إلخ). تحسين سير عمل الاختبار: مهام الاختبار المنشأة تلقائياً أصبحت الآن نسخة طبق الأصل من المهمة الأصلية شاملة الوصف والمرفقات وقوائم التحقق (مع إعادة تعيينها).",
  },
  {
    id: "v2.8.1-auto-testing-subtask",
    version: "2.8.1",
    date: "2026-01-16",
    type: "feature",
    title: "Auto-Create Testing Subtask",
    titleAr: "🤖 إنشاء مهام اختبار تلقائياً",
    description:
      'Added a new automation setting in Development Settings to automatically create a "Testing" subtask when a parent task is moved to "DONE". Includes automatic assignment to a specific QA member and infinite loop prevention.',
    descriptionAr:
      'إضافة إعداد تشغيل آلي جديد في إعدادات التطوير لإنشاء مهمة فرعية للاختبار تلقائياً عند تحويل المهمة الرئيسية إلى "تم الإنجاز" (DONE). يتضمن أيضاً إمكانية تعيين هذه المهام تلقائياً لعضو محدد ومنع التكرار اللانهائي.',
  },
  {
    id: "v2.8.0-order-management-reorganization",
    version: "2.8.0",
    date: "2026-01-16",
    type: "improvement",
    title: "Order Management Section Reorganization",
    titleAr: "🔧 إعادة تنظيم قسم إدارة الطلبات",
    description:
      "Complete reorganization of the Orders Management section in the sidebar. Moved Order Settings, Order Status Management, and Bulk Search from other sections into a unified Orders section. All order-related tools are now grouped together for better organization and easier access.",
    descriptionAr:
      "إعادة تنظيم شاملة لقسم إدارة الطلبات في القائمة الجانبية. تم نقل إعدادات الطلبات، إدارة حالات الطلبات، والبحث الجماعي من أقسام أخرى إلى قسم موحد للطلبات. جميع أدوات الطلبات الآن مجمعة معاً لتنظيم أفضل وسهولة الوصول.",
  },
  {
    id: "v2.7.3-order-status-integration",
    version: "2.7.3",
    date: "2026-01-16",
    type: "fix",
    title: "Order Status Manager Integration",
    titleAr: "🐛 إصلاح تكامل إدارة حالات الطلبات",
    description:
      "Fixed Order Status Manager page not being accessible. Added missing route and import in App.tsx. The page now properly displays at /settings/order-status and allows full customization of order statuses.",
    descriptionAr:
      "تم إصلاح عدم إمكانية الوصول لصفحة إدارة حالات الطلبات. تمت إضافة المسار المفقود والاستيراد في App.tsx. الصفحة الآن تعمل بشكل صحيح على /settings/order-status وتسمح بتخصيص كامل لحالات الطلبات.",
  },
  {
    id: "v2.7.2-order-payment-status-separation",
    version: "2.7.2",
    date: "2026-01-16",
    type: "improvement",
    title: "Order Status & Payment Status Independence",
    titleAr: "📊 استقلالية حالة الطلب وحالة الدفع",
    description:
      "Clarified the separation between Order Status (tracking product/shipment lifecycle) and Payment Status (tracking payment lifecycle). Confirmed through code review that updating one does not affect the other, providing maximum flexibility for handling COD orders, partial payments, and various business scenarios.",
    descriptionAr:
      "توضيح الفصل بين حالة الطلب (تتبع دورة حياة المنتج/الشحنة) وحالة الدفع (تتبع دورة حياة الدفع). تم التأكيد من خلال مراجعة الكود أن تحديث أحدهما لا يؤثر على الآخر، مما يوفر أقصى مرونة للتعامل مع الدفع عند الاستلام والدفعات الجزئية وسيناريوهات الأعمال المختلفة.",
  },
  {
    id: "v2.8.0-owner-dashboard-2",
    version: "2.8.0",
    date: "2026-01-16",
    type: "feature",
    title: "Owner Dashboard 2.0 & Unified Analytics",
    titleAr: "📊 لوحة تحكم المالك 2.0 والتحليلات الموحدة",
    description:
      "Major visualization upgrade for Owner Dashboard. Added Unified Sales Statistics (Total Sales, Orders, Growth), Unread Message Counts, Low Stock Alerts, Subscription Expiry Warnings, and Quick Company Switcher.",
    descriptionAr:
      "تحديث شامل للوحة تحكم المالك. إضافة إحصائيات المبيعات الموحدة (إجمالي المبيعات، الطلبات، النمو)، عداد الرسائل غير المقروءة، تنبيهات انخفاض المخزون، تحذيرات انتهاء الاشتراكات، ومبدل الشركات السريع.",
  },
  {
    id: "v2.7.1-variant-deletion-fix",
    version: "2.7.1",
    date: "2026-01-16",
    type: "fix",
    title: "Product Variant Deletion Fix",
    titleAr: "🐛 إصلاح حذف متغيرات المنتج",
    description:
      "Fixed a critical bug where deleted product variants were not removed from the database when updating a product. Added the missing DELETE API route and implemented proper tracking of deleted variants in the frontend.",
    descriptionAr:
      "تم إصلاح خطأ حرج حيث لم تكن المتغيرات المحذوفة تُزال من قاعدة البيانات عند تحديث المنتج. تمت إضافة route الحذف المفقود وتنفيذ تتبع صحيح للمتغيرات المحذوفة في الواجهة الأمامية.",
  },
  {
    id: "v2.7.0-shipping-overhaul",
    version: "2.7.0",
    date: "2026-01-14",
    type: "feature",
    title: "Advanced Shipping System (WooCommerce Style)",
    titleAr: "🚚 نظام الشحن المتقدم (Zones & Methods)",
    description:
      "Complete overhaul of the shipping system. Introduced Shipping Zones and Multiple Shipping Methods (Standard, Express, etc.) per zone. Added Arabic text normalization for governorate matching and replaced free-text city input with a curated dropdown list for 100% accuracy.",
    descriptionAr:
      "إعادة هيكلة شاملة لنظام الشحن. تقديم مناطق الشحن (Zones) وطرق شحن متعددة لكل منطقة (عادي، سريع، إلخ). إضافة تطبيع النصوص العربية لمطابقة المحافظات واستبدال إدخال المدينة اليدوي بقائمة منسدلة لضمان دقة 100%.",
  },
  {
    id: "v2.6.1-frontend-api-fixes",
    version: "2.6.1",
    date: "2026-01-14",
    type: "fix",
    title: "Storefront Fixes & TypeScript Stability",
    titleAr: "🛠️ إصلاحات لصفحة المتجر واستقرار TypeScript",
    description:
      "Fixed 401 Unauthorized errors on Product Details page by correcting the shipping calculation endpoint. Resolved multiple TypeScript strict-mode errors and fixed reference error in company middleware.",
    descriptionAr:
      "تم إصلاح أخطاء 401 Unauthorized في صفحة تفاصيل المنتج وتصحيح رابط API لحساب الشحن. معالجة العديد من أخطاء TypeScript وإصلاح خطأ ReferenceError في الـ middleware.",
  },

  {
    id: "v2.6.0-time-tracking-dashboard",
    version: "2.6.0",
    date: "2026-01-14",
    type: "feature",
    title: "Time Tracking & Productivity Dashboard",
    titleAr: "⏱️ لوحة تحكم تتبع الوقت والإنتاجية",
    description:
      "Complete time tracking dashboard for Super Admin with live activity monitoring, team performance analytics, time logs, date range filters, auto-refresh, export functionality (CSV/JSON), and full dark mode support. Enhanced time display showing days, hours, and minutes in Arabic.",
    descriptionAr:
      "لوحة تحكم شاملة لتتبع الوقت للسوبر أدمن مع مراقبة النشاط المباشر، تحليلات أداء الفريق، سجلات الوقت، فلاتر النطاق الزمني، التحديث التلقائي، تصدير البيانات (CSV/JSON)، ودعم كامل للوضع الليلي. عرض محسّن للوقت بالأيام والساعات والدقائق بالعربية.",
  },
  {
    id: "v2.5.3-owner-section",
    version: "2.5.3",
    date: "2026-01-14",
    type: "feature",
    title: "Owner Section in Sidebar",
    titleAr: "قسم إدارة الملكية في القائمة الجانبية",
    description:
      "Added a dedicated sidebar section for OWNER role with My Companies Dashboard and Unified HR.",
    descriptionAr:
      "تم إضافة قسم خاص للمالك يحتوي على لوحة تحكم شركاتي والموارد البشرية الموحدة.",
  },
  {
    id: "v2.5.2-owner-permissions",
    version: "2.5.2",
    date: "2026-01-14",
    type: "fix",
    title: "Fixed OWNER Role Permissions",
    titleAr: "إصلاح صلاحيات دور المالك",
    description:
      "Fixed 100+ backend endpoints to properly include OWNER role permissions. OWNER now has full access to HR, Company Management, and all admin features.",
    descriptionAr:
      "تم إصلاح أكثر من 100 endpoint في الباك اند لتضمين صلاحيات دور المالك. الآن المالك لديه صلاحية كاملة للموارد البشرية وإدارة الشركة وجميع المزايا الإدارية.",
  },
  {
    id: "v2.5.1-hr-sidebar",
    version: "2.5.1",
    date: "2026-01-14",
    type: "fix",
    title: "HR Section Visibility for OWNER",
    titleAr: "ظهور قسم الموارد البشرية للمالك",
    description:
      "Fixed HR section not appearing in sidebar for OWNER role. Layout.tsx was using hardcoded roles without OWNER.",
    descriptionAr:
      "تم إصلاح عدم ظهور قسم الموارد البشرية في القائمة الجانبية لدور المالك.",
  },
  {
    id: "v2.5.0-super-admin-companies",
    version: "2.5.0",
    date: "2026-01-13",
    type: "feature",
    title: "Super Admin Company Management",
    titleAr: "إدارة الشركات للسوبر ادمن",
    description:
      "Added complete company management features for Super Admin including: Add Employee, Change Owner, View Company Details.",
    descriptionAr:
      "تم إضافة ميزات إدارة الشركات الكاملة للسوبر ادمن بما في ذلك: إضافة موظف، تغيير المالك، عرض تفاصيل الشركة.",
  },
  {
    id: "v2.4.5-unified-dashboard",
    version: "2.4.5",
    date: "2026-01-12",
    type: "feature",
    title: "Unified HR Dashboard",
    titleAr: "لوحة تحكم الموارد البشرية الموحدة",
    description:
      "New unified dashboard for managing HR across multiple companies.",
    descriptionAr:
      "لوحة تحكم موحدة جديدة لإدارة الموارد البشرية عبر شركات متعددة.",
  },
  {
    id: "v2.4.0-dev-tasks",
    version: "2.4.0",
    date: "2026-01-10",
    type: "feature",
    title: "Development Tasks System",
    titleAr: "نظام مهام التطوير",
    description:
      "Complete task management system for development team with Kanban board, priorities, and assignments.",
    descriptionAr:
      "نظام إدارة مهام كامل لفريق التطوير مع لوحة كانبان والأولويات والتعيينات.",
  },
  {
    id: "v2.3.5-performance",
    version: "2.3.5",
    date: "2026-01-08",
    type: "improvement",
    title: "Performance Optimizations",
    titleAr: "تحسينات الأداء",
    description:
      "Improved database queries and reduced API response times by 40%.",
    descriptionAr:
      "تحسين استعلامات قاعدة البيانات وتقليل وقت استجابة API بنسبة 40%.",
  },
];

// Helper functions
export const getChangelogByType = (type: ChangelogEntry["type"]) =>
  changelog.filter((entry) => entry.type === type);

export const getLatestChanges = (count: number = 5) =>
  changelog.slice(0, count);

export const getChangelogByVersion = (version: string) =>
  changelog.filter((entry) => entry.version === version);

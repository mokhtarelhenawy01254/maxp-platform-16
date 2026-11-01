/**
 * أدوات نقية (بدون Prisma) لبناء قائمة المسوقين المستخدمة في فلاتر صفحة الطلبات.
 *
 * مصدر الحقيقة الوحيد هو "من يملك العمولة فعليًا" على طلبات الشركة، وليس الدور الوظيفي فقط:
 *  (أ) كل سجلات Affiliate الخاصة بالشركة (المصدر المالي).
 *  (ب) أعضاء UserCompany بدور AFFILIATE وليست لديهم سجل Affiliate (تظهر كـ PENDING).
 *  (ج) كل affiliateId موجود على طلبات الشركة حتى لو كان المسوق مسجلًا في شركة أخرى.
 *  (د) أي سجل Affiliate يملكه عضو في هذه الشركة لكنه مسجل في شركة أخرى (بادج "مسوق في شركة تانية").
 */

const AFFILIATE_MEMBERSHIP_ROLE = 'AFFILIATE';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value) => Math.round(toNumber(value) * 100) / 100;

const buildDisplayName = (user) => {
  if (!user) return '';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email || user.phone || '';
};

/**
 * المسوق مسجل في شركة أخرى غير الشركة الحالية
 */
const isOtherCompanyAffiliate = (affiliate, companyId) =>
  Boolean(affiliate && affiliate.companyId && companyId && affiliate.companyId !== companyId);

/**
 * تطبيع قائمة معرفات المسوقين القادمة من الـ query (نص مفصول بفواصل أو مصفوفة)
 */
const normalizeAffiliateIdList = (rawValue) => {
  const source = Array.isArray(rawValue) ? rawValue : String(rawValue ?? '').split(',');
  const seen = new Set();
  const ids = [];

  source.forEach((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === 'null' || normalized === 'undefined') return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    ids.push(normalized);
  });

  return ids;
};

/**
 * شرط Prisma للفلترة على orders.affiliateId.
 * يعيد null عند عدم وجود معرفات (أي بدون فلترة)، ولا ينتج أبدًا شرطًا يسمح بـ affiliateId = null.
 */
const buildAffiliateOrderWhere = (rawValue) => {
  const ids = normalizeAffiliateIdList(rawValue);
  if (ids.length === 0) return null;
  if (ids.length === 1) return { affiliateId: ids[0] };
  return { affiliateId: { in: ids } };
};

/**
 * فهرس عدد الطلبات لكل مسوق من نتيجة groupBy على الطلبات
 */
const buildOrderCountIndex = (orderStats = []) => {
  const index = new Map();
  orderStats.forEach((stat) => {
    const affiliateId = stat?.affiliateId;
    if (!affiliateId) return;
    const count = toNumber(stat?._count?._all ?? stat?._count?.id ?? stat?.count);
    index.set(String(affiliateId), count);
  });
  return index;
};

/**
 * فهرس العمولات لكل مسوق من نتيجة groupBy على جدول العمولات
 */
const buildCommissionIndex = (commissionStats = []) => {
  const index = new Map();
  commissionStats.forEach((stat) => {
    const affiliateId = stat?.affiliateId;
    if (!affiliateId) return;
    index.set(String(affiliateId), {
      commissionOrderCount: toNumber(
        stat?._count?.orderId ?? stat?._count?._all ?? stat?.count,
      ),
      totalCommission: toMoney(stat?._sum?.amount ?? stat?.total),
    });
  });
  return index;
};

/**
 * ترتيب الصفوف: الأكثر طلبات أولًا ثم الأعلى عمولة ثم الاسم
 */
const sortMarketerRows = (rows = []) =>
  [...rows].sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    if (b.totalCommission !== a.totalCommission) {
      return b.totalCommission - a.totalCommission;
    }
    return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
  });

/**
 * دمج المصادر الأربعة في قائمة واحدة بدون تكرار (المفتاح: userId ثم affiliateId)
 *
 * @returns {Array<object>} صفوف موحدة تحتوي الاسم والكود وعدد الطلبات والعمولة وبادج الشركة الأخرى
 */
const mergeAffiliateMarketers = ({
  companyId,
  ownAffiliates = [],
  linkedAffiliates = [],
  memberships = [],
  orderStats = [],
  commissionStats = [],
} = {}) => {
  const rows = new Map();

  const keyForAffiliate = (affiliate) =>
    affiliate?.userId
      ? `user:${affiliate.userId}`
      : `affiliate:${affiliate?.id || 'unknown'}`;

  const upsertAffiliate = (affiliate) => {
    if (!affiliate) return;
    const key = keyForAffiliate(affiliate);
    const existing = rows.get(key) || null;

    rows.set(key, {
      ...(existing || {}),
      affiliateId: affiliate.id || existing?.affiliateId || null,
      userId: affiliate.userId || existing?.userId || null,
      affiliateCode: affiliate.affiliateCode || existing?.affiliateCode || null,
      affiliateCompanyId: affiliate.companyId || existing?.affiliateCompanyId || null,
      hasAffiliateRecord: true,
      isPendingAffiliateRecord: false,
      isOtherCompany: isOtherCompanyAffiliate(affiliate, companyId),
      status:
        affiliate.status ||
        existing?.status ||
        'PENDING',
      commissionRate: affiliate.commissionRate ?? existing?.commissionRate ?? null,
      createdAt: affiliate.createdAt || existing?.createdAt || null,
      user: affiliate.user || existing?.user || null,
      name:
        buildDisplayName(affiliate.user) ||
        existing?.name ||
        affiliate.affiliateCode ||
        affiliate.id ||
        '',
      email: affiliate.user?.email || existing?.email || null,
      phone: affiliate.user?.phone || existing?.phone || null,
    });
  };

  ownAffiliates.forEach(upsertAffiliate);
  linkedAffiliates.forEach(upsertAffiliate);

  memberships.forEach((membership) => {
    if (!membership?.userId) return;
    const key = `user:${membership.userId}`;
    const existing = rows.get(key);

    if (existing) {
      rows.set(key, {
        ...existing,
        isMember: true,
        membershipRole: membership.role || existing.membershipRole || null,
        membershipActive: Boolean(membership.isActive),
      });
      return;
    }

    if (membership.role !== AFFILIATE_MEMBERSHIP_ROLE) return;

    // عضو بدور مسوق بدون سجل Affiliate: يظهر في القائمة بانتظار التفعيل ولا يفلتر طلبات
    rows.set(key, {
      affiliateId: null,
      userId: membership.userId,
      affiliateCode: 'PENDING',
      affiliateCompanyId: null,
      hasAffiliateRecord: false,
      isPendingAffiliateRecord: true,
      isOtherCompany: false,
      status: membership.isActive ? 'PENDING' : 'SUSPENDED',
      commissionRate: null,
      createdAt: membership.createdAt || null,
      user: membership.user || null,
      name: buildDisplayName(membership.user) || membership.user?.email || membership.userId,
      email: membership.user?.email || null,
      phone: membership.user?.phone || null,
      isMember: true,
      membershipRole: membership.role,
      membershipActive: Boolean(membership.isActive),
    });
  });

  const orderIndex = buildOrderCountIndex(orderStats);
  const commissionIndex = buildCommissionIndex(commissionStats);

  const merged = Array.from(rows.values()).map((row) => {
    const orderCount = row.affiliateId
      ? orderIndex.get(String(row.affiliateId)) || 0
      : 0;
    const commission = row.affiliateId
      ? commissionIndex.get(String(row.affiliateId)) || {
          commissionOrderCount: 0,
          totalCommission: 0,
        }
      : { commissionOrderCount: 0, totalCommission: 0 };

    return {
      ...row,
      isMember: Boolean(row.isMember),
      membershipRole: row.membershipRole || null,
      membershipActive: Boolean(row.membershipActive),
      orderCount,
      commissionOrderCount: commission.commissionOrderCount,
      totalCommission: commission.totalCommission,
      isActive: row.status === 'ACTIVE' || (row.isPendingAffiliateRecord && row.membershipActive),
      canFilterOrders: Boolean(row.affiliateId),
    };
  });

  return sortMarketerRows(merged);
};

/**
 * ملخص المتاجر/الشركات التي لديها نشاط تسويقي (مسوق نشط أو طلبات بعمولة/مباشرة من مسوق)
 */
const summarizeAffiliateStores = ({
  companyStats = [],
  activeMarketerStats = [],
  companies = [],
} = {}) => {
  const nameById = new Map(
    companies.map((company) => [String(company.id), company.name || company.id]),
  );
  const stores = new Map();

  const ensure = (companyId) => {
    const key = String(companyId);
    if (!stores.has(key)) {
      stores.set(key, {
        companyId: key,
        companyName: nameById.get(key) || key,
        orderCount: 0,
        activeMarketersCount: 0,
      });
    }
    return stores.get(key);
  };

  companyStats.forEach((stat) => {
    const companyId = stat?.companyId;
    if (!companyId) return;
    const store = ensure(companyId);
    store.orderCount = toNumber(stat?._count?._all ?? stat?._count?.id ?? stat?.count);
  });

  activeMarketerStats.forEach((stat) => {
    const companyId = stat?.companyId;
    if (!companyId) return;
    const store = ensure(companyId);
    store.activeMarketersCount = toNumber(
      stat?._count?._all ?? stat?._count?.id ?? stat?.count,
    );
  });

  return Array.from(stores.values())
    .filter((store) => store.orderCount > 0 || store.activeMarketersCount > 0)
    .sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      return String(a.companyName).localeCompare(String(b.companyName), 'ar');
    });
};

module.exports = {
  AFFILIATE_MEMBERSHIP_ROLE,
  isOtherCompanyAffiliate,
  normalizeAffiliateIdList,
  buildAffiliateOrderWhere,
  buildOrderCountIndex,
  buildCommissionIndex,
  sortMarketerRows,
  mergeAffiliateMarketers,
  summarizeAffiliateStores,
};

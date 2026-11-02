let Prisma;
try {
  Prisma = require('../prisma/generated/postgresql_v2').Prisma;
} catch (error) {
  Prisma = require('@prisma/client').Prisma;
}
const { getSharedPrismaClient } = require('./sharedDatabase');
const redisCacheService = require('./redisCacheService');
const orderWorkflowService = require('./orderWorkflowService');
const { effectiveOrderStatusSql } = require('../utils/orderEffectiveStatus');
// circular dependency - require inside methods
// const orderService = require('./orderService');

const DEFAULT_SETTINGS = {
  enabled: false,
  requireSourceTypes: '[]',
  requireStatuses: '["PENDING"]',
  requireMatchMode: 'any',
  confirmStatus: 'CONFIRMED',
  distributionEnabled: false,
  distributionStrategy: 'round_robin',
  eligibleRoles: '["MANAGER","AGENT"]',
  eligibleUserIds: '[]',
  regionRules: '{}',
  specialtyRules: '{}',
  orderValueRules: '[]',
  workloadMaxOpen: null,
  workloadStatuses: '["PENDING","PROCESSING"]',
  maxCallsNoAnswer: 3,
  intervalMinutes: 30,
  lastAssignedUserId: null,
  notifyOnNew: true,
  autoAssignOnConfirm: true
};

const ALLOWED_CALL_RESULTS = ['unreached', 'reached', 'busy', 'wrong_number', 'callback'];

const safeJsonParse = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const normalizeArray = (value) => {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

const normalizeObject = (value) => {
  const parsed = safeJsonParse(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const normalizeOrderValueRules = (value) => {
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((rule) => {
      const parseOptionalNumber = (input) => {
        if (input === null || input === undefined || input === '') return null;
        const numberValue = Number(input);
        return Number.isFinite(numberValue) ? numberValue : null;
      };
      const minTotal = parseOptionalNumber(rule?.minTotal);
      const maxTotal = parseOptionalNumber(rule?.maxTotal);
      const userIds = Array.isArray(rule?.userIds)
        ? Array.from(new Set(rule.userIds.map((id) => String(id)).filter(Boolean)))
        : [];

      return {
        minTotal,
        maxTotal,
        userIds
      };
    })
    .filter((rule) => rule.userIds.length && (rule.minTotal !== null || rule.maxTotal !== null))
    .sort((a, b) => (a.minTotal ?? Number.NEGATIVE_INFINITY) - (b.minTotal ?? Number.NEGATIVE_INFINITY));
};

const buildSqlAnd = (conditions) => {
  if (!conditions.length) return Prisma.sql`1=1`;
  if (conditions.length === 1) return conditions[0];
  return Prisma.sql`${Prisma.join(conditions, Prisma.sql` AND `)}`;
};

const buildSqlOr = (conditions) => {
  if (!conditions.length) return Prisma.sql`1=0`;
  if (conditions.length === 1) return conditions[0];
  return Prisma.sql`(${Prisma.join(conditions, Prisma.sql` OR `)})`;
};

const buildLikePattern = (value) => `%${String(value)}%`;

const normalizeStatusVariants = (values) => {
  const list = Array.isArray(values) ? values : [values];
  const variants = list
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => String(value))
    .flatMap((value) => [value.toLowerCase(), value.toUpperCase()]);
  return Array.from(new Set(variants));
};

const normalizeMatchMode = (value) => {
  const mode = String(value || '').toLowerCase();
  return mode === 'all' ? 'all' : 'any';
};

const normalizeNonNegativeInt = (value, fallback) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.floor(numberValue));
};

const toJson = (value, fallback = undefined) => {
  if (value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

class OrderConfirmationService {
  get prisma() {
    const client = getSharedPrismaClient();
    if (!client) throw new Error('Prisma client is not initialized.');
    return client;
  }

  async getSettings(companyId) {
    if (!companyId) return null;
    const cacheKey = `order_confirmation_settings:${companyId}`;
    try {
      const cached = await redisCacheService.get(cacheKey);
      if (cached) return cached;
    } catch (_e) {}

    let settings = await this.prisma.orderConfirmationSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      try {
        settings = await this.prisma.orderConfirmationSettings.create({
          data: { companyId, ...DEFAULT_SETTINGS }
        });
      } catch (error) {
        if (error.code === 'P2002') {
          settings = await this.prisma.orderConfirmationSettings.findUnique({
            where: { companyId }
          });
        } else {
          throw error;
        }
      }
    }

    if (settings) {
      try {
        await redisCacheService.set(cacheKey, settings, 120);
      } catch (_e) {}
    }

    return settings;
  }

  async updateSettings(companyId, data) {
    const payload = {
      enabled: data.enabled,
      requireSourceTypes: toJson(data.requireSourceTypes),
      requireStatuses: toJson(data.requireStatuses),
      requireMatchMode: data.requireMatchMode ? normalizeMatchMode(data.requireMatchMode) : undefined,
      confirmStatus: data.confirmStatus,
      distributionEnabled: data.distributionEnabled,
      distributionStrategy: data.distributionStrategy,
      eligibleRoles: toJson(data.eligibleRoles),
      eligibleUserIds: toJson(data.eligibleUserIds),
      regionRules: toJson(data.regionRules),
      specialtyRules: toJson(data.specialtyRules),
      orderValueRules: toJson(data.orderValueRules),
      workloadMaxOpen: data.workloadMaxOpen,
      workloadStatuses: toJson(data.workloadStatuses),
      maxCallsNoAnswer: data.maxCallsNoAnswer,
      intervalMinutes: data.intervalMinutes,
      lastAssignedUserId: data.lastAssignedUserId,
      notifyOnNew: data.notifyOnNew,
      autoAssignOnConfirm: data.autoAssignOnConfirm
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    const result = await this.prisma.orderConfirmationSettings.upsert({
      where: { companyId },
      update: payload,
      create: { companyId, ...DEFAULT_SETTINGS, ...payload }
    });

    try {
      await redisCacheService.del(`order_confirmation_settings:${companyId}`);
    } catch (_e) {}

    return result;
  }

  normalizeSettings(settings) {
    return {
      ...settings,
      requireSourceTypes: normalizeArray(settings.requireSourceTypes),
      requireStatuses: normalizeArray(settings.requireStatuses),
      requireMatchMode: normalizeMatchMode(settings.requireMatchMode || DEFAULT_SETTINGS.requireMatchMode),
      eligibleRoles: normalizeArray(settings.eligibleRoles),
      eligibleUserIds: normalizeArray(settings.eligibleUserIds),
      regionRules: normalizeObject(settings.regionRules),
      specialtyRules: normalizeObject(settings.specialtyRules),
      orderValueRules: normalizeOrderValueRules(settings.orderValueRules),
      workloadStatuses: normalizeArray(settings.workloadStatuses),
      maxCallsNoAnswer: normalizeNonNegativeInt(settings.maxCallsNoAnswer, DEFAULT_SETTINGS.maxCallsNoAnswer),
      intervalMinutes: normalizeNonNegativeInt(settings.intervalMinutes, DEFAULT_SETTINGS.intervalMinutes)
    };
  }

  buildConfirmationFilters(settings, filters) {
    const sources = settings.requireSourceTypes;
    const statuses = settings.requireStatuses.map((s) => String(s).toUpperCase());
    const matchMode = normalizeMatchMode(settings.requireMatchMode);

    const baseCriteria = [];
    const sqlBaseCriteria = [];
    if (sources.length) {
      baseCriteria.push({ sourceType: { in: sources } });
      sqlBaseCriteria.push(Prisma.sql`o."sourceType" IN (${Prisma.join(sources)})`);
    }
    if (statuses.length) {
      baseCriteria.push({ status: { in: statuses } });
      sqlBaseCriteria.push(Prisma.sql`o."status" IN (${Prisma.join(statuses)})`);
    }

    if (!baseCriteria.length) {
      return { disabled: true };
    }

    const where = { companyId: filters.companyId };
    where.AND = [];

    const requireAll = matchMode === 'all' && sources.length && statuses.length;
    if (requireAll) {
      where.AND.push(...baseCriteria);
    } else {
      where.AND.push({ OR: baseCriteria });
    }

    const sqlConditions = [
      Prisma.sql`o."companyId" = ${filters.companyId}`,
      requireAll ? buildSqlAnd(sqlBaseCriteria) : buildSqlOr(sqlBaseCriteria)
    ];

    if (settings.confirmStatus) {
      where.AND.push({ status: { not: settings.confirmStatus.toUpperCase() } });
      sqlConditions.push(Prisma.sql`o."status" <> ${settings.confirmStatus.toUpperCase()}`);
    }
    where.AND.push({ confirmedAt: null });
    sqlConditions.push(Prisma.sql`o."confirmedAt" IS NULL`);

    if (filters.status) {
      where.AND.push({ status: String(filters.status).toUpperCase() });
      sqlConditions.push(Prisma.sql`o."status" = ${String(filters.status).toUpperCase()}`);
    }

    if (filters.sourceType) {
      where.AND.push({ sourceType: String(filters.sourceType).toLowerCase() });
      sqlConditions.push(Prisma.sql`o."sourceType" = ${String(filters.sourceType).toLowerCase()}`);
    }

    if (filters.startDate || filters.endDate) {
      const createdAt = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.AND.push({ createdAt });

      if (filters.startDate) {
        sqlConditions.push(Prisma.sql`o."createdAt" >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        sqlConditions.push(Prisma.sql`o."createdAt" <= ${end}`);
      }
    }

    if (filters.search) {
      const search = String(filters.search);
      where.AND.push({
        OR: [
          { orderNumber: { contains: search } },
          { customerName: { contains: search } },
          { customerPhone: { contains: search } },
          { customerEmail: { contains: search } }
        ]
      });

      const pattern = buildLikePattern(search);
      const searchParts = [
        Prisma.sql`o."orderNumber" LIKE ${pattern}`,
        Prisma.sql`o."customerName" LIKE ${pattern}`,
        Prisma.sql`o."customerPhone" LIKE ${pattern}`,
        Prisma.sql`o."customerEmail" LIKE ${pattern}`
      ];
      sqlConditions.push(buildSqlOr(searchParts));
    }

    if (filters.onlyUnassigned) {
      where.AND.push({ assignedTo: null });
      sqlConditions.push(Prisma.sql`o."assignedTo" IS NULL`);
    }

    if (filters.assignedTo) {
      where.AND.push({ assignedTo: filters.assignedTo });
      sqlConditions.push(Prisma.sql`o."assignedTo" = ${filters.assignedTo}`);
    }

    return { where, sql: buildSqlAnd(sqlConditions) };
  }

  buildGuestFilters(settings, filters) {
    const sources = settings.requireSourceTypes.map((s) => String(s).toLowerCase());
    const statuses = normalizeStatusVariants(settings.requireStatuses);
    const includeBySource = sources.includes('storefront');
    const hasSourceSelection = sources.length > 0;
    const matchMode = normalizeMatchMode(settings.requireMatchMode);
    const requireAll = matchMode === 'all' && hasSourceSelection && statuses.length;

    if (hasSourceSelection && !includeBySource) {
      return { disabled: true };
    }

    if (!hasSourceSelection && statuses.length === 0) {
      return { disabled: true };
    }

    if (filters.sourceType && String(filters.sourceType).toLowerCase() !== 'storefront') {
      return { disabled: true };
    }

    const where = { companyId: filters.companyId };
    const sqlConditions = [Prisma.sql`g."companyId" = ${filters.companyId}`];
    const andConditions = [];

    if (requireAll || (!includeBySource && statuses.length)) {
      andConditions.push({ status: { in: statuses } });
      sqlConditions.push(Prisma.sql`g."status" IN (${Prisma.join(statuses)})`);
    }

    if (settings.confirmStatus) {
      andConditions.push({ status: { notIn: normalizeStatusVariants([settings.confirmStatus]) } });
      sqlConditions.push(
        Prisma.sql`g."status" NOT IN (${Prisma.join(normalizeStatusVariants([settings.confirmStatus]))})`
      );
    }

    if (filters.status) {
      andConditions.push({ status: { in: normalizeStatusVariants([filters.status]) } });
      sqlConditions.push(
        Prisma.sql`g."status" IN (${Prisma.join(normalizeStatusVariants([filters.status]))})`
      );
    }

    if (filters.startDate || filters.endDate) {
      const createdAt = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      andConditions.push({ createdAt });

      if (filters.startDate) {
        sqlConditions.push(Prisma.sql`g."createdAt" >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        sqlConditions.push(Prisma.sql`g."createdAt" <= ${end}`);
      }
    }

    if (filters.search) {
      const search = String(filters.search);
      andConditions.push({
        OR: [
          { orderNumber: { contains: search } },
          { guestName: { contains: search } },
          { guestPhone: { contains: search } },
          { guestEmail: { contains: search } }
        ]
      });

      const pattern = buildLikePattern(search);
      const searchParts = [
        Prisma.sql`g."orderNumber" LIKE ${pattern}`,
        Prisma.sql`g."guestName" LIKE ${pattern}`,
        Prisma.sql`g."guestPhone" LIKE ${pattern}`,
        Prisma.sql`g."guestEmail" LIKE ${pattern}`
      ];
      sqlConditions.push(buildSqlOr(searchParts));
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    return { where, sql: buildSqlAnd(sqlConditions) };
  }

  async listConfirmationQueue(companyId, filters = {}) {
    const settings = this.normalizeSettings(await this.getSettings(companyId));
    if (!settings.enabled) {
      return {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, pages: 0 },
        disabled: true,
        appliedFilters: {
          statuses: (settings.requireStatuses || []).map((s) => String(s).toUpperCase()),
          sources: (settings.requireSourceTypes || []).map((s) => String(s).toLowerCase()),
          matchMode: normalizeMatchMode(settings.requireMatchMode),
          excludeConfirmStatus: settings.confirmStatus ? String(settings.confirmStatus).toUpperCase() : null,
          requireConfirmedAtNull: true,
          hasDateFilter: false,
          startDate: null,
          endDate: null,
          includeGuestOrders: false,
          guestTwinReconciliation: 'EXCLUDE_SHADOW_TWINS'
        }
      };
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;

    const regularFilters = this.buildConfirmationFilters(settings, { ...filters, companyId });
    const guestFilters = this.buildGuestFilters(settings, { ...filters, companyId });

    if (regularFilters.disabled && guestFilters.disabled) {
      return {
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
        appliedFilters: {
          statuses: filters.status
            ? [String(filters.status).toUpperCase()]
            : (settings.requireStatuses || []).map((s) => String(s).toUpperCase()),
          sources: filters.sourceType
            ? [String(filters.sourceType).toLowerCase()]
            : (settings.requireSourceTypes || []).map((s) => String(s).toLowerCase()),
          matchMode: normalizeMatchMode(settings.requireMatchMode),
          excludeConfirmStatus: settings.confirmStatus ? String(settings.confirmStatus).toUpperCase() : null,
          requireConfirmedAtNull: true,
          hasDateFilter: Boolean(filters.startDate || filters.endDate),
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
          includeGuestOrders: false,
          guestTwinReconciliation: 'EXCLUDE_SHADOW_TWINS'
        }
      };
    }

    const startIndex = (page - 1) * limit;

    const createSqlBuilder = () => {
      const values = [];
      const conditions = [];
      const push = (value) => {
        values.push(value);
        return `$${values.length}`;
      };
      const add = (condition) => {
        if (condition) conditions.push(condition);
      };
      const inList = (column, list) => {
        if (!list.length) return null;
        const placeholders = list.map((value) => push(value)).join(', ');
        return `${column} IN (${placeholders})`;
      };
      const notInList = (column, list) => {
        if (!list.length) return null;
        const placeholders = list.map((value) => push(value)).join(', ');
        return `${column} NOT IN (${placeholders})`;
      };
      const equals = (column, value) => `${column} = ${push(value)}`;
      const notEquals = (column, value) => `${column} <> ${push(value)}`;
      const like = (column, value) => `${column} LIKE ${push(value)}`;
      const gte = (column, value) => `${column} >= ${push(value)}`;
      const lte = (column, value) => `${column} <= ${push(value)}`;
      const orGroup = (parts) => {
        const filtered = parts.filter(Boolean);
        if (!filtered.length) return null;
        if (filtered.length === 1) return filtered[0];
        return `(${filtered.join(' OR ')})`;
      };
      const andGroup = (parts) => {
        const filtered = parts.filter(Boolean);
        if (!filtered.length) return null;
        if (filtered.length === 1) return filtered[0];
        return `(${filtered.join(' AND ')})`;
      };
      const where = () => (conditions.length ? conditions.join(' AND ') : '1=1');
      return { values, add, inList, notInList, equals, notEquals, like, gte, lte, orGroup, andGroup, where };
    };

    const buildRegularSql = () => {
      if (regularFilters.disabled) return null;
      const builder = createSqlBuilder();
      builder.add(builder.equals('o."companyId"', companyId));

      const sources = settings.requireSourceTypes;
      const statuses = settings.requireStatuses.map((s) => String(s).toUpperCase());
      const matchMode = normalizeMatchMode(settings.requireMatchMode);
      const statusColumn = 'o."status"::text';
      const requireAll = matchMode === 'all' && sources.length && statuses.length;
      const baseParts = [
        sources.length ? builder.inList('o."sourceType"', sources) : null,
        statuses.length ? builder.inList(statusColumn, statuses) : null
      ];
      const baseGroup = requireAll ? builder.andGroup(baseParts) : builder.orGroup(baseParts);
      if (!baseGroup) return null;
      builder.add(baseGroup);

      if (settings.confirmStatus) {
        builder.add(builder.notEquals(statusColumn, settings.confirmStatus.toUpperCase()));
      }
      builder.add('o."confirmedAt" IS NULL');

      if (filters.status) {
        builder.add(builder.equals(statusColumn, String(filters.status).toUpperCase()));
      }

      if (filters.sourceType) {
        if (String(filters.sourceType).toLowerCase() === 'wholesale') {
          builder.add('(o."orderSource" = \'WHOLESALE\' OR o."wholesaleCustomerId" IS NOT NULL)');
        } else {
          builder.add(builder.equals('o."sourceType"', String(filters.sourceType).toLowerCase()));
        }
      }

      if (filters.isWholesale === 'true' || filters.orderSource === 'WHOLESALE') {
        builder.add('(o."orderSource" = \'WHOLESALE\' OR o."wholesaleCustomerId" IS NOT NULL)');
      }

      if (filters.startDate || filters.endDate) {
        if (filters.startDate) builder.add(builder.gte('o."createdAt"', new Date(filters.startDate)));
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          builder.add(builder.lte('o."createdAt"', end));
        }
      }

      if (filters.search) {
        const pattern = buildLikePattern(filters.search);
        const searchGroup = builder.orGroup([
          builder.like('o."orderNumber"', pattern),
          builder.like('o."customerName"', pattern),
          builder.like('o."customerPhone"', pattern),
          builder.like('o."customerEmail"', pattern)
        ]);
        builder.add(searchGroup);
      }

      if (filters.onlyUnassigned) {
        builder.add('o."assignedTo" IS NULL');
      }

      if (filters.assignedTo) {
        builder.add(builder.equals('o."assignedTo"', filters.assignedTo));
      }

      return {
        sql: `SELECT 'regular'::text AS \"type\", o.\"id\" AS \"id\", o.\"createdAt\" AS \"createdAt\" FROM \"orders\" o WHERE ${builder.where()}`,
        values: builder.values
      };
    };

    const buildGuestSql = () => {
      if (guestFilters.disabled) return null;
      if (
        String(filters.sourceType || '').toLowerCase() === 'wholesale' ||
        filters.isWholesale === 'true' ||
        filters.orderSource === 'WHOLESALE'
      ) {
        return null;
      }
      const builder = createSqlBuilder();
      builder.add(builder.equals('g."companyId"', companyId));

      // استبعاد صفوف الظل التي لها توأم أصلي في جدول orders بنفس الشركة ورقم الطلب
      builder.add(
        'NOT EXISTS (SELECT 1 FROM "orders" o_sub WHERE o_sub."companyId" = g."companyId" AND LOWER(BTRIM(o_sub."orderNumber")) = LOWER(BTRIM(g."orderNumber")) AND BTRIM(g."orderNumber") <> \'\')'
      );

      const sources = settings.requireSourceTypes.map((s) => String(s).toLowerCase());
      const statuses = normalizeStatusVariants(settings.requireStatuses);
      const includeBySource = sources.includes('storefront');
      const hasSourceSelection = sources.length > 0;
      const matchMode = normalizeMatchMode(settings.requireMatchMode);
      const requireAll = matchMode === 'all' && hasSourceSelection && statuses.length;

      if (hasSourceSelection && !includeBySource) return null;
      if (!hasSourceSelection && statuses.length === 0) return null;
      if (filters.sourceType && String(filters.sourceType).toLowerCase() !== 'storefront') return null;

      if (requireAll || (!includeBySource && statuses.length)) {
        builder.add(builder.inList('g."status"', statuses));
      }

      if (settings.confirmStatus) {
        builder.add(builder.notInList('g."status"', normalizeStatusVariants([settings.confirmStatus])));
      }

      if (filters.status) {
        builder.add(builder.inList('g."status"', normalizeStatusVariants([filters.status])));
      }

      if (filters.startDate || filters.endDate) {
        if (filters.startDate) builder.add(builder.gte('g."createdAt"', new Date(filters.startDate)));
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          builder.add(builder.lte('g."createdAt"', end));
        }
      }

      if (filters.search) {
        const pattern = buildLikePattern(filters.search);
        const searchGroup = builder.orGroup([
          builder.like('g."orderNumber"', pattern),
          builder.like('g."guestName"', pattern),
          builder.like('g."guestPhone"', pattern),
          builder.like('g."guestEmail"', pattern)
        ]);
        builder.add(searchGroup);
      }

      return {
        sql: `SELECT 'guest'::text AS \"type\", g.\"id\" AS \"id\", g.\"createdAt\" AS \"createdAt\" FROM \"guest_orders\" g WHERE ${builder.where()}`,
        values: builder.values
      };
    };

    const shiftPlaceholders = (sql, offset) =>
      sql.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + offset}`);

    const regularQuery = buildRegularSql();
    const guestQuery = buildGuestSql();

    const unionSegments = [];
    const unionValues = [];

    if (regularQuery) {
      unionSegments.push(regularQuery.sql);
      unionValues.push(...regularQuery.values);
    }

    if (guestQuery) {
      const shiftedSql = unionValues.length
        ? shiftPlaceholders(guestQuery.sql, unionValues.length)
        : guestQuery.sql;
      unionSegments.push(shiftedSql);
      unionValues.push(...guestQuery.values);
    }

    const limitPlaceholder = `$${unionValues.length + 1}`;
    const offsetPlaceholder = `$${unionValues.length + 2}`;
    const combinedSql = unionSegments.length
      ? `SELECT * FROM (${unionSegments.join(' UNION ALL ')}) AS combined ORDER BY \"createdAt\" DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`
      : null;
    const countSql = unionSegments.length
      ? `SELECT COUNT(*)::text AS "count" FROM (${unionSegments.join(' UNION ALL ')}) AS combined_count`
      : null;

    const [rawRows, countRows] = await Promise.all([
      combinedSql ? this.prisma.$queryRawUnsafe(combinedSql, ...unionValues, limit, startIndex) : Promise.resolve([]),
      countSql ? this.prisma.$queryRawUnsafe(countSql, ...unionValues) : Promise.resolve([])
    ]);

    const total = countRows && countRows[0] ? Number(countRows[0].count || 0) : 0;
    const paginatedRaw = rawRows.map((row) => ({ type: row.type, id: row.id }));

    const paginatedRegularIds = paginatedRaw.filter((item) => item.type === 'regular').map((item) => item.id);
    const paginatedGuestIds = paginatedRaw.filter((item) => item.type === 'guest').map((item) => item.id);

    const paginatedRegular = paginatedRegularIds.length
      ? await this.prisma.order.findMany({
        where: { id: { in: paginatedRegularIds } },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          sourceType: true,
          createdAt: true,
          updatedAt: true,
          governorate: true,
          city: true,
          assignedTo: true,
          assignedAt: true,
          confirmedAt: true,
          assignmentStrategy: true,
          callAttempts: true,
          lastCallAttemptAt: true,
          shipping: true,
          subtotal: true,
          discount: true,
          notes: true,
          shippingAddress: true,
          customerAddress: true,
          metadata: true,
          codDepositAmount: true,
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          orderItems: {
            select: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              price: true,
              total: true,
              productColor: true,
              productSize: true,
              productSku: true,
              productImage: true,
              metadata: true
            }
          }
        }
      })
      : [];

    const paginatedGuest = paginatedGuestIds.length
      ? await this.prisma.guestOrder.findMany({
        where: { id: { in: paginatedGuestIds } },
        select: {
          id: true,
          orderNumber: true,
          guestName: true,
          guestPhone: true,
          guestEmail: true,
          total: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          callAttempts: true,
          lastCallAt: true,
          items: true,
          shippingAddress: true,
          notes: true,
          paymentMethod: true,
          metadata: true,
          shippingCost: true,
          discountAmount: true,
          finalTotal: true
        }
      })
      : [];

    const guestAssignments = paginatedGuestIds.length
      ? await this.prisma.orderAssignment.findMany({
        where: {
          guestOrderId: { in: paginatedGuestIds },
          isActive: true
        },
        select: {
          guestOrderId: true,
          assignedTo: true,
          assignedAt: true,
          strategy: true
        }
      })
      : [];
    const guestAssignmentMap = new Map(guestAssignments.map((a) => [a.guestOrderId, a]));

    const assignedUserIds = new Set(
      [
        ...paginatedRegular.map((order) => order.assignedTo).filter(Boolean),
        ...guestAssignments.map((assignment) => assignment.assignedTo).filter(Boolean)
      ]
    );
    const assignedUsers = assignedUserIds.size
      ? await this.prisma.user.findMany({
        where: { id: { in: Array.from(assignedUserIds) } },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
      : [];
    const assignedUserMap = new Map(assignedUsers.map((user) => [user.id, user]));
    const formatUserName = (userId) => {
      if (!userId) return null;
      const user = assignedUserMap.get(userId);
      if (!user) return userId;
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id;
    };

    const formattedRegular = paginatedRegular.map((order) => {
      const customerName = order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim();
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: customerName || 'غير محدد',
        customerPhone: order.customer?.phone || order.customerPhone || '',
        customerEmail: order.customer?.email || order.customerEmail || '',
        total: order.total,
        status: order.status?.toLowerCase() || 'pending',
        paymentStatus: order.paymentStatus || 'PENDING',
        paymentMethod: order.paymentMethod || 'CASH',
        sourceType: order.sourceType || 'unknown',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        governorate: order.governorate || order.city || '',
        city: order.city || '',
        assignedTo: order.assignedTo,
        assignedToName: formatUserName(order.assignedTo),
        assignedAt: order.assignedAt,
        confirmedAt: order.confirmedAt,
        assignmentStrategy: order.assignmentStrategy || null,
        callAttempts: order.callAttempts || 0,
        lastCallAttemptAt: order.lastCallAttemptAt || null,
        shipping: order.shipping || 0,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        codDepositAmount: order.codDepositAmount || 0,
        notes: order.notes || '',
        shippingAddress: order.shippingAddress || order.customerAddress || '',
        metadata: order.metadata || null,
        items: (order.orderItems || []).map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          name: item.productName,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          total: Number(item.total || (Number(item.price || 0) * Number(item.quantity || 1))),
          color: item.productColor || '',
          size: item.productSize || '',
          sku: item.productSku || null,
          image: item.productImage || null,
          metadata: item.metadata || null
        })),
        isWholesale: order.orderSource === 'WHOLESALE' || Boolean(order.wholesaleCustomerId),
        orderSource: order.orderSource || 'REGULAR',
        wholesaleCustomerId: order.wholesaleCustomerId || null,
        isGuestOrder: false
      };
    });

    const formattedGuest = paginatedGuest.map((order) => {
      const assignment = guestAssignmentMap.get(order.id);
      let parsedItems = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch (_) {}
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.guestName || 'غير محدد',
        customerPhone: order.guestPhone || '',
        customerEmail: order.guestEmail || '',
        total: order.total || 0,
        status: order.status?.toLowerCase() || 'pending',
        paymentStatus: 'PENDING',
        paymentMethod: order.paymentMethod || 'CASH',
        sourceType: 'storefront',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        governorate: '',
        city: '',
        assignedTo: assignment?.assignedTo || null,
        assignedToName: formatUserName(assignment?.assignedTo || null),
        assignedAt: assignment?.assignedAt || null,
        confirmedAt: null,
        assignmentStrategy: assignment?.strategy || null,
        callAttempts: order.callAttempts || 0,
        lastCallAttemptAt: order.lastCallAt || null,
        shipping: Number(order.shippingCost || 0),
        discount: Number(order.discountAmount || 0),
        codDepositAmount: 0,
        notes: order.notes || '',
        shippingAddress: order.shippingAddress || '',
        metadata: order.metadata || null,
        items: (Array.isArray(parsedItems) ? parsedItems : []).map((item, idx) => ({
          id: item.id || `guest-item-${idx}`,
          productId: item.productId || item.id,
          productName: item.name || item.productName || 'منتج',
          name: item.name || item.productName || 'منتج',
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          total: Number(item.total || (Number(item.price || 0) * Number(item.quantity || 1))),
          color: item.color || item.attributes?.color || '',
          size: item.size || item.attributes?.size || '',
          sku: item.sku || null,
          image: item.image || item.productImage || null,
          metadata: item.metadata || null
        })),
        isGuestOrder: true
      };
    });

    const formattedRegularWithUsers = formattedRegular.map((order) => ({
      ...order,
      assignedToName: formatUserName(order.assignedTo)
    }));

    const regularMap = new Map(formattedRegularWithUsers.map((order) => [order.id, order]));
    const guestMap = new Map(formattedGuest.map((order) => [order.id, order]));
    const paginated = paginatedRaw
      .map((item) => (item.type === 'regular' ? regularMap.get(item.id) : guestMap.get(item.id)))
      .filter(Boolean);

    const appliedFilters = {
      statuses: filters.status
        ? [String(filters.status).toUpperCase()]
        : (settings.requireStatuses || []).map((s) => String(s).toUpperCase()),
      sources: filters.sourceType
        ? [String(filters.sourceType).toLowerCase()]
        : (settings.requireSourceTypes || []).map((s) => String(s).toLowerCase()),
      matchMode: normalizeMatchMode(settings.requireMatchMode),
      excludeConfirmStatus: settings.confirmStatus ? String(settings.confirmStatus).toUpperCase() : null,
      requireConfirmedAtNull: true,
      hasDateFilter: Boolean(filters.startDate || filters.endDate),
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      includeGuestOrders: !guestFilters.disabled && Boolean(guestQuery),
      guestTwinReconciliation: 'EXCLUDE_SHADOW_TWINS'
    };

    return {
      data: paginated,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      appliedFilters
    };
  }

  async getConfirmationStats(companyId, filters = {}) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const strategy = filters.strategy ? String(filters.strategy) : null;
    const assignmentWhere = {
      companyId,
      assignedAt: { gte: startDate, lte: endDate }
    };
    if (strategy) {
      assignmentWhere.strategy = strategy;
    }

    const [confirmedRegular, confirmedGuest, assignedTotal] = await Promise.all([
      this.prisma.order.count({
        where: {
          companyId,
          confirmedAt: { not: null, gte: startDate, lte: endDate }
        }
      }),
      this.prisma.guestOrder.count({
        where: {
          companyId,
          status: { in: normalizeStatusVariants(['CONFIRMED']) },
          updatedAt: { gte: startDate, lte: endDate }
        }
      }),
      this.prisma.orderAssignment.count({ where: assignmentWhere })
    ]);

    const assignmentGroups = await this.prisma.orderAssignment.groupBy({
      by: ['assignedTo'],
      where: assignmentWhere,
      _count: { assignedTo: true }
    });

    const userIds = assignmentGroups.map((group) => group.assignedTo);
    const users = userIds.length
      ? await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));

    const assignmentsByUser = assignmentGroups.map((group) => {
      const user = userMap.get(group.assignedTo);
      return {
        userId: group.assignedTo,
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : group.assignedTo,
        email: user?.email || null,
        count: group._count.assignedTo
      };
    });

    return {
      range: { startDate, endDate },
      totals: {
        confirmedRegular,
        confirmedGuest,
        totalConfirmed: confirmedRegular + confirmedGuest,
        totalAssigned: assignedTotal
      },
      assignmentsByUser
    };
  }

  async getEligibleUsers(companyId, settings, options = {}) {
    const roles = settings.eligibleRoles.length ? settings.eligibleRoles : ['MANAGER', 'AGENT'];
    const userIds = options.ignoreUserFilter ? [] : settings.eligibleUserIds;

    const where = {
      companyId,
      isActive: true,
      role: { in: roles }
    };

    if (userIds.length) {
      where.userId = { in: userIds };
    }

    const members = await this.prisma.userCompany.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, availability: true, department: true, skills: true } }
      }
    });

    return members
      .map((member) => member.user)
      .filter((user) => user && user.availability !== 'offline');
  }

  pickRoundRobin(settings, eligibleUsers) {
    if (!eligibleUsers.length) return null;
    const lastId = settings.lastAssignedUserId;
    if (!lastId) return eligibleUsers[0];
    const idx = eligibleUsers.findIndex((u) => u.id === lastId);
    const nextIndex = idx === -1 ? 0 : (idx + 1) % eligibleUsers.length;
    return eligibleUsers[nextIndex];
  }

  async pickByWorkload(companyId, eligibleUsers, settings) {
    if (!eligibleUsers.length) return null;
    const statuses = settings.workloadStatuses.length ? settings.workloadStatuses.map((s) => String(s).toUpperCase()) : ['PENDING', 'PROCESSING'];

    const userIds = eligibleUsers.map((user) => user.id);
    const cacheKey = `workload:${companyId}:${statuses.join('|')}`;
    let grouped = await redisCacheService.get(cacheKey);
    if (!Array.isArray(grouped)) grouped = null;

    if (!grouped && userIds.length) {
      try {
        const rows = await this.prisma.$queryRawUnsafe(`
          SELECT "assignedTo", COUNT(*)::int AS count
          FROM "orders"
          WHERE "companyId" = $1
            AND "assignedTo" = ANY($2::text[])
            AND (${effectiveOrderStatusSql()}) = ANY($3::text[])
          GROUP BY "assignedTo"
        `, companyId, userIds, statuses);
        grouped = (Array.isArray(rows) ? rows : []).map((r) => ({
          assignedTo: r.assignedTo,
          _count: { assignedTo: Number(r.count || 0) },
        }));
      } catch (rawErr) {
        console.warn('⚠️ [ORDER-CONFIRMATION] Raw workload query failed, fallback to prisma groupBy:', rawErr.message);
        const VALID_ENUMS = new Set(['PENDING', 'PROCESSING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'ON_HOLD']);
        const validStatuses = statuses.filter((s) => VALID_ENUMS.has(s));
        grouped = await this.prisma.order.groupBy({
          by: ['assignedTo'],
          where: {
            companyId,
            assignedTo: { in: userIds },
            status: { in: validStatuses.length ? validStatuses : ['PENDING', 'PROCESSING'] },
          },
          _count: { assignedTo: true },
        });
      }
      await redisCacheService.set(cacheKey, grouped, 30);
    }
    if (!grouped) grouped = [];

    const countMap = new Map(grouped.map((row) => [row.assignedTo, row._count.assignedTo]));
    const counts = eligibleUsers.map((user) => ({ user, count: countMap.get(user.id) || 0 }));

    counts.sort((a, b) => a.count - b.count);
    return counts[0]?.user || null;
  }

  pickByRegion(order, settings, eligibleUsers) {
    const regionRules = settings.regionRules || {};
    let regionKey = (order.governorate || order.city || '').trim();
    if (!regionKey) {
      const meta = safeJsonParse(order.metadata || {}, {});
      regionKey = String(meta.governorate || meta.city || meta.region || '').trim();
    }
    if (!regionKey) return null;

    const regionIds = regionRules[regionKey];
    if (!Array.isArray(regionIds) || !regionIds.length) return null;

    const pool = eligibleUsers.filter((u) => regionIds.includes(u.id));
    return this.pickRoundRobin(settings, pool);
  }

  addProductRuleKeys(keys, item) {
    if (!item || typeof item !== 'object') return;
    [
      item.productId,
      item.id,
      item.sku,
      item.productSku,
      item.name,
      item.productName,
      item.title
    ].forEach((value) => {
      const normalized = String(value || '').trim();
      if (normalized) keys.add(normalized);
    });
  }

  async collectOrderProductRuleKeys(order) {
    const keys = new Set();
    const meta = safeJsonParse(order.metadata || {}, {});
    [
      meta.productId,
      meta.productName,
      meta.productSku,
      meta.sku,
      meta.specialty,
      meta.category,
      meta.categoryId
    ].forEach((value) => {
      const normalized = String(value || '').trim();
      if (normalized) keys.add(normalized);
    });

    if (Array.isArray(order.orderItems)) {
      order.orderItems.forEach((item) => this.addProductRuleKeys(keys, item));
    } else if (order.id && !order.guestEmail) {
      const items = await this.prisma.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, productName: true, productSku: true, metadata: true }
      });
      items.forEach((item) => {
        this.addProductRuleKeys(keys, item);
        this.addProductRuleKeys(keys, safeJsonParse(item.metadata || {}, {}));
      });
    }

    const guestItems = safeJsonParse(order.items || null, []);
    if (Array.isArray(guestItems)) {
      guestItems.forEach((item) => this.addProductRuleKeys(keys, item));
    }

    return keys;
  }

  async pickByProduct(companyId, order, settings, eligibleUsers) {
    const productRules = settings.specialtyRules || {};
    const productKeys = await this.collectOrderProductRuleKeys(order);
    if (!productKeys.size) return null;

    const matchedKey = Object.keys(productRules).find((ruleKey) => productKeys.has(ruleKey));
    if (!matchedKey) return null;

    const ids = productRules[matchedKey];
    if (!Array.isArray(ids) || !ids.length) return null;
    const pool = eligibleUsers.filter((u) => ids.includes(u.id));
    return this.pickRoundRobin(settings, pool);
  }

  pickByOrderValue(order, settings, eligibleUsers) {
    const rules = settings.orderValueRules || [];
    if (!rules.length) return null;

    const total = Number(order.finalTotal ?? order.total ?? order.subtotal ?? 0);
    if (!Number.isFinite(total)) return null;

    const matchedRule = rules.find((rule) => {
      const min = rule.minTotal ?? Number.NEGATIVE_INFINITY;
      const max = rule.maxTotal ?? Number.POSITIVE_INFINITY;
      return total >= min && total <= max;
    });
    if (!matchedRule || !Array.isArray(matchedRule.userIds) || !matchedRule.userIds.length) return null;

    const pool = eligibleUsers.filter((u) => matchedRule.userIds.includes(u.id));
    return this.pickRoundRobin(settings, pool);
  }

  async autoAssign(companyId, order, settings, assignedBy = null) {
    if (!settings.distributionEnabled) return null;
    const eligible = await this.getEligibleUsers(companyId, settings);
    if (!eligible.length) return null;

    let selected = null;
    switch (settings.distributionStrategy) {
      case 'by_region':
        selected = this.pickByRegion(order, settings, eligible);
        break;
      case 'by_workload':
        selected = await this.pickByWorkload(companyId, eligible, settings);
        break;
      case 'by_specialty':
        selected = await this.pickByProduct(companyId, order, settings, eligible);
        break;
      case 'by_order_value':
        selected = this.pickByOrderValue(order, settings, eligible);
        break;
      default:
        selected = this.pickRoundRobin(settings, eligible);
    }

    if (!selected) return null;

    await this.prisma.$transaction(async (tx) => {
      await tx.orderAssignment.updateMany({
        where: { orderId: order.id, isActive: true },
        data: { isActive: false }
      });

      await tx.orderAssignment.create({
        data: {
          companyId,
          orderId: order.id,
          assignedTo: selected.id,
          assignedBy,
          strategy: settings.distributionStrategy,
          isActive: true
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          assignedTo: selected.id,
          assignedBy,
          assignedAt: new Date(),
          assignmentStrategy: settings.distributionStrategy
        }
      });

      await tx.orderConfirmationSettings.update({
        where: { companyId },
        data: { lastAssignedUserId: selected.id }
      });
    });

    if (settings) {
      settings.lastAssignedUserId = selected.id;
    }

    return selected;
  }

  async autoAssignGuest(companyId, guestOrder, settings, assignedBy = null) {
    if (!settings.distributionEnabled) return null;
    if (!guestOrder) return null;

    // A.2 استبعاد إسناد طلب الزائر إذا كان له توأم أصلي بنفس الشركة ورقم الطلب
    let primaryOrderId = null;
    if (guestOrder.metadata) {
      try {
        const meta = typeof guestOrder.metadata === 'string' ? JSON.parse(guestOrder.metadata) : guestOrder.metadata;
        primaryOrderId = meta?.primaryOrderId || null;
      } catch (_e) {}
    }

    const orClauses = [];
    if (primaryOrderId) orClauses.push({ id: primaryOrderId });
    if (guestOrder.orderNumber) orClauses.push({ orderNumber: { equals: guestOrder.orderNumber, mode: 'insensitive' } });

    if (orClauses.length > 0) {
      const regularTwin = await this.prisma.order.findFirst({
        where: {
          companyId,
          OR: orClauses
        },
        select: { id: true }
      });
      if (regularTwin) {
        return null;
      }
    }

    const eligible = await this.getEligibleUsers(companyId, settings);
    if (!eligible.length) return null;

    let selected = null;
    switch (settings.distributionStrategy) {
      case 'by_region':
        selected = this.pickByRegion(guestOrder, settings, eligible);
        break;
      case 'by_specialty':
        selected = await this.pickByProduct(companyId, guestOrder, settings, eligible);
        break;
      case 'by_workload':
        selected = await this.pickByWorkload(companyId, eligible, settings);
        break;
      case 'by_order_value':
        selected = this.pickByOrderValue(guestOrder, settings, eligible);
        break;
      default:
        selected = this.pickRoundRobin(settings, eligible);
    }

    if (!selected) return null;

    await this.prisma.orderAssignment.updateMany({
      where: { guestOrderId: guestOrder.id, isActive: true },
      data: { isActive: false }
    });

    await this.prisma.orderAssignment.create({
      data: {
        companyId,
        guestOrderId: guestOrder.id,
        assignedTo: selected.id,
        assignedBy,
        strategy: settings.distributionStrategy,
        isActive: true
      }
    });

    await this.prisma.orderConfirmationSettings.update({
      where: { companyId },
      data: { lastAssignedUserId: selected.id }
    });

    if (settings) {
      settings.lastAssignedUserId = selected.id;
    }

    return selected;
  }

  async autoAssignOnCreation(companyId, orderId, type = 'regular') {
    try {
      console.log(`🚀 [ORDER-CONFIRMATION] autoAssignOnCreation triggered for ${type} order ${orderId} in company ${companyId}`);
      
      const settings = this.normalizeSettings(await this.getSettings(companyId));
      
      if (!settings.distributionEnabled) {
        console.log(`ℹ️ [ORDER-CONFIRMATION] Distribution disabled for company ${companyId}, skipping.`);
        return null;
      }

      if (type === 'regular') {
        const order = await this.prisma.order.findFirst({
          where: { id: orderId, companyId }
        });
        if (!order) {
          console.error(`❌ [ORDER-CONFIRMATION] Regular order ${orderId} not found for distribution in company ${companyId}.`);
          return null;
        }
        
        const selected = await this.autoAssign(companyId, order, settings);
        if (selected) {
          console.log(`✅ [ORDER-CONFIRMATION] Successfully auto-assigned regular order ${orderId} to ${selected.firstName} ${selected.lastName}`);
        }
        return selected;
      } 
      else if (type === 'guest') {
        const guestOrder = await this.prisma.guestOrder.findFirst({
          where: { id: orderId, companyId }
        });
        if (!guestOrder) {
          console.error(`❌ [ORDER-CONFIRMATION] Guest order ${orderId} not found for distribution in company ${companyId}.`);
          return null;
        }
        
        const selected = await this.autoAssignGuest(companyId, guestOrder, settings);
        if (selected) {
          console.log(`✅ [ORDER-CONFIRMATION] Successfully auto-assigned guest order ${orderId} to ${selected.firstName} ${selected.lastName}`);
        }
        return selected;
      }

      return null;
    } catch (error) {
      console.error(`❌ [ORDER-CONFIRMATION] Error in autoAssignOnCreation:`, error.message);
      return null;
    }
  }

  async notifyNewQueue(companyId, settings) {
    if (!settings.notifyOnNew) return;

    const regularFilters = this.buildConfirmationFilters(settings, { companyId });
    const guestFilters = this.buildGuestFilters(settings, { companyId });

    if (regularFilters.disabled && guestFilters.disabled) return;

    if (!regularFilters.disabled) {
      regularFilters.where.AND.push({ confirmationNotifiedAt: null });
    }

    if (!guestFilters.disabled) {
      if (!guestFilters.where.AND) guestFilters.where.AND = [];
      guestFilters.where.AND.push({ confirmationNotifiedAt: null });
    }

    const [regularOrders, guestOrders] = await Promise.all([
      regularFilters.disabled
        ? []
        : this.prisma.order.findMany({
          where: regularFilters.where,
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true }
        }),
      guestFilters.disabled
        ? []
        : this.prisma.guestOrder.findMany({
          where: guestFilters.where,
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true }
        })
    ]);

    const totalNew = regularOrders.length + guestOrders.length;
    if (totalNew === 0) return;

    const eligibleUsers = await this.getEligibleUsers(companyId, settings);
    if (!eligibleUsers.length) return;

    const orderNumbers = [
      ...regularOrders.map((o) => o.orderNumber),
      ...guestOrders.map((o) => o.orderNumber)
    ].slice(0, 5);

    const message = orderNumbers.length
      ? `وصلت ${totalNew} طلبات تحتاج تأكيد. أمثلة: ${orderNumbers.join(', ')}`
      : `وصلت ${totalNew} طلبات تحتاج تأكيد.`;

    await Promise.all(
      eligibleUsers.map((user) =>
        this.prisma.notification.create({
          data: {
            companyId,
            userId: user.id,
            title: 'طلبات تحتاج تأكيد',
            message,
            type: 'order_confirmation_queue',
            data: {
              count: totalNew,
              orders: orderNumbers
            }
          }
        })
      )
    );

    const now = new Date();
    if (regularOrders.length) {
      await this.prisma.order.updateMany({
        where: { id: { in: regularOrders.map((o) => o.id) } },
        data: { confirmationNotifiedAt: now }
      });
    }
    if (guestOrders.length) {
      await this.prisma.guestOrder.updateMany({
        where: { id: { in: guestOrders.map((o) => o.id) } },
        data: { confirmationNotifiedAt: now }
      });
    }
  }

  async confirmOrder(companyId, orderIdOrNumber, userId, notes = null) {
    const settings = this.normalizeSettings(await this.getSettings(companyId));
    const targetStatus = (settings.confirmStatus || 'CONFIRMED').toUpperCase();

    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } })
      : null;
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null;

    let order = await this.prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }]
      }
    });

    if (!order) {
      const guestOrder = await this.prisma.guestOrder.findFirst({
        where: { companyId, OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] }
      });

      if (!guestOrder) throw new Error('الطلب غير موجود');

      const updatedGuest = await this.prisma.guestOrder.update({
        where: { id: guestOrder.id },
        data: { status: targetStatus, updatedAt: new Date() }
      });

      if (targetStatus === 'CONFIRMED') {
        try {
          const orderService = require('./orderService');
          orderService.autoCreateTurboShipmentForGuestOrder(updatedGuest, companyId).catch(err => {
            console.warn('⚠️ [TURBO-AUTO] orderConfirmationService guest error:', err.message);
          });
        } catch (turboErr) {
          console.warn('⚠️ [TURBO-AUTO] orderConfirmationService require error:', turboErr.message);
        }
      }

      await this.prisma.orderStatusHistory.create({
        data: {
          guestOrderId: guestOrder.id,
          status: targetStatus,
          oldStatus: guestOrder.status,
          changedBy: userId,
          userName: userName,
          reason: notes || 'Order confirmed'
        }
      });

      let assignment = null;
      if (settings.autoAssignOnConfirm && settings.distributionEnabled) {
        assignment = await this.autoAssignGuest(companyId, updatedGuest, settings, userId);
      }
      return { orderType: 'guest', order: updatedGuest, assignment };
    }

    const workflowResult = await orderWorkflowService.requestStatusChange(
      companyId,
      order.id,
      userId,
      targetStatus,
      notes || null,
      false,
      order
    );

    if (workflowResult && workflowResult.status === 'pending') {
      return { status: 'pending', requestId: workflowResult.requestId };
    }

    if (workflowResult && workflowResult.status === 'allowed') {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: targetStatus,
          oldStatus: order.status,
          changedBy: userId,
          userName: userName,
          reason: notes || 'Order confirmed'
        }
      });

      const confirmed = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          confirmedAt: new Date(),
          confirmedBy: userId,
          confirmationNotes: notes || null
        }
      });

      if (targetStatus === 'CONFIRMED') {
        try {
          const { wholesaleService } = require('./wholesaleService');
          wholesaleService.recordOrderInvoice(confirmed).catch(err => {
            console.warn('⚠️ [WHOLESALE-INVOICE] orderConfirmationService regular error:', err.message);
          });
        } catch (_) {}

        try {
          const orderService = require('./orderService');
          orderService.autoCreateTurboShipmentForOrder(confirmed, companyId).catch(err => {
            console.warn('⚠️ [TURBO-AUTO] orderConfirmationService regular error:', err.message);
          });
        } catch (turboErr) {
          console.warn('⚠️ [TURBO-AUTO] orderConfirmationService require error:', turboErr.message);
        }
      }

      let assignment = null;
      if (settings.autoAssignOnConfirm && settings.distributionEnabled) {
        assignment = await this.autoAssign(companyId, confirmed, settings, userId);
      }

      return { orderType: 'regular', order: confirmed, assignment };
    }

    const orderService = require('./orderService');
    const updatedOrder = await orderService.updateOrderStatus(
      order.orderNumber,
      companyId,
      targetStatus,
      notes || 'Order confirmed',
      userId,
      userName
    );

    const confirmed = await this.prisma.order.update({
      where: { id: updatedOrder.id || order.id },
      data: {
        confirmedAt: new Date(),
        confirmedBy: userId,
        confirmationNotes: notes || null
      }
    });

    let assignment = null;
    if (settings.autoAssignOnConfirm && settings.distributionEnabled) {
      assignment = await this.autoAssign(companyId, confirmed, settings, userId);
    }

    return { orderType: 'regular', order: confirmed, assignment };
  }

  async logCallResult(companyId, orderIdOrNumber, userId, result = 'unreached', notes = null) {
    const settings = this.normalizeSettings(await this.getSettings(companyId));
    const callResult = ALLOWED_CALL_RESULTS.includes(result) ? result : 'unreached';
    const now = new Date();
    const intervalMs = (settings.intervalMinutes || 0) * 60 * 1000;
    const maxCalls = settings.maxCallsNoAnswer ?? DEFAULT_SETTINGS.maxCallsNoAnswer;

    const assertInterval = (lastCallAt) => {
      if (!lastCallAt || intervalMs <= 0) return;
      const nextAllowed = new Date(new Date(lastCallAt).getTime() + intervalMs);
      if (now < nextAllowed) {
        const waitMinutes = Math.ceil((nextAllowed.getTime() - now.getTime()) / 60000);
        throw new Error(`يرجى الانتظار ${waitMinutes} دقيقة قبل محاولة الاتصال التالية`);
      }
    };

    const assertMaxCalls = (callAttempts) => {
      if (callResult === 'unreached' && (callAttempts || 0) >= maxCalls) {
        throw new Error('تم الوصول لأقصى عدد محاولات الاتصال بدون رد');
      }
    };

    const order = await this.prisma.order.findFirst({
      where: {
        companyId,
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }]
      }
    });

    if (order) {
      assertInterval(order.lastCallAttemptAt);
      assertMaxCalls(order.callAttempts);

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            callAttempts: { increment: 1 },
            lastCallAttemptAt: now
          }
        });
        await tx.callAttemptLog.create({
          data: {
            companyId,
            orderId: order.id,
            userId,
            result: callResult,
            notes: notes || null,
            createdAt: now
          }
        });
      });

      const updatedOrder = await this.prisma.order.findUnique({ where: { id: order.id } });
      return {
        orderType: 'regular',
        order: updatedOrder,
        callAttempts: updatedOrder.callAttempts || 0,
        nextCallAllowedAt: intervalMs > 0 ? new Date(now.getTime() + intervalMs) : null
      };
    }

    const guestOrder = await this.prisma.guestOrder.findFirst({
      where: { companyId, OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] }
    });

    if (!guestOrder) throw new Error('الطلب غير موجود');

    assertInterval(guestOrder.lastCallAt);
    assertMaxCalls(guestOrder.callAttempts);

    await this.prisma.$transaction(async (tx) => {
      await tx.guestOrder.update({
        where: { id: guestOrder.id },
        data: {
          callAttempts: { increment: 1 },
          lastCallAt: now
        }
      });
      await tx.callAttemptLog.create({
        data: {
          companyId,
          guestOrderId: guestOrder.id,
          userId,
          result: callResult,
          notes: notes || null,
          createdAt: now
        }
      });
    });

    const updatedGuest = await this.prisma.guestOrder.findUnique({ where: { id: guestOrder.id } });
    return {
      orderType: 'guest',
      order: updatedGuest,
      callAttempts: updatedGuest.callAttempts || 0,
      nextCallAllowedAt: intervalMs > 0 ? new Date(now.getTime() + intervalMs) : null
    };
  }
}

module.exports = new OrderConfirmationService();

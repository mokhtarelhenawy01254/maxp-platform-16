const { getSharedPrismaClient } = require("../services/sharedDatabase");
const WhatsAppNotificationService = require("../services/whatsapp/WhatsAppNotificationService");

const PLANNED_AUTOMATIONS = [];
const DEFAULT_ADMIN_SCOPE = "SUPER_ADMIN";
const SUPER_ADMIN_AUTOMATION_EVENT_LIST = [
  "NEW_SIGNUP_WELCOME",
  "NEW_SIGNUP_ADMIN_ALERT",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_RENEWED",
  "SUBSCRIPTION_CANCELLED",
];
const SUPER_ADMIN_AUTOMATION_EVENTS = new Set(
  SUPER_ADMIN_AUTOMATION_EVENT_LIST,
);

function isMissingTableError(error) {
  const message = String(error?.message || "");
  return error?.code === "P2021" || message.includes("does not exist");
}

async function withMissingTableFallback(operation, fallbackValue) {
  try {
    return await operation();
  } catch (error) {
    if (isMissingTableError(error)) {
      return fallbackValue;
    }
    throw error;
  }
}

function getCategoryForEvent(eventType) {
  if (
    eventType.startsWith("ORDER_") ||
    eventType.startsWith("PAYMENT_")
  ) {
    return "ORDERS";
  }

  if (
    eventType.startsWith("BACK_IN_STOCK") ||
    eventType.startsWith("PRICE_") ||
    eventType.startsWith("NEW_PRODUCT")
  ) {
    return "PRODUCTS";
  }

  if (
    eventType.startsWith("CART_") ||
    eventType.startsWith("PROMOTIONAL") ||
    eventType.startsWith("COUPON_") ||
    eventType.startsWith("BIRTHDAY") ||
    eventType.startsWith("LOYALTY") ||
    eventType === "NEWSLETTER_SUBSCRIBED" ||
    eventType === "BENEFIT_GRANTED"
  ) {
    return "MARKETING";
  }

  if (eventType.startsWith("NEW_SIGNUP_")) {
    return "CUSTOMER";
  }

  if (eventType.startsWith("SUBSCRIPTION_")) {
    return "SYSTEM";
  }

  if (
    eventType.startsWith("ATTENDANCE_") ||
    eventType.startsWith("LEAVE_") ||
    eventType.startsWith("PAYROLL") ||
    eventType.startsWith("PERMISSION_") ||
    eventType.startsWith("MANUAL_") ||
    eventType.startsWith("WARNING_") ||
    eventType.startsWith("ANNOUNCEMENT")
  ) {
    return "HR";
  }

  return "SYSTEM";
}

function getAutomationSurface(eventType) {
  return SUPER_ADMIN_AUTOMATION_EVENTS.has(eventType)
    ? "SUPER_ADMIN"
    : "COMPANY_WORKSPACE";
}

function createEmptyStats() {
  return {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    deliveryRate: 0,
    readRate: 0,
    byCategory: {},
    byEvent: {},
  };
}

function normalizeAdminScope(scope = DEFAULT_ADMIN_SCOPE) {
  return String(scope || DEFAULT_ADMIN_SCOPE).toUpperCase() === "ALL"
    ? "ALL"
    : DEFAULT_ADMIN_SCOPE;
}

function withAdminScope(where = {}, scope = DEFAULT_ADMIN_SCOPE) {
  const normalizedScope = normalizeAdminScope(scope);
  if (normalizedScope === "ALL") {
    return where;
  }

  const scopeCondition = {
    eventType: { in: SUPER_ADMIN_AUTOMATION_EVENT_LIST },
  };

  if (!where || Object.keys(where).length === 0) {
    return scopeCondition;
  }

  return {
    AND: [where, scopeCondition],
  };
}

async function getScopedNotificationStats(
  companyId,
  dateRange = 30,
  scope = DEFAULT_ADMIN_SCOPE,
) {
  const prisma = getSharedPrismaClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const baseWhere = {
    companyId,
    createdAt: { gte: startDate },
  };

  const scopedWhere = withAdminScope(baseWhere, scope);

  const [total, sent, delivered, read, failed, byCategory, byEvent] =
    await Promise.all([
      prisma.whatsAppNotificationLog.count({
        where: scopedWhere,
      }),
      prisma.whatsAppNotificationLog.count({
        where: {
          ...scopedWhere,
          status: "SENT",
        },
      }),
      prisma.whatsAppNotificationLog.count({
        where: {
          ...scopedWhere,
          status: "DELIVERED",
        },
      }),
      prisma.whatsAppNotificationLog.count({
        where: {
          ...scopedWhere,
          status: "READ",
        },
      }),
      prisma.whatsAppNotificationLog.count({
        where: {
          ...scopedWhere,
          status: "FAILED",
        },
      }),
      prisma.whatsAppNotificationLog.groupBy({
        by: ["category"],
        where: scopedWhere,
        _count: true,
      }),
      prisma.whatsAppNotificationLog.groupBy({
        by: ["eventType"],
        where: scopedWhere,
        _count: true,
      }),
    ]);

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : 0,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {}),
    byEvent: byEvent.reduce((acc, item) => {
      acc[item.eventType] = item._count;
      return acc;
    }, {}),
  };
}

function reduceSessionsByCompany(sessions) {
  return sessions.reduce((map, session) => {
    const existing = map.get(session.companyId) || [];
    existing.push(session);
    map.set(session.companyId, existing);
    return map;
  }, new Map());
}

function reduceTemplatesByCompany(templates) {
  return templates.reduce((map, template) => {
    const current = map.get(template.companyId) || {
      total: 0,
      active: 0,
      updatedAt: null,
    };

    current.total += 1;
    if (template.isActive) {
      current.active += 1;
    }

    if (!current.updatedAt || new Date(template.updatedAt) > new Date(current.updatedAt)) {
      current.updatedAt = template.updatedAt;
    }

    map.set(template.companyId, current);
    return map;
  }, new Map());
}

function reduceLogsByCompany(groupedLogs) {
  return groupedLogs.reduce((map, item) => {
    map.set(item.companyId, {
      total: item._count?._all || item._count || 0,
      lastCreatedAt: item._max?.createdAt || null,
    });
    return map;
  }, new Map());
}

function reduceFailedLogsByCompany(groupedLogs) {
  return groupedLogs.reduce((map, item) => {
    map.set(item.companyId, item._count?._all || item._count || 0);
    return map;
  }, new Map());
}

async function getOverview(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const scope = normalizeAdminScope(req.query.scope);
    const now = new Date();
    const last24Hours = new Date(now);
    const last7Days = new Date(now);
    const last30Days = new Date(now);

    last24Hours.setHours(last24Hours.getHours() - 24);
    last7Days.setDate(last7Days.getDate() - 7);
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      totalCompanies,
      activeCompanies,
      sessions,
      enabledSettingsCount,
      templates,
      recentFailures,
      topEvents,
      sentLast24Hours,
      failedLast7Days,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.whatsAppSession.findMany({
        select: {
          companyId: true,
          status: true,
        },
      }),
      prisma.whatsAppNotificationSettings.count({
        where: { isEnabled: true },
      }),
      prisma.whatsAppNotificationTemplate.findMany({
        where: withAdminScope({}, scope),
        select: {
          isActive: true,
        },
      }),
      withMissingTableFallback(
        () =>
          prisma.whatsAppNotificationLog.findMany({
            where: withAdminScope({
              status: "FAILED",
              createdAt: { gte: last7Days },
            }, scope),
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
              id: true,
              eventType: true,
              recipientPhone: true,
              failureReason: true,
              createdAt: true,
              company: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          }),
        [],
      ),
      withMissingTableFallback(
        () =>
          prisma.whatsAppNotificationLog.groupBy({
            by: ["eventType"],
            where: withAdminScope({
              createdAt: { gte: last30Days },
            }, scope),
            _count: {
              _all: true,
            },
          }),
        [],
      ),
      withMissingTableFallback(
        () =>
          prisma.whatsAppNotificationLog.count({
            where: withAdminScope({
              createdAt: { gte: last24Hours },
            }, scope),
          }),
        0,
      ),
      withMissingTableFallback(
        () =>
          prisma.whatsAppNotificationLog.count({
            where: withAdminScope({
              status: "FAILED",
              createdAt: { gte: last7Days },
            }, scope),
          }),
        0,
      ),
    ]);

    const connectedSessions = sessions.filter(
      (session) => session.status === "CONNECTED",
    ).length;
    const disconnectedSessions = Math.max(sessions.length - connectedSessions, 0);
    const companiesWithSessions = new Set(sessions.map((session) => session.companyId))
      .size;
    const companiesWithConnectedSessions = new Set(
      sessions
        .filter((session) => session.status === "CONNECTED")
        .map((session) => session.companyId),
    ).size;

    res.json({
      success: true,
      data: {
        metrics: {
          totalCompanies,
          activeCompanies,
          companiesWithSessions,
          companiesWithConnectedSessions,
          connectedSessions,
          disconnectedSessions,
          notificationsEnabledCompanies: enabledSettingsCount,
          totalTemplates: templates.length,
          activeTemplates: templates.filter((template) => template.isActive).length,
          sentLast24Hours,
          failedLast7Days,
        },
        topEvents: [...topEvents]
          .sort((left, right) => {
            const leftTotal = left._count?._all || 0;
            const rightTotal = right._count?._all || 0;
            return rightTotal - leftTotal;
          })
          .slice(0, 8)
          .map((eventRow) => ({
          eventType: eventRow.eventType,
          total: eventRow._count?._all || 0,
          category: getCategoryForEvent(eventRow.eventType),
        })),
        recentFailures,
        scope,
      },
    });
  } catch (error) {
    console.error("❌ [ADMIN-WHATSAPP] Error building overview:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحميل لوحة واتساب للسوبر أدمن",
      error: error.message,
    });
  }
}

async function getCompanies(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      notifications = "",
      scope = DEFAULT_ADMIN_SCOPE,
    } = req.query;

    const normalizedScope = normalizeAdminScope(scope);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [companies, sessions, settings, templates, groupedLogs, groupedFailures] =
      await Promise.all([
        prisma.company.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,

            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.whatsAppSession.findMany({
          select: {
            id: true,
            companyId: true,
            status: true,
            isDefault: true,
            name: true,
            phoneNumber: true,
            lastConnectedAt: true,
          },
        }),
        prisma.whatsAppNotificationSettings.findMany({
          select: {
            companyId: true,
            isEnabled: true,
            defaultSessionId: true,
            orderNotificationsEnabled: true,
            productNotificationsEnabled: true,
            marketingNotificationsEnabled: true,
            hrNotificationsEnabled: true,
          },
        }),
        prisma.whatsAppNotificationTemplate.findMany({
          where: withAdminScope({}, normalizedScope),
          select: {
            companyId: true,
            isActive: true,
            updatedAt: true,
          },
        }),
        withMissingTableFallback(
          () =>
            prisma.whatsAppNotificationLog.groupBy({
              by: ["companyId"],
              where: withAdminScope({
                createdAt: { gte: last30Days },
              }, normalizedScope),
              _count: {
                _all: true,
              },
              _max: {
                createdAt: true,
              },
            }),
          [],
        ),
        withMissingTableFallback(
          () =>
            prisma.whatsAppNotificationLog.groupBy({
              by: ["companyId"],
              where: withAdminScope({
                createdAt: { gte: last30Days },
                status: "FAILED",
              }, normalizedScope),
              _count: {
                _all: true,
              },
            }),
          [],
        ),
      ]);

    const sessionsByCompany = reduceSessionsByCompany(sessions);
    const settingsByCompany = new Map(
      settings.map((setting) => [setting.companyId, setting]),
    );
    const templatesByCompany = reduceTemplatesByCompany(templates);
    const logsByCompany = reduceLogsByCompany(groupedLogs);
    const failedByCompany = reduceFailedLogsByCompany(groupedFailures);

    const mappedCompanies = companies.map((company) => {
      const companySessions = sessionsByCompany.get(company.id) || [];
      const companySettings = settingsByCompany.get(company.id) || null;
      const companyTemplates = templatesByCompany.get(company.id) || {
        total: 0,
        active: 0,
        updatedAt: null,
      };
      const companyLogs = logsByCompany.get(company.id) || {
        total: 0,
        lastCreatedAt: null,
      };
      const connectedSessions = companySessions.filter(
        (session) => session.status === "CONNECTED",
      );
      const defaultSession =
        companySessions.find((session) => session.isDefault) || null;
      const needsAttention =
        companySessions.length === 0 ||
        connectedSessions.length === 0 ||
        !defaultSession ||
        !companySettings?.isEnabled;

      let workspaceStatus = "connected";
      if (companySessions.length === 0) {
        workspaceStatus = "not-configured";
      } else if (connectedSessions.length === 0) {
        workspaceStatus = "disconnected";
      } else if (needsAttention) {
        workspaceStatus = "attention";
      }

      return {
        ...company,
        whatsapp: {
          status: workspaceStatus,
          needsAttention,
          sessionsTotal: companySessions.length,
          connectedSessions: connectedSessions.length,
          notificationsEnabled: Boolean(companySettings?.isEnabled),
          hasDefaultSession: Boolean(defaultSession),
          defaultSession: defaultSession
            ? {
                id: defaultSession.id,
                name: defaultSession.name,
                phoneNumber: defaultSession.phoneNumber,
              }
            : null,
          templatesTotal: companyTemplates.total,
          activeTemplates: companyTemplates.active,
          templatesUpdatedAt: companyTemplates.updatedAt,
          sentLast30Days: companyLogs.total,
          failedLast30Days: failedByCompany.get(company.id) || 0,
          lastNotificationAt: companyLogs.lastCreatedAt,
          modules: {
            orders: Boolean(companySettings?.orderNotificationsEnabled),
            products: Boolean(companySettings?.productNotificationsEnabled),
            marketing: Boolean(companySettings?.marketingNotificationsEnabled),
            hr: Boolean(companySettings?.hrNotificationsEnabled),
          },
        },
      };
    });

    const normalizedSearch = String(search || "").trim().toLowerCase();
    let filtered = mappedCompanies;

    if (normalizedSearch) {
      filtered = filtered.filter((company) =>
        [company.name, company.slug || "", company.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch)),
      );
    }

    if (status) {
      filtered = filtered.filter(
        (company) => company.whatsapp.status === status,
      );
    }

    if (notifications === "enabled") {
      filtered = filtered.filter(
        (company) => company.whatsapp.notificationsEnabled,
      );
    }

    if (notifications === "disabled") {
      filtered = filtered.filter(
        (company) => !company.whatsapp.notificationsEnabled,
      );
    }

    const numericPage = Number.parseInt(page, 10) || 1;
    const numericLimit = Number.parseInt(limit, 10) || 20;
    const startIndex = (numericPage - 1) * numericLimit;
    const data = filtered.slice(startIndex, startIndex + numericLimit);

    res.json({
      success: true,
      data,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / numericLimit)),
      },
    });
  } catch (error) {
    console.error("❌ [ADMIN-WHATSAPP] Error loading companies:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحميل شركات واتساب",
      error: error.message,
    });
  }
}

async function getCompanySummary(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.params;
    const scope = normalizeAdminScope(req.query.scope);

    const [company, sessions, settings, templates, recentLogs] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.whatsAppSession.findMany({
        where: { companyId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          status: true,
          isDefault: true,
          provider: true,
          lastConnectedAt: true,
          createdAt: true,
        },
      }),
      prisma.whatsAppNotificationSettings.findUnique({
        where: { companyId },
      }),
      prisma.whatsAppNotificationTemplate.findMany({
        where: withAdminScope({ companyId }, scope),
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          eventType: true,
          category: true,
          isActive: true,
          updatedAt: true,
        },
      }),
      withMissingTableFallback(
        () =>
          prisma.whatsAppNotificationLog.findMany({
            where: withAdminScope({ companyId }, scope),
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
              id: true,
              eventType: true,
              status: true,
              recipientPhone: true,
              createdAt: true,
            },
          }),
        [],
      ),
    ]);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const stats = await withMissingTableFallback(
      () => getScopedNotificationStats(companyId, 30, scope),
      createEmptyStats(),
    );

    const connectedSessions = sessions.filter(
      (session) => session.status === "CONNECTED",
    ).length;
    const templatesByCategory = templates.reduce((acc, template) => {
      const key = template.category || "SYSTEM";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        company,
        summary: {
          sessionsTotal: sessions.length,
          connectedSessions,
          defaultSession:
            sessions.find((session) => session.isDefault) || null,
          notificationsEnabled: Boolean(settings?.isEnabled),
          templatesTotal: templates.length,
          templatesByCategory,
        },
        settings,
        sessions,
        templates,
        stats,
        recentLogs,
        scope,
      },
    });
  } catch (error) {
    console.error("❌ [ADMIN-WHATSAPP] Error loading company summary:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحميل مساحة الشركة",
      error: error.message,
    });
  }
}

async function getLogs(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const {
      page = 1,
      limit = 20,
      companyId = "",
      category = "",
      eventType = "",
      status = "",
      startDate = "",
      endDate = "",
      search = "",
      scope = DEFAULT_ADMIN_SCOPE,
    } = req.query;

    const baseWhere = {};
    const normalizedScope = normalizeAdminScope(scope);

    if (companyId) baseWhere.companyId = companyId;
    if (category) baseWhere.category = category;
    if (eventType) baseWhere.eventType = eventType;
    if (status) baseWhere.status = status;

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) {
        baseWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        baseWhere.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      baseWhere.OR = [
        { recipientPhone: { contains: search } },
        { recipientName: { contains: search } },
        { content: { contains: search } },
        {
          company: {
            is: {
              name: { contains: search },
            },
          },
        },
      ];
    }

    const where = withAdminScope(baseWhere, normalizedScope);

    const numericPage = Number.parseInt(page, 10) || 1;
    const numericLimit = Number.parseInt(limit, 10) || 20;

    const [logs, total] = await withMissingTableFallback(
      async () =>
        Promise.all([
          prisma.whatsAppNotificationLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (numericPage - 1) * numericLimit,
            take: numericLimit,
            include: {
              company: {
                select: {
                  name: true,
                  slug: true,
                },
              },
              whatsapp_notification_templates: {
                select: {
                  name: true,
                },
              },
              order: {
                select: {
                  orderNumber: true,
                },
              },
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          }),
          prisma.whatsAppNotificationLog.count({ where }),
        ]),
      [[], 0],
    );

    res.json({
      success: true,
      logs,
      scope: normalizedScope,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.max(1, Math.ceil(total / numericLimit)),
      },
    });
  } catch (error) {
    console.error("❌ [ADMIN-WHATSAPP] Error loading logs:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحميل سجلات واتساب",
      error: error.message,
    });
  }
}

async function getAutomationCatalog(req, res) {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId = "" } = req.query;

    const templates = await prisma.whatsAppNotificationTemplate.findMany({
      where: companyId ? { companyId } : undefined,
      select: {
        companyId: true,
        eventType: true,
        isActive: true,
      },
    });

    const usageByEvent = templates.reduce((map, template) => {
      const current = map.get(template.eventType) || {
        templateCount: 0,
        companyIds: new Set(),
        activeCompanyIds: new Set(),
      };

      current.templateCount += 1;
      current.companyIds.add(template.companyId);
      if (template.isActive) {
        current.activeCompanyIds.add(template.companyId);
      }

      map.set(template.eventType, current);
      return map;
    }, new Map());

    const readyNow = Object.entries(
      WhatsAppNotificationService.DEFAULT_TEMPLATES || {},
    ).map(([eventType, template]) => {
      const usage = usageByEvent.get(eventType) || {
        templateCount: 0,
        companyIds: new Set(),
        activeCompanyIds: new Set(),
      };

      return {
        eventType,
        name: template.name,
        category: getCategoryForEvent(eventType),
        description: template.content,
        variables: template.variables || [],
        templateCount: usage.templateCount,
        configuredCompanies: usage.companyIds.size,
        activeCompanies: usage.activeCompanyIds.size,
        scope: getAutomationSurface(eventType),
        supported: true,
      };
    });

    const platformReadyNow = readyNow.filter(
      (item) => item.scope === "SUPER_ADMIN",
    );
    const companyOwnedEvents = readyNow.filter(
      (item) => item.scope === "COMPANY_WORKSPACE",
    );

    const companyCategories = companyOwnedEvents.reduce((accumulator, item) => {
      const current = accumulator[item.category] || {
        category: item.category,
        totalEvents: 0,
        activeCompanies: 0,
      };

      current.totalEvents += 1;
      current.activeCompanies += item.activeCompanies;
      accumulator[item.category] = current;
      return accumulator;
    }, {});

    res.json({
      success: true,
      data: {
        platformReadyNow,
        companyOwnedSummary: {
          totalEvents: companyOwnedEvents.length,
          categories: Object.values(companyCategories).sort(
            (left, right) => right.totalEvents - left.totalEvents,
          ),
          note:
            "إشعارات العملاء والطلبات والتسويق والموارد البشرية تُدار داخل مساحة الشركة، ولا نكررها في شاشة السوبر أدمن.",
        },
        nextPhase: PLANNED_AUTOMATIONS,
      },
    });
  } catch (error) {
    console.error("❌ [ADMIN-WHATSAPP] Error loading automation catalog:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحميل كتالوج الأتمتة",
      error: error.message,
    });
  }
}

module.exports = {
  getOverview,
  getCompanies,
  getCompanySummary,
  getLogs,
  getAutomationCatalog,
};

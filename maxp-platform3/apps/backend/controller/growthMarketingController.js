const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

/**
 * 📈 Growth Marketing Controller
 * Handles repeat customers, retention analytics, and engagement messaging.
 */

// ─────────────────────────────────────────────
// Helper: get Prisma client
// ─────────────────────────────────────────────
async function getPrisma() {
    return getSharedPrismaClient();
}

// ─────────────────────────────────────────────
// 1. Dashboard Overview
// ─────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'companyId مطلوب' });

        const prisma = await getPrisma();

        // Customers with more than 1 order
        const repeatCustomers = await prisma.$queryRaw`
            SELECT
                COUNT(DISTINCT o."customerId") AS "repeatCustomerCount"
            FROM "orders" o
            WHERE o."companyId" = ${companyId}
              AND o."customerId" IS NOT NULL
            GROUP BY o."customerId"
            HAVING COUNT(o.id) > 1
        `;

        // Total distinct customers
        const totalCustomersRaw = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT "customerId")::int AS count
            FROM "orders"
            WHERE "companyId" = ${companyId}
              AND "customerId" IS NOT NULL
        `;
        const totalCustomers = Number(totalCustomersRaw?.[0]?.count || 0);

        // Revenue from repeat customers
        const repeatRevenue = await prisma.$queryRaw`
            SELECT COALESCE(SUM(sub."total"), 0) AS "revenue"
            FROM (
                SELECT o."customerId", SUM(o."total") AS "total"
                FROM "orders" o
                WHERE o."companyId" = ${companyId}
                  AND o."customerId" IS NOT NULL
                GROUP BY o."customerId"
                HAVING COUNT(o.id) > 1
            ) sub
        `;

        // At-risk customers (no order in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const atRiskCustomers = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT o."customerId") AS "atRiskCount"
            FROM "orders" o
            WHERE o."companyId" = ${companyId}
              AND o."customerId" IS NOT NULL
            GROUP BY o."customerId"
            HAVING MAX(o."createdAt") < ${thirtyDaysAgo}
        `;

        // Recent repeat orders (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentRepeatOrdersRaw = await prisma.$queryRaw`
            SELECT COUNT(id)::int AS count
            FROM "orders"
            WHERE "companyId" = ${companyId}
              AND "createdAt" >= ${sevenDaysAgo}
              AND "customerId" IS NOT NULL
        `;
        const recentRepeatOrders = Number(recentRepeatOrdersRaw?.[0]?.count || 0);

        return res.json({
            success: true,
            data: {
                repeatCustomerCount: Number(repeatCustomers?.length || 0),
                totalCustomers,
                atRiskCount: Number(atRiskCustomers?.length || 0),
                recentRepeatOrders,
                repeatRevenue: Number(repeatRevenue?.[0]?.revenue || 0),
                repeatRate: totalCustomers > 0
                    ? ((repeatCustomers?.length || 0) / totalCustomers * 100).toFixed(1)
                    : '0.0',
            },
        });
    } catch (error) {
        console.error('[growthMarketing] getDashboard error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب بيانات لوحة التحكم', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 2. Repeat Customers List
// ─────────────────────────────────────────────
exports.getRepeatCustomers = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'companyId مطلوب' });

        const { page = 1, limit = 20, minOrders = 2 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const prisma = await getPrisma();

        const customers = await prisma.$queryRaw`
            SELECT
                c.id,
                c."firstName",
                c."lastName",
                c.phone,
                c.email,
                COUNT(o.id)::int AS "orderCount",
                SUM(o.total) AS "totalSpent",
                MAX(o."createdAt") AS "lastOrderDate",
                MIN(o."createdAt") AS "firstOrderDate"
            FROM "customers" c
            JOIN "orders" o ON o."customerId" = c.id
            WHERE o."companyId" = ${companyId}
            GROUP BY c.id, c."firstName", c."lastName", c.phone, c.email
            HAVING COUNT(o.id) >= ${parseInt(minOrders)}
            ORDER BY COUNT(o.id) DESC
            LIMIT ${parseInt(limit)} OFFSET ${offset}
        `;

        const total = await prisma.$queryRaw`
            SELECT COUNT(*)::int AS count
            FROM (
                SELECT o."customerId"
                FROM "orders" o
                WHERE o."companyId" = ${companyId}
                  AND o."customerId" IS NOT NULL
                GROUP BY o."customerId"
                HAVING COUNT(o.id) >= ${parseInt(minOrders)}
            ) sub
        `;

        return res.json({
            success: true,
            data: customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: Number(total?.[0]?.count || 0),
            },
        });
    } catch (error) {
        console.error('[growthMarketing] getRepeatCustomers error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب العملاء المكررين', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 3. At-Risk Customers (no purchase in X days)
// ─────────────────────────────────────────────
exports.getAtRiskCustomers = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'companyId مطلوب' });

        const { days = 30, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const prisma = await getPrisma();

        const customers = await prisma.$queryRaw`
            SELECT
                c.id,
                c."firstName",
                c."lastName",
                c.phone,
                c.email,
                COUNT(o.id)::int AS "orderCount",
                SUM(o.total) AS "totalSpent",
                MAX(o."createdAt") AS "lastOrderDate",
                EXTRACT(DAY FROM NOW() - MAX(o."createdAt"))::int AS "daysSinceLastOrder"
            FROM "customers" c
            JOIN "orders" o ON o."customerId" = c.id
            WHERE o."companyId" = ${companyId}
            GROUP BY c.id, c."firstName", c."lastName", c.phone, c.email
            HAVING MAX(o."createdAt") < ${cutoffDate}
            ORDER BY MAX(o."createdAt") ASC
            LIMIT ${parseInt(limit)} OFFSET ${offset}
        `;

        const total = await prisma.$queryRaw`
            SELECT COUNT(*)::int AS count
            FROM (
                SELECT o."customerId"
                FROM "orders" o
                WHERE o."companyId" = ${companyId}
                  AND o."customerId" IS NOT NULL
                GROUP BY o."customerId"
                HAVING MAX(o."createdAt") < ${cutoffDate}
            ) sub
        `;

        return res.json({
            success: true,
            data: customers,
            daysFilter: parseInt(days),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: Number(total?.[0]?.count || 0),
            },
        });
    } catch (error) {
        console.error('[growthMarketing] getAtRiskCustomers error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب العملاء في خطر', error: error.message });
    }
};

// ─────────────────────────────────────────────
// 4. Send Retention Message (WhatsApp)
// ─────────────────────────────────────────────
exports.sendRetentionMessage = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'companyId مطلوب' });

        const { customerIds, message, channel = 'whatsapp' } = req.body;
        if (!customerIds?.length) return res.status(400).json({ success: false, message: 'customerIds مطلوب' });
        if (!message) return res.status(400).json({ success: false, message: 'message مطلوب' });

        const prisma = await getPrisma();

        // Get customer phones
        const customers = await prisma.customer.findMany({
            where: {
                id: { in: customerIds },
                companyId,
            },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        });

        // Log the retention campaign
        const campaign = await prisma.activityLog.createMany({
            data: customers.map(c => ({
                companyId,
                userId: req.user.id,
                action: 'RETENTION_MESSAGE_SENT',
                entityType: 'Customer',
                entityId: c.id,
                metadata: JSON.stringify({ channel, message: message.substring(0, 100) }),
            })),
        }).catch(() => null); // graceful - activity log may not exist

        // Return customers with their contact info for the frontend to send
        return res.json({
            success: true,
            message: `تم تجهيز ${customers.length} رسالة للإرسال`,
            data: {
                customers: customers.map(c => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName || ''}`.trim(),
                    phone: c.phone,
                    email: c.email,
                })),
            },
        });
    } catch (error) {
        console.error('[growthMarketing] sendRetentionMessage error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في إرسال الرسائل', error: error.message });
    }
};

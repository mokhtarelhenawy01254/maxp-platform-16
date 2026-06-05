import { Prisma } from '../../../../backend/generated/postgresql_v2'
import prisma from '../../db/client'

export async function getDailyAnalytics(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const days = Math.min(Number(args.days ?? 7), 90)

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT date, "totalOrders", "totalRevenue", "newCustomers",
             "averageOrderValue", "cancelledOrders"
      FROM daily_analytics
      WHERE "companyId" = ${companyId}
        AND date >= CURRENT_DATE - INTERVAL '1 day' * ${days}
      ORDER BY date DESC
    `
  )
}

export async function getProductAnalytics(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 10), 50)
  const days = Math.min(Number(args.days ?? 30), 90)

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT pa."productId", pa.date, pa."totalSold", pa.revenue,
             p.name AS "productName"
      FROM product_analytics pa
      JOIN products p ON p.id = pa."productId"
      WHERE pa."companyId" = ${companyId}
        AND pa.date >= CURRENT_DATE - INTERVAL '1 day' * ${days}
      ORDER BY pa.revenue DESC
      LIMIT ${limit}
    `
  )
}

export async function getCommissions(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const status = args.status as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT c.id, c."affiliateId", c."orderId", c.amount, c.status,
             c."createdAt", a."firstName", a."lastName"
      FROM commissions c
      JOIN affiliates a ON a.id = c."affiliateId"
      WHERE c."companyId" = ${companyId}
        ${status ? Prisma.sql`AND c.status = ${status}` : Prisma.empty}
      ORDER BY c."createdAt" DESC
      LIMIT ${limit}
    `
  )
}

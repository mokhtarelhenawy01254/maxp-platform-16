import { Prisma } from '../../../../backend/generated/postgresql_v2'
import prisma from '../../db/client'

export async function getOrders(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const status = args.status as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT id, "orderNumber", status, total, "createdAt",
             "customerName", "customerPhone", "governorate"
      FROM orders
      WHERE "companyId" = ${companyId}
      ${status ? Prisma.sql`AND status = ${status}::\"OrderStatus\"` : Prisma.empty}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `
  )
}

export async function getOrderDetails(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const orderId = args.orderId as string

  const rows = await prisma.$queryRaw<unknown[]>(
    Prisma.sql`
      SELECT o.id, o."orderNumber", o.status, o.total, o.subtotal,
             o."customerName", o."customerPhone", o."shippingAddress",
             o."createdAt", o."updatedAt",
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', oi.id,
                   'productId', oi."productId",
                   'productName', oi."productName",
                   'quantity', oi.quantity,
                   'price', oi.price
                 )
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'
             ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi."orderId" = o.id
      WHERE o.id = ${orderId} AND o."companyId" = ${companyId}
      GROUP BY o.id
    `
  )
  return rows[0] ?? null
}

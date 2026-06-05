import { Prisma } from '../../../../backend/generated/postgresql_v2'
import prisma from '../../db/client'

export async function getCustomers(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const status = args.status as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT id, "firstName", "lastName", email, phone, status,
             "totalOrdersCount", "successScore", "createdAt"
      FROM customers
      WHERE "companyId" = ${companyId}
        ${status ? Prisma.sql`AND status = ${status}::\"CustomersStatus\"` : Prisma.empty}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `
  )
}

export async function getCustomerHistory(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const customerId = args.customerId as string
  const limit = Math.min(Number(args.limit ?? 10), 50)

  const [customer, orders] = await Promise.all([
    prisma.$queryRaw<unknown[]>(
      Prisma.sql`
        SELECT id, "firstName", "lastName", email, phone, status,
               "totalOrdersCount", "successScore", "deliveryRate", "createdAt"
        FROM customers
        WHERE id = ${customerId} AND "companyId" = ${companyId}
      `
    ),
    prisma.$queryRaw(
      Prisma.sql`
        SELECT id, "orderNumber", status, total, "createdAt"
        FROM orders
        WHERE "customerId" = ${customerId} AND "companyId" = ${companyId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `
    ),
  ])

  return { customer: (customer as unknown[])[0] ?? null, orders }
}

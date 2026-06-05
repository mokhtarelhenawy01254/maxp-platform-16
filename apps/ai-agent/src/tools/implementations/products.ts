import { Prisma } from '@prisma/client'
import prisma from '../../db/client'

export async function getProducts(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const search = args.search as string | undefined
  const inStock = args.inStock as boolean | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT id, name, sku, price, stock, "isActive", "categoryId", "mainImage"
      FROM products
      WHERE "companyId" = ${companyId}
        AND "deletedAt" IS NULL
        ${search ? Prisma.sql`AND name ILIKE ${'%' + search + '%'}` : Prisma.empty}
        ${inStock ? Prisma.sql`AND stock > 0` : Prisma.empty}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `
  )
}

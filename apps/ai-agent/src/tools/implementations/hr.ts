import { Prisma } from '../../../../backend/generated/postgresql_v2'
import prisma from '../../db/client'

export async function getEmployees(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const departmentId = args.departmentId as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT id, "employeeNumber", "firstName", "lastName", email, phone,
             "departmentId", "positionId", status, "hireDate"
      FROM employees
      WHERE "companyId" = ${companyId}
        ${departmentId ? Prisma.sql`AND "departmentId" = ${departmentId}` : Prisma.empty}
      ORDER BY "firstName" ASC
      LIMIT ${limit}
    `
  )
}

export async function getPayrolls(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 20), 100)
  const month = args.month as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT p.id, p."employeeId", p."periodStart", p."periodEnd",
             p."basicSalary", p."netSalary", p.status,
             e."firstName", e."lastName"
      FROM payrolls p
      JOIN employees e ON e.id = p."employeeId"
      WHERE p."companyId" = ${companyId}
        ${month ? Prisma.sql`AND TO_CHAR(p."periodStart", 'YYYY-MM') = ${month}` : Prisma.empty}
      ORDER BY p."periodStart" DESC
      LIMIT ${limit}
    `
  )
}

export async function getAttendance(
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const limit = Math.min(Number(args.limit ?? 50), 200)
  const employeeId = args.employeeId as string | undefined
  const date = args.date as string | undefined

  return prisma.$queryRaw(
    Prisma.sql`
      SELECT a.id, a."employeeId", a.date, a."checkIn", a."checkOut",
             a.status, a."workHours",
             e."firstName", e."lastName"
      FROM attendances a
      JOIN employees e ON e.id = a."employeeId"
      WHERE a."companyId" = ${companyId}
        ${employeeId ? Prisma.sql`AND a."employeeId" = ${employeeId}` : Prisma.empty}
        ${date ? Prisma.sql`AND a.date::date = ${date}::date` : Prisma.empty}
      ORDER BY a.date DESC
      LIMIT ${limit}
    `
  )
}

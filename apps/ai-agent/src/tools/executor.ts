import { getOrders, getOrderDetails } from './implementations/orders'
import { getProducts } from './implementations/products'
import { getCustomers, getCustomerHistory } from './implementations/customers'
import { getEmployees, getPayrolls, getAttendance } from './implementations/hr'
import { getDailyAnalytics, getProductAnalytics, getCommissions } from './implementations/analytics'
import { updateOrderStatus, createOrder, createTask } from './implementations/write'

type ToolFn = (args: Record<string, unknown>, companyId: string) => Promise<unknown>

const TOOL_MAP: Record<string, ToolFn> = {
  getOrders,
  getOrderDetails,
  getProducts,
  getCustomers,
  getCustomerHistory,
  getEmployees,
  getPayrolls,
  getAttendance,
  getDailyAnalytics,
  getProductAnalytics,
  getCommissions,
  updateOrderStatus,
  createOrder,
  createTask,
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  companyId: string
): Promise<unknown> {
  const fn = TOOL_MAP[name]
  if (!fn) throw new Error(`Unknown tool: ${name}`)
  return fn(args, companyId)
}

import 'dotenv/config'
import prisma from '../db/client'

const TOOLS = [
  {
    name: 'getOrders',
    label: 'عرض الطلبات',
    description: 'جلب قائمة الطلبات مع التصفية حسب الحالة والتاريخ',
    category: 'orders',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'عدد النتائج (افتراضي 20)' },
        status: {
          type: 'string',
          description: 'تصفية حسب الحالة',
          enum: ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'],
        },
      },
    }),
  },
  {
    name: 'getOrderDetails',
    label: 'تفاصيل طلب',
    description: 'جلب تفاصيل طلب محدد مع عناصره',
    category: 'orders',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      required: ['orderId'],
      properties: { orderId: { type: 'string', description: 'معرّف الطلب' } },
    }),
  },
  {
    name: 'updateOrderStatus',
    label: 'تحديث حالة طلب',
    description: 'تغيير حالة طلب موجود (يتطلب موافقة)',
    category: 'orders',
    isWrite: true,
    parameters: JSON.stringify({
      type: 'object',
      required: ['orderId', 'status'],
      properties: {
        orderId: { type: 'string' },
        status: { type: 'string', enum: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
      },
    }),
  },
  {
    name: 'createOrder',
    label: 'إنشاء طلب',
    description: 'إنشاء طلب جديد (يتطلب موافقة)',
    category: 'orders',
    isWrite: true,
    parameters: JSON.stringify({
      type: 'object',
      required: ['customerName', 'customerPhone', 'items'],
      properties: {
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['productId', 'quantity', 'price'],
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' },
            },
          },
        },
      },
    }),
  },
  {
    name: 'getProducts',
    label: 'عرض المنتجات',
    description: 'جلب قائمة المنتجات مع البحث والتصفية',
    category: 'products',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number' },
        search: { type: 'string', description: 'بحث بالاسم' },
        inStock: { type: 'boolean', description: 'فقط المنتجات المتاحة' },
      },
    }),
  },
  {
    name: 'getCustomers',
    label: 'عرض العملاء',
    description: 'جلب قائمة العملاء',
    category: 'customers',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number' },
        status: { type: 'string', enum: ['LEAD', 'ACTIVE', 'VIP', 'INACTIVE'] },
      },
    }),
  },
  {
    name: 'getCustomerHistory',
    label: 'تاريخ العميل',
    description: 'جلب سجل طلبات عميل معين',
    category: 'customers',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      required: ['customerId'],
      properties: { customerId: { type: 'string' }, limit: { type: 'number' } },
    }),
  },
  {
    name: 'getEmployees',
    label: 'عرض الموظفين',
    description: 'جلب قائمة الموظفين',
    category: 'hr',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: { limit: { type: 'number' }, departmentId: { type: 'string' } },
    }),
  },
  {
    name: 'getPayrolls',
    label: 'عرض الرواتب',
    description: 'جلب كشف الرواتب',
    category: 'hr',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number' },
        month: { type: 'string', description: 'مثال: 2025-06' },
      },
    }),
  },
  {
    name: 'getAttendance',
    label: 'عرض الحضور والغياب',
    description: 'جلب سجل الحضور والغياب',
    category: 'hr',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number' },
        employeeId: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
    }),
  },
  {
    name: 'getDailyAnalytics',
    label: 'تحليلات يومية',
    description: 'جلب التحليلات اليومية للمبيعات والطلبات',
    category: 'analytics',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: { days: { type: 'number', description: 'عدد الأيام الماضية (افتراضي 7)' } },
    }),
  },
  {
    name: 'getProductAnalytics',
    label: 'تحليلات المنتجات',
    description: 'جلب أداء المنتجات الأكثر مبيعاً',
    category: 'analytics',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: { limit: { type: 'number' }, days: { type: 'number' } },
    }),
  },
  {
    name: 'getCommissions',
    label: 'عرض العمولات',
    description: 'جلب عمولات المسوقين',
    category: 'analytics',
    isWrite: false,
    parameters: JSON.stringify({
      type: 'object',
      properties: {
        limit: { type: 'number' },
        status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED'] },
      },
    }),
  },
  {
    name: 'createTask',
    label: 'إنشاء مهمة',
    description: 'إنشاء مهمة جديدة لأحد الوكلاء',
    category: 'tasks',
    isWrite: true,
    parameters: JSON.stringify({
      type: 'object',
      required: ['title', 'agentId'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        agentId: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
    }),
  },
]

async function seed(): Promise<void> {
  console.log('Seeding agent tool definitions...')

  for (const tool of TOOLS) {
    await prisma.agentToolDefinition.upsert({
      where: { name: tool.name },
      update: { label: tool.label, description: tool.description, parameters: tool.parameters },
      create: tool,
    })
    console.log(`  ✓ ${tool.name}`)
  }

  console.log(`Done — ${TOOLS.length} tools seeded.`)
  await prisma.$disconnect()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})

const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');
const {
  buildInvoiceData,
  getOrCreateInvoiceSettings,
  generateInvoiceNumber
} = require('./orderInvoiceDocumentUtils');

function resolveItemSku(item) {
  if (!item) return item;
  const productSku = item.product?.sku || item.productSku || null;
  return { ...item, productSku };
}

async function generateInvoiceForOrder(orderIdOrNumber, userId = null) {
  try {
    const prisma = getSharedPrismaClient();

    console.log('🔍 [INVOICE] Searching for order:', orderIdOrNumber);

    // البحث عن الطلب بـ id أو orderNumber (يدعم جميع التنسيقات)
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
          // البحث بـ orderNumber الذي يحتوي على النص (للتنسيقات القديمة)
          { orderNumber: { contains: orderIdOrNumber } }
        ]
      },
      include: {
        customer: true,
        company: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    // إذا لم يتم العثور على الطلب، حاول البحث بمراجع خارجية مدعومة فعلاً في السكيمة
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          OR: [
            { externalId: orderIdOrNumber },
            { wooCommerceId: orderIdOrNumber }
          ]
        },
        include: {
          customer: true,
          company: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });
    }

    // Guest orders don't have a persisted OrderInvoice relation in the current schema.
    if (!order) {
      const guestOrder = await prisma.guestOrder.findFirst({
        where: {
          OR: [
            { id: orderIdOrNumber },
            { orderNumber: orderIdOrNumber }
          ]
        },
        select: { id: true, orderNumber: true }
      });

      if (guestOrder) {
        throw new Error('لا يمكن إنشاء فاتورة محفوظة لطلب ضيف. استخدم الطباعة المباشرة من صفحة الطلب.');
      }
    }

    console.log('📦 [INVOICE] Order found:', order ? `${order.orderNumber} (${order.id})` : 'NOT FOUND');

    if (!order) {
      console.error('❌ [INVOICE] Order not found in database:', orderIdOrNumber);
      throw new Error('الطلب غير موجود');
    }

    // التحقق من وجود فاتورة سابقة
    const existingInvoice = await prisma.orderInvoice.findUnique({
      where: { orderId: order.id }
    });

    if (existingInvoice) {
      return {
        success: true,
        invoice: existingInvoice,
        message: 'الفاتورة موجودة بالفعل'
      };
    }

    const invoiceSettings = await getOrCreateInvoiceSettings(prisma, order.companyId);
    const invoiceData = buildInvoiceData(order, invoiceSettings, userId);

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.create({
        data: invoiceData,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(resolveItemSku);
    }

    return {
      success: true,
      invoice,
      message: 'تم إنشاء الفاتورة بنجاح'
    };

  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

async function getInvoiceByOrderId(orderId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(resolveItemSku);
    }

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getInvoiceById(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(resolveItemSku);
    }

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getInvoiceByNumber(invoiceNumber) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.findUnique({
        where: { invoiceNumber },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              },
              customer: true
            }
          }
        }
      });
    });

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(resolveItemSku);
    }

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

async function getAllInvoices(companyId, filters = {}) {
  try {
    const prisma = getSharedPrismaClient();
    
    const {
      page = 1,
      limit = 20,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { companyId };

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } }
      ];
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }

    const [invoices, total] = await executeWithRetry(async () => {
      return await Promise.all([
        prisma.orderInvoice.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true
              }
            }
          },
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        prisma.orderInvoice.count({ where })
      ]);
    });

    const stats = await executeWithRetry(async () => {
      return await prisma.orderInvoice.aggregate({
        where: { companyId },
        _count: { id: true },
        _sum: { totalAmount: true }
      });
    });

    const paidStats = await executeWithRetry(async () => {
      return await prisma.orderInvoice.aggregate({
        where: { companyId, paymentStatus: 'PAID' },
        _count: { id: true },
        _sum: { totalAmount: true }
      });
    });

    return {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalInvoices: stats._count.id,
        totalAmount: stats._sum.totalAmount || 0,
        paidInvoices: paidStats._count.id,
        paidAmount: paidStats._sum.totalAmount || 0,
        pendingInvoices: stats._count.id - paidStats._count.id,
        pendingAmount: (stats._sum.totalAmount || 0) - (paidStats._sum.totalAmount || 0)
      }
    };

  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

async function updateInvoicePaymentStatus(invoiceId, paymentStatus, paidAt = null) {
  try {
    const prisma = getSharedPrismaClient();
    
    const updateData = { paymentStatus };
    
    if (paymentStatus === 'PAID' && !paidAt) {
      updateData.paidAt = new Date();
    } else if (paidAt) {
      updateData.paidAt = new Date(paidAt);
    }

    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          order: true
        }
      });
    });

    if (paymentStatus === 'PAID') {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: { paymentStatus: 'COMPLETED' }
      });
    }

    return invoice;
  } catch (error) {
    console.error('Error updating invoice payment status:', error);
    throw error;
  }
}

async function incrementPrintCount(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: {
          printCount: { increment: 1 },
          printedAt: new Date()
        }
      });
    });

    // Event-Based Automation: Print
    try {
      const order = await prisma.order.findUnique({
        where: { id: invoice.orderId },
        select: { id: true, orderNumber: true, companyId: true, status: true }
      });
      if (order && order.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: order.companyId },
          select: { settings: true }
        });
        if (company && company.settings) {
          const settings = JSON.parse(company.settings);
          if (settings.printAutomationEnabled && settings.printAutomationStatus && settings.printAutomationStatus !== order.status) {
            const orderService = require('./orderService');
            // updateOrderStatus(orderNumber, companyId, status, notes, userId, userName, existingOrderObject, isOverride, options)
            await orderService.updateOrderStatus(
              order.orderNumber,
              order.companyId,
              settings.printAutomationStatus,
              'تغيير تلقائي للحالة بعد طباعة الطلب', // notes
              'SYSTEM', // userId
              'System Automation', // userName
              null,
              true // isOverride to bypass standard transition checks
            );
          }
        }
      }
    } catch (autoErr) {
      console.error('Error executing print automation:', autoErr);
    }

    return invoice;
  } catch (error) {
    console.error('Error incrementing print count:', error);
    throw error;
  }
}

async function incrementEmailCount(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: {
          emailCount: { increment: 1 },
          emailedAt: new Date()
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error incrementing email count:', error);
    throw error;
  }
}

async function deleteInvoice(invoiceId) {
  try {
    const prisma = getSharedPrismaClient();
    
    await executeWithRetry(async () => {
      return await prisma.orderInvoice.delete({
        where: { id: invoiceId }
      });
    });

    return { success: true, message: 'تم حذف الفاتورة بنجاح' };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
}

async function updateInvoice(invoiceId, updateData) {
  try {
    const prisma = getSharedPrismaClient();
    
    const invoice = await executeWithRetry(async () => {
      return await prisma.orderInvoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });
    });

    return invoice;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
}

module.exports = {
  generateInvoiceForOrder,
  getInvoiceByOrderId,
  getInvoiceById,
  getInvoiceByNumber,
  getAllInvoices,
  updateInvoicePaymentStatus,
  incrementPrintCount,
  incrementEmailCount,
  deleteInvoice,
  updateInvoice,
  generateInvoiceNumber
};

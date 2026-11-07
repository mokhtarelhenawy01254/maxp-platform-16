const { getSharedPrismaClient } = require('../sharedDatabase');
const { extractAttributionFromCheckoutData } = require('../../utils/orderAttribution');
const axios = require('axios');

const activeIncompleteCartConversions = new Set();
let isAutoConvertRunning = false;

/**
 * 🛡️ فحص صحة رقم الهاتف واستبعاد الأرقام الوهمية أو المتكررة
 */
function isValidCustomerPhone(phone) {
  if (!phone) return false;
  const clean = String(phone)
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/\D/g, '');

  if (clean.length < 10 || clean.length > 15) return false;

  // استبعاد الأرقام المتطابقة بالكامل (مثال: 0000000000 أو 1111111111)
  if (/^(\d)\1+$/.test(clean)) return false;

  // تجريد مفتاح الدولة المصري (002 / 20) للفحص الدقيق
  const nationalEgyptian = clean.replace(/^(?:0020|002|20)/, '');
  const normalizedEgyptian = nationalEgyptian.startsWith('0') ? nationalEgyptian : ('0' + nationalEgyptian);

  // استبعاد الأرقام المصرية التي تحتوي على أصفار أو أرقام مكررة بعد الكود (مثال: 01000000000، 01111111111)
  if (/^01[0125](\d)\1{7}$/.test(normalizedEgyptian)) return false;

  // استبعاد الأرقام التسلسلية الوهمية
  if (['0123456789', '01234567890', '1234567890', '0987654321', '01234567891', '12345678901'].includes(clean)) return false;

  return true;
}

/**
 * ⚡ تحويل سلة متروكة واحدة إلى طلب رسمي بحالة PENDING داخل جدول الطلبات الرئيسي
 */
async function convertSingleIncompleteCart({
  companyId,
  cartId,
  user = null,
  forceConvert = false,
  cart = null,
  overrideBody = {},
  channel = 'admin-convert'
}) {
  const conversionKey = `${companyId}:${cartId}`;
  if (activeIncompleteCartConversions.has(conversionKey)) {
    return {
      success: false,
      code: 'CONVERSION_IN_PROGRESS',
      message: 'جاري تحويل هذا الطلب بالفعل، يرجى الانتظار...'
    };
  }
  activeIncompleteCartConversions.add(conversionKey);

  try {
    const prisma = getSharedPrismaClient();

    // 🛡️ فحص عدم تكرار التحويل (Idempotency)
    const alreadyConverted = await prisma.cartConversionLog.findFirst({
      where: { companyId, cartId }
    });
    if (alreadyConverted) {
      return {
        success: false,
        code: 'CART_ALREADY_CONVERTED',
        message: 'تم تحويل هذه السلة إلى طلب بالفعل مسبقاً',
        orderNumber: alreadyConverted.orderNumber,
        orderId: alreadyConverted.orderId
      };
    }

    if (!cart) {
      cart = await prisma.guestCart.findFirst({
        where: { companyId, cartId }
      });
    } else if (cart.companyId && cart.companyId !== companyId) {
      return {
        success: false,
        code: 'UNAUTHORIZED_CART',
        message: 'السلة غير تابعة لهذه الشركة'
      };
    }

    if (!cart) {
      return {
        success: false,
        code: 'CART_NOT_FOUND',
        message: 'السلة غير موجودة'
      };
    }

    let checkoutData = {};
    try {
      checkoutData = cart.checkoutData
        ? (typeof cart.checkoutData === 'string' ? JSON.parse(cart.checkoutData) : cart.checkoutData)
        : {};
    } catch (e) {
      checkoutData = {};
    }

    let items = [];
    try {
      items = cart.items
        ? (typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items)
        : [];
    } catch (e) {
      items = [];
    }

    const guestName = checkoutData.guestName || checkoutData.fullName || checkoutData.customerName || checkoutData.name || 'عميل';
    const guestPhone = checkoutData.guestPhone || checkoutData.customerPhone || checkoutData.phoneNumber || checkoutData.mobileNumber || checkoutData.phone || checkoutData.mobile || '';
    const guestEmail = checkoutData.guestEmail || checkoutData.customerEmail || checkoutData.emailAddress || checkoutData.email || '';
    const governorate = checkoutData.governorate || checkoutData.city || checkoutData.gov || '';
    const address = checkoutData.address || checkoutData.street || checkoutData.addressLine1 || '';
    const notes = checkoutData.notes || '';

    if (!guestPhone) {
      return {
        success: false,
        code: 'MISSING_PHONE',
        message: 'رقم الهاتف مطلوب لتحويل الطلب'
      };
    }

    if (!isValidCustomerPhone(guestPhone)) {
      return {
        success: false,
        code: 'INVALID_PHONE',
        message: 'رقم الهاتف غير صالح أو وهمي، تم تخطي تحويل السلة لحماية دقة وجودة الطلبات'
      };
    }

    // 🛡️ فحص ما إذا كان العميل لديه طلب مسجل بالفعل خلال آخر 48 ساعة لمنع تكرار الأوردرات والشحنات
    if (!forceConvert && guestPhone) {
      const cleanPhone = String(guestPhone)
        .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
        .replace(/\D/g, '')
        .slice(-10);

      if (cleanPhone && cleanPhone.length >= 8) {
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const existingOrder = await prisma.order.findFirst({
          where: {
            companyId,
            customerPhone: { contains: cleanPhone },
            createdAt: { gte: since48h },
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'] }
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            customerName: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingOrder) {
          return {
            success: false,
            code: 'EXISTING_CUSTOMER_ORDER',
            message: `تنبيه: هذا العميل لديه طلب مسجل بالفعل برقم (${existingOrder.orderNumber}) بحالة [${existingOrder.status}] بتاريخ ${new Date(existingOrder.createdAt).toLocaleDateString('ar-EG')}. هل تريد المتابعة وإنشاء طلب مكرر؟`,
            existingOrder: {
              id: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              status: existingOrder.status,
              total: existingOrder.total,
              createdAt: existingOrder.createdAt
            }
          };
        }
      }
    }

    const total = typeof cart.total === 'string' ? parseFloat(cart.total) || 0 : Number(cart.total || 0);
    const cartAttribution = extractAttributionFromCheckoutData(checkoutData);

    const couponCode = overrideBody?.couponCode || checkoutData.couponCode || checkoutData.coupon?.code || cart.couponCode || undefined;
    const discountAmount = overrideBody?.discountAmount !== undefined
      ? Number(overrideBody.discountAmount)
      : (checkoutData.discountAmount !== undefined
        ? Number(checkoutData.discountAmount)
        : (cart.discountAmount !== undefined ? Number(cart.discountAmount) : undefined));
    const appliedDiscount = overrideBody?.appliedDiscount || checkoutData.appliedDiscount || undefined;
    const bundleItems = overrideBody?.bundleItems || checkoutData.bundleItems || cart.bundleItems || undefined;

    const resolvedItems = (Array.isArray(overrideBody?.items) && overrideBody.items.length > 0)
      ? overrideBody.items
      : items;

    const orderPayload = {
      guestName,
      guestPhone,
      guestEmail,
      paymentMethod: checkoutData.paymentMethod || 'cod',
      notes,
      shippingAddress: {
        governorate,
        city: checkoutData.city || governorate,
        street: address,
        address,
        addressLine1: address,
      },
      ...(resolvedItems && resolvedItems.length > 0 ? { items: resolvedItems } : {}),
      ...(couponCode ? { couponCode } : {}),
      ...(discountAmount !== undefined && !isNaN(discountAmount) ? { discountAmount } : {}),
      ...(appliedDiscount ? { appliedDiscount } : {}),
      ...(bundleItems ? { bundleItems } : {}),
      ...(cartAttribution ? { attribution: cartAttribution } : {}),
      _skipPixel: true,
    };

    const internalPort = process.env.PORT || 3007;

    const createResponse = await axios.post(`http://127.0.0.1:${internalPort}/api/v1/public/orders?companyId=${encodeURIComponent(companyId)}`, orderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-cart-id': cartId,
        'x-admin-convert': 'true',
      },
      timeout: 30000,
    });

    const result = createResponse.data;

    if (result?.success && result?.data) {
      // 🏷️ تمييز الطلب المحول بتاج وملاحظات واضحة لفريق خدمة العملاء
      if (result.data?.orderNumber) {
        try {
          const orderRecord = await prisma.order.findFirst({
            where: { companyId, orderNumber: result.data.orderNumber }
          });
          if (orderRecord) {
            let orderMeta = {};
            try {
              orderMeta = typeof orderRecord.metadata === 'string'
                ? JSON.parse(orderRecord.metadata)
                : (orderRecord.metadata || {});
            } catch (e) {
              orderMeta = {};
            }
            orderMeta.isRecoveredFromCart = true;
            orderMeta.recoveredCartId = cartId;
            orderMeta.recoveredChannel = channel;
            orderMeta.tag = 'سلة مستعادة 🛒';

            const existingNotes = orderRecord.notes || notes || '';
            const updatedNotes = existingNotes
              ? `[سلة مستعادة 🛒]\n${existingNotes}`
              : '[سلة مستعادة 🛒 - تم التحويل تلقائياً من سلة متروكة]';

            await prisma.order.update({
              where: { id: orderRecord.id },
              data: {
                sourceType: 'incomplete_cart_auto',
                notes: updatedNotes,
                metadata: JSON.stringify(orderMeta)
              }
            });
          }

          const guestOrderRecord = await prisma.guestOrder.findFirst({
            where: { companyId, orderNumber: result.data.orderNumber }
          });
          if (guestOrderRecord) {
            let gMeta = {};
            try {
              gMeta = typeof guestOrderRecord.metadata === 'string'
                ? JSON.parse(guestOrderRecord.metadata)
                : (guestOrderRecord.metadata || {});
            } catch (e) {
              gMeta = {};
            }
            gMeta.isRecoveredFromCart = true;
            gMeta.tag = 'سلة مستعادة 🛒';
            await prisma.guestOrder.update({
              where: { id: guestOrderRecord.id },
              data: { metadata: JSON.stringify(gMeta) }
            });
          }
        } catch (metaErr) {
          console.warn('⚠️ [INCOMPLETE-CONVERT] Could not update order recovery metadata:', metaErr.message);
        }
      }

      let conversionLogError = null;
      try {
        const employee = user || {};
        await prisma.cartConversionLog.create({
          data: {
            cartId,
            orderId: result.data?.id || null,
            orderNumber: result.data?.orderNumber || null,
            employeeId: employee.id || null,
            employeeName: employee.name || employee.username || employee.email || (channel === 'auto-convert' ? 'التحويل التلقائي للنظام' : null),
            companyId,
            cartValue: total,
            governorate: governorate || null,
            channel: channel || 'admin-convert',
          },
        });
      } catch (logError) {
        console.warn('⚠️ [INCOMPLETE-CONVERT] Conversion log failed, retrying once:', logError.message);
        try {
          const employee = user || {};
          await prisma.cartConversionLog.create({
            data: {
              cartId,
              orderId: result.data?.id || null,
              orderNumber: result.data?.orderNumber || null,
              employeeId: employee.id || null,
              employeeName: employee.name || employee.username || employee.email || (channel === 'auto-convert' ? 'التحويل التلقائي للنظام' : null),
              companyId,
              cartValue: total,
              governorate: governorate || null,
              channel: channel || 'admin-convert',
            },
          });
        } catch (logRetryError) {
          console.error('❌ [INCOMPLETE-CONVERT] Conversion log failed completely:', logRetryError.message);
          conversionLogError = logRetryError.message;
        }
      }

      return {
        success: true,
        orderId: result.data?.id,
        orderNumber: result.data?.orderNumber,
        total: result.data?.total ?? total,
        customerName: guestName,
        customerPhone: guestPhone,
        data: result.data,
        conversionLogFailed: Boolean(conversionLogError),
        conversionLogError
      };
    } else {
      return {
        success: false,
        code: 'ORDER_CREATION_FAILED',
        message: result?.message || 'فشل إنشاء الطلب من بيانات السلة'
      };
    }
  } catch (err) {
    console.error(`❌ [INCOMPLETE-CONVERT] Error converting cart ${cartId}:`, err.response?.data || err.message);
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.response?.data?.message || err.message || 'حدث خطأ أثناء تحويل الطلب'
    };
  } finally {
    activeIncompleteCartConversions.delete(conversionKey);
  }
}

/**
 * ⚡ تنفيذ التحويل التلقائي لشركة محددة
 */
async function autoConvertCompanyIncompleteCarts(companyId, { limit = 50, user = null, force = false, forceConvert = false } = {}) {
  const prisma = getSharedPrismaClient();

  if (!force) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });
    const companySettings = typeof company?.settings === 'string'
      ? JSON.parse(company.settings || '{}')
      : (company?.settings || {});

    if (!companySettings.autoConvertIncompleteToPending) {
      return {
        enabled: false,
        message: 'Auto-convert is disabled for this company',
        convertedCount: 0
      };
    }
  }

  // 🕒 حصر التحويل التلقائي على السلال الحديثة خلال آخر 48 ساعة فقط لحماية المخزون ومنع إزعاج العملاء القدامى
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // جلب السلال المستبعدة (التي تم تجاهلها أو تم تحويلها مسبقاً خلال مهلة الـ 48 ساعة)
  let excludedCartIds = [];
  try {
    const [dismissLogs, convertedLogs] = await Promise.all([
      prisma.cartContactLog.findMany({
        where: { companyId, method: 'dismissed', createdAt: { gte: since48h } },
        select: { cartId: true },
        distinct: ['cartId']
      }),
      prisma.cartConversionLog.findMany({
        where: { companyId, convertedAt: { gte: since48h } },
        select: { cartId: true },
        distinct: ['cartId']
      })
    ]);
    const dismissedIds = dismissLogs.map(l => l.cartId).filter(Boolean);
    const convertedIds = convertedLogs.map(l => l.cartId).filter(Boolean);
    excludedCartIds = [...new Set([...dismissedIds, ...convertedIds])];
  } catch (e) {
    console.warn('⚠️ [INCOMPLETE-AUTO-CONVERT] Error fetching excluded cart logs:', e.message);
  }

  const whereConditions = [
    { companyId },
    ...(excludedCartIds.length > 0 ? [{ cartId: { notIn: excludedCartIds } }] : []),
    {
      OR: [
        { createdAt: { gte: since48h } },
        { checkoutUpdatedAt: { gte: since48h } }
      ]
    },
    {
      OR: [
        { checkoutData: { contains: '"guestPhone"' } },
        { checkoutData: { contains: '"customerPhone"' } },
        { checkoutData: { contains: '"phoneNumber"' } },
        { checkoutData: { contains: '"mobileNumber"' } },
        { checkoutData: { contains: '"phone"' } },
        { checkoutData: { contains: '"mobile"' } },
      ]
    }
  ];

  const eligibleCarts = await prisma.guestCart.findMany({
    where: { AND: whereConditions },
    orderBy: [{ total: 'desc' }, { checkoutUpdatedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });

  if (eligibleCarts.length === 0) {
    return {
      success: true,
      totalEligible: 0,
      convertedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      convertedOrders: []
    };
  }

  let convertedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const convertedOrders = [];

  for (const cart of eligibleCarts) {
    try {
      const res = await convertSingleIncompleteCart({
        companyId,
        cartId: cart.cartId,
        user,
        forceConvert,
        cart,
        channel: 'auto-convert'
      });

      if (res.success) {
        convertedCount++;
        convertedOrders.push({
          cartId: cart.cartId,
          orderId: res.orderId,
          orderNumber: res.orderNumber,
          customerPhone: res.customerPhone
        });
      } else if (res.code === 'EXISTING_CUSTOMER_ORDER' || res.code === 'INVALID_PHONE') {
        skippedCount++;
      } else if (res.code !== 'CART_ALREADY_CONVERTED') {
        failedCount++;
      }
    } catch (e) {
      failedCount++;
      console.warn(`[INCOMPLETE-AUTO-CONVERT] Error converting cart ${cart.cartId}:`, e.message);
    }
  }

  console.log(`⚡ [INCOMPLETE-AUTO-CONVERT] Company ${companyId}: ${convertedCount} converted to PENDING, ${skippedCount} skipped duplicates, ${failedCount} errors`);

  return {
    success: true,
    totalEligible: eligibleCarts.length,
    convertedCount,
    skippedCount,
    failedCount,
    convertedOrders
  };
}

/**
 * ⚡ مهمة التحويل التلقائي الدورية لجميع الشركات التي فعلت الميزة
 */
async function runAutoConvertIncompleteCartsJob() {
  if (isAutoConvertRunning) {
    return;
  }
  isAutoConvertRunning = true;

  try {
    const prisma = getSharedPrismaClient();

    const companies = await prisma.company.findMany({
      select: { id: true, name: true, settings: true }
    });

    for (const comp of companies) {
      try {
        const settings = typeof comp.settings === 'string'
          ? JSON.parse(comp.settings || '{}')
          : (comp.settings || {});

        if (settings.autoConvertIncompleteToPending === true) {
          await autoConvertCompanyIncompleteCarts(comp.id, { limit: 50, force: true });
        }
      } catch (compErr) {
        console.warn(`[INCOMPLETE-AUTO-CONVERT] Company ${comp.id} job error:`, compErr.message);
      }
    }
  } catch (error) {
    console.error('❌ [INCOMPLETE-AUTO-CONVERT] Job failed:', error.message);
  } finally {
    isAutoConvertRunning = false;
  }
}

module.exports = {
  isValidCustomerPhone,
  convertSingleIncompleteCart,
  autoConvertCompanyIncompleteCarts,
  runAutoConvertIncompleteCartsJob,
  activeIncompleteCartConversions
};

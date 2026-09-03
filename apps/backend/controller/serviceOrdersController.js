const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * دالة مساعدة لتطبيع وتوحيد بنية بيانات طلب الخدمة
 * تضمن استخراج المرفقات، بيانات الدفع، الفاتورة، توزيع المراحل، وجلسة الواتساب
 */
function normalizeOrder(order) {
  if (!order) return order;

  let files = [];
  const defaultTotal = order.service?.price || 0;
  let payment = {
    totalAmount: defaultTotal,
    paidAmount: 0,
    remainingAmount: defaultTotal,
    paymentStatus: 'UNPAID', // UNPAID | PARTIALLY_PAID | PAID | REFUNDED
    paymentMethod: null,
    invoiceNumber: `SRV-${order.id ? order.id.slice(-6).toUpperCase() : '0000'}`,
    invoiceDate: order.createdAt || new Date(),
    payments: []
  };

  let workflow = {
    stageAssignments: {} // { NEW: { userId, name }, IN_PROGRESS: { userId, name }, COMPLETED: { userId, name } }
  };

  let whatsAppSessionId = null;

  if (Array.isArray(order.referenceFiles)) {
    files = order.referenceFiles;
  } else if (order.referenceFiles && typeof order.referenceFiles === 'object') {
    files = Array.isArray(order.referenceFiles.files) ? order.referenceFiles.files : [];
    if (order.referenceFiles.payment && typeof order.referenceFiles.payment === 'object') {
      payment = { ...payment, ...order.referenceFiles.payment };
    }
    if (order.referenceFiles.workflow && typeof order.referenceFiles.workflow === 'object') {
      workflow = { ...workflow, ...order.referenceFiles.workflow };
    }
    whatsAppSessionId = order.referenceFiles.whatsAppSessionId || null;
  }

  // حساب المتبقي التلقائي
  const total = Number(payment.totalAmount) || 0;
  const paid = Number(payment.paidAmount) || 0;
  payment.remainingAmount = Math.max(0, total - paid);

  if (paid <= 0) {
    if (payment.paymentStatus !== 'REFUNDED') payment.paymentStatus = 'UNPAID';
  } else if (paid >= total && total > 0) {
    payment.paymentStatus = 'PAID';
  } else {
    payment.paymentStatus = 'PARTIALLY_PAID';
  }

  return {
    ...order,
    referenceFiles: files, // للتوافق العكسي مع الكود القديم
    files,
    payment,
    workflow,
    whatsAppSessionId
  };
}

/**
 * دالة مساعدة لحزم بيانات المرفقات والماليات والمسؤولين داخل حقل referenceFiles (Json)
 */
function packOrderStorage(existingOrder, { files, payment, workflow, whatsAppSessionId }) {
  const currentNormalized = normalizeOrder(existingOrder);
  return {
    files: files !== undefined ? files : currentNormalized.files,
    payment: payment !== undefined ? { ...currentNormalized.payment, ...payment } : currentNormalized.payment,
    workflow: workflow !== undefined ? { ...currentNormalized.workflow, ...workflow } : currentNormalized.workflow,
    whatsAppSessionId: whatsAppSessionId !== undefined ? whatsAppSessionId : currentNormalized.whatsAppSessionId
  };
}

/**
 * الكشف الذكي عن جلسة الواتساب المرتبطة بهاتف العميل
 */
async function detectCustomerWhatsAppSession(companyId, phone) {
  if (!phone || !companyId) return { session: null, isPreviousChat: false, contactId: null };

  const cleanPhone = phone.replace(/\D/g, '');
  const searchPhones = [cleanPhone];
  if (cleanPhone.startsWith('01')) searchPhones.push('2' + cleanPhone);
  if (cleanPhone.startsWith('201')) searchPhones.push(cleanPhone.substring(1));

  const prisma = getSharedPrismaClient();

  // 1. البحث في جهات اتصال جلسات الواتساب المتصلة بالشركة
  for (const p of searchPhones) {
    try {
      const contact = await prisma.whatsAppContact.findFirst({
        where: {
          phoneNumber: { contains: p },
          whatsAppSession: { companyId, status: 'CONNECTED' }
        },
        include: { whatsAppSession: true },
        orderBy: { lastMessageAt: 'desc' }
      });
      if (contact && contact.whatsAppSession) {
        return {
          session: {
            id: contact.whatsAppSession.id,
            name: contact.whatsAppSession.name,
            phoneNumber: contact.whatsAppSession.phoneNumber,
            provider: contact.whatsAppSession.provider
          },
          isPreviousChat: true,
          contactId: contact.id,
          jid: contact.jid
        };
      }
    } catch (e) {
      console.warn('⚠️ [SERVICE-ORDER] Error finding contact session:', e.message);
    }
  }

  // 2. الجلسة الافتراضية المتصلة للشركة
  try {
    const defaultSession = await prisma.whatsAppSession.findFirst({
      where: { companyId, status: 'CONNECTED' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, phoneNumber: true, provider: true }
    });
    return {
      session: defaultSession || null,
      isPreviousChat: false,
      contactId: null,
      jid: null
    };
  } catch (e) {
    return { session: null, isPreviousChat: false, contactId: null, jid: null };
  }
}

/**
 * قراءة إعدادات طلبات الخدمات للشركة
 */
async function getCompanyServiceSettings(companyId) {
  const defaultSettings = {
    workflowAssignments: {
      NEW: null,
      IN_PROGRESS: null,
      COMPLETED: null
    },
    defaultWhatsAppSessionId: null,
    invoicePrefix: 'SRV-INV-',
    paymentTerms: 'الدفع عند الاتفاق والعربون شرط بدء التنفيذ',
    vodafoneCashNumber: '',
    instapayAddress: '',
    bankAccountDetails: '',
    autoNotifyOnStatusChange: true,
    showPricesOnPublicForm: true
  };

  try {
    const prisma = getSharedPrismaClient();
    const row = await prisma.systemSettings.findUnique({
      where: { systemName: `service_orders_settings_${companyId}` }
    });
    if (row && row.config) {
      const parsed = JSON.parse(row.config);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn('⚠️ Error reading service settings:', e.message);
  }
  return defaultSettings;
}

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const data = await getSharedPrismaClient().serviceOrder.findMany({
      where: { companyId },
      include: { service: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: data.map(normalizeOrder) });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const data = await getSharedPrismaClient().serviceOrder.findFirst({
      where: { id, companyId },
      include: { service: true }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data: normalizeOrder(data) });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلب' });
  }
};

const createPublic = async (req, res) => {
  try {
    const cid = req.body.companyId || req.user?.companyId;
    const {
      serviceId,
      customerName,
      phone,
      description,
      referenceFiles,
      notes,
      assignedTo,
      payment,
      workflow
    } = req.body;

    if (!cid || !serviceId || !customerName || !phone) {
      return res.status(400).json({ success: false, error: 'جميع الحقول المطلوبة: الشركة، الخدمة، الاسم، الهاتف' });
    }

    const prisma = getSharedPrismaClient();
    const service = await prisma.service.findFirst({ where: { id: serviceId, companyId: cid, isActive: true } });
    if (!service) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    // كشف جلسة الواتساب المناسبة لهذا العميل
    const waDetection = await detectCustomerWhatsAppSession(cid, phone);
    const sessionToUse = waDetection.session?.id || null;

    // استدعاء إعدادات الشركة للتكليف التلقائي لحالة NEW
    const settings = await getCompanyServiceSettings(cid);
    let finalAssignedTo = assignedTo || null;
    if (!finalAssignedTo && settings.workflowAssignments?.NEW) {
      finalAssignedTo = settings.workflowAssignments.NEW;
    }

    // تجهيز بنية التخزين المنظمة
    const packedStorage = {
      files: Array.isArray(referenceFiles) ? referenceFiles : referenceFiles?.files || [],
      payment: {
        totalAmount: payment?.totalAmount !== undefined ? Number(payment.totalAmount) : (service.price || 0),
        paidAmount: payment?.paidAmount !== undefined ? Number(payment.paidAmount) : 0,
        remainingAmount: payment?.remainingAmount !== undefined ? Number(payment.remainingAmount) : (service.price || 0),
        paymentStatus: payment?.paymentStatus || 'UNPAID',
        paymentMethod: payment?.paymentMethod || null,
        invoiceNumber: `${settings.invoicePrefix || 'SRV-'}${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date(),
        payments: Array.isArray(payment?.payments) ? payment.payments : []
      },
      workflow: {
        stageAssignments: workflow?.stageAssignments || {
          NEW: finalAssignedTo ? { userId: finalAssignedTo } : null
        }
      },
      whatsAppSessionId: sessionToUse
    };

    const data = await prisma.serviceOrder.create({
      data: {
        companyId: cid,
        serviceId,
        customerName,
        phone,
        description,
        referenceFiles: packedStorage,
        notes: notes || null,
        assignedTo: finalAssignedTo
      },
      include: { service: true }
    });

    // جلب رقم تواصل الشركة لتسهيل تواصل العميل عبر واتساب فوراً
    let companyContactPhone = waDetection.session?.phoneNumber || null;
    if (!companyContactPhone) {
      try {
        const company = await prisma.company.findUnique({
          where: { id: cid },
          select: { phone: true }
        });
        companyContactPhone = company?.phone || null;
      } catch (err) {}
    }

    // إرسال إشعارات واتساب تلقائية للعميل وللإدارة
    try {
      const { notifyOrderCreated } = require('../services/whatsapp/serviceOrderNotificationService');
      notifyOrderCreated({ order: data, service, companyId: cid }).catch(err => {
        console.error('⚠️ [SERVICE-ORDER] Async notification error:', err.message);
      });
    } catch (notifyErr) {
      console.error('⚠️ [SERVICE-ORDER] Notification init error:', notifyErr.message);
    }

    res.json({
      success: true,
      data: {
        ...normalizeOrder(data),
        companyContactPhone,
        whatsAppSession: waDetection.session,
        isPreviousChat: waDetection.isPreviousChat
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطلب' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { customerName, phone, description, notes, assignedTo, referenceFiles, payment, workflow, whatsAppSessionId } = req.body;

    const prisma = getSharedPrismaClient();
    const existing = await prisma.serviceOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    const updateData = {
      customerName,
      phone,
      description,
      notes,
      assignedTo
    };

    if (referenceFiles !== undefined || payment !== undefined || workflow !== undefined || whatsAppSessionId !== undefined) {
      updateData.referenceFiles = packOrderStorage(existing, {
        files: Array.isArray(referenceFiles) ? referenceFiles : referenceFiles?.files,
        payment,
        workflow,
        whatsAppSessionId
      });
    }

    const data = await prisma.serviceOrder.update({
      where: { id },
      data: updateData,
      include: { service: true }
    });

    res.json({ success: true, data: normalizeOrder(data) });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطلب' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'حالة غير صالحة' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: { service: true }
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    // فحص التعيين التلقائي لفريق العمل لهذه الحالة من الإعدادات
    const settings = await getCompanyServiceSettings(companyId);
    let newAssignedTo = existing.assignedTo;
    if (settings.workflowAssignments && settings.workflowAssignments[status]) {
      newAssignedTo = settings.workflowAssignments[status];
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status,
        assignedTo: newAssignedTo
      },
      include: { service: true }
    });

    // إرسال إشعار واتساب للعميل عند تغير الحالة
    if (existing.status !== status && settings.autoNotifyOnStatusChange) {
      try {
        const { notifyStatusChanged } = require('../services/whatsapp/serviceOrderNotificationService');
        notifyStatusChanged({ order: updated, oldStatus: existing.status, newStatus: status, companyId }).catch(err => {
          console.error('⚠️ [SERVICE-ORDER] Status change notification error:', err.message);
        });
      } catch (notifyErr) {
        console.error('⚠️ [SERVICE-ORDER] Status notification init error:', notifyErr.message);
      }
    }

    res.json({ success: true, data: normalizeOrder(updated) });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.serviceOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    await prisma.serviceOrder.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطلب' });
  }
};

/**
 * تحديث الحالة المالية وتسجيل الدفعات والفواتير
 */
const updatePayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { totalAmount, paidAmount, paymentMethod, paymentStatus, newPaymentNote, newPaymentAmount } = req.body;

    const prisma = getSharedPrismaClient();
    const existing = await prisma.serviceOrder.findFirst({ where: { id, companyId }, include: { service: true } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    const currentNormalized = normalizeOrder(existing);
    const prevPayment = currentNormalized.payment;

    let finalTotal = totalAmount !== undefined ? Number(totalAmount) : prevPayment.totalAmount;
    let finalPaid = paidAmount !== undefined ? Number(paidAmount) : prevPayment.paidAmount;

    // إضافة دفعة جزئية / عربون إن وُجدت
    const paymentsList = [...(prevPayment.payments || [])];
    if (newPaymentAmount && Number(newPaymentAmount) > 0) {
      finalPaid = finalPaid + Number(newPaymentAmount);
      paymentsList.push({
        id: `pay_${Date.now()}`,
        amount: Number(newPaymentAmount),
        method: paymentMethod || prevPayment.paymentMethod || 'CASH',
        note: newPaymentNote || 'تحصيل دفعة للخدمة',
        date: new Date().toISOString(),
        recordedBy: req.user?.name || req.user?.email || 'المسؤول'
      });
    }

    const remaining = Math.max(0, finalTotal - finalPaid);
    let finalStatus = paymentStatus;
    if (!finalStatus) {
      if (finalPaid <= 0) finalStatus = 'UNPAID';
      else if (finalPaid >= finalTotal && finalTotal > 0) finalStatus = 'PAID';
      else finalStatus = 'PARTIALLY_PAID';
    }

    const updatedPayment = {
      ...prevPayment,
      totalAmount: finalTotal,
      paidAmount: finalPaid,
      remainingAmount: remaining,
      paymentStatus: finalStatus,
      paymentMethod: paymentMethod || prevPayment.paymentMethod,
      payments: paymentsList
    };

    const newStorage = packOrderStorage(existing, { payment: updatedPayment });

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: { referenceFiles: newStorage },
      include: { service: true }
    });

    res.json({ success: true, data: normalizeOrder(updated) });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث البيانات المالية' });
  }
};

/**
 * جلب جلسة الواتساب المتصلة المناسبة للطلب وقائمة جلسات الشركة
 */
const getWhatsAppSessionForOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;

    const prisma = getSharedPrismaClient();
    const order = await prisma.serviceOrder.findFirst({ where: { id, companyId } });
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    // كشف الجلسة المرتبطة بهاتف العميل
    const detection = await detectCustomerWhatsAppSession(companyId, order.phone);

    // جلب جميع جلسات الشركة النشطة لإتاحة التبديل اليدوي إن رغب المسؤول
    const companySessions = await prisma.whatsAppSession.findMany({
      where: { companyId, status: 'CONNECTED' },
      select: { id: true, name: true, phoneNumber: true, provider: true }
    });

    res.json({
      success: true,
      data: {
        session: detection.session,
        isPreviousChat: detection.isPreviousChat,
        contactId: detection.contactId,
        jid: detection.jid,
        companySessions
      }
    });
  } catch (error) {
    console.error('Error getting WhatsApp session:', error);
    res.status(500).json({ success: false, error: 'فشل كشف جلسة الواتساب' });
  }
};

/**
 * إرسال رسالة واتساب للعميل مباشرة عبر الجلسة المحددة
 */
const sendWhatsAppMessage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'نص الرسالة مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const order = await prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: { service: true }
    });
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    // تحديد الجلسة المراد الإرسال منها
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const detection = await detectCustomerWhatsAppSession(companyId, order.phone);
      targetSessionId = detection.session?.id;
    }

    const { sendNotification } = require('../services/whatsapp/WhatsAppNotificationService');

    const result = await sendNotification({
      companyId,
      sessionId: targetSessionId,
      recipientPhone: order.phone,
      recipientName: order.customerName,
      recipientType: 'CUSTOMER',
      category: 'GENERAL',
      eventType: 'CUSTOM_TEXT',
      variables: { message: message.trim() },
      customMessage: message.trim(),
      priority: 1
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ success: false, error: error.message || 'فشل إرسال رسالة الواتساب' });
  }
};

/**
 * جلب قائمة أعضاء فريق العمل المتاحين للتكليف
 */
const getTeamMembers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { companyId },
          { userCompanies: { some: { companyId, isActive: true } } }
        ],
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true
      }
    });

    const formatted = members.map(m => ({
      id: m.id,
      name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
      email: m.email,
      role: m.role || 'عضو فريق',
      avatar: m.avatar
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, error: 'فشل جلب أعضاء الفريق' });
  }
};

/**
 * جلب فواتير الخدمات
 */
const getInvoices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const orders = await prisma.serviceOrder.findMany({
      where: { companyId },
      include: { service: true },
      orderBy: { createdAt: 'desc' }
    });

    const invoices = orders.map(o => {
      const norm = normalizeOrder(o);
      return {
        id: norm.id,
        invoiceNumber: norm.payment.invoiceNumber,
        orderId: norm.id,
        customerName: norm.customerName,
        phone: norm.phone,
        serviceName: norm.service?.name || 'خدمة',
        totalAmount: norm.payment.totalAmount,
        paidAmount: norm.payment.paidAmount,
        remainingAmount: norm.payment.remainingAmount,
        paymentStatus: norm.payment.paymentStatus,
        paymentMethod: norm.payment.paymentMethod,
        date: norm.payment.invoiceDate || norm.createdAt,
        payments: norm.payment.payments
      };
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'فشل جلب فواتير الخدمات' });
  }
};

/**
 * جلب إعدادات طلبات الخدمات
 */
const getSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const settings = await getCompanyServiceSettings(companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'فشل جلب الإعدادات' });
  }
};

/**
 * حفظ إعدادات طلبات الخدمات
 */
const updateSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const current = await getCompanyServiceSettings(companyId);
    const updated = { ...current, ...req.body };

    await prisma.systemSettings.upsert({
      where: { systemName: `service_orders_settings_${companyId}` },
      create: {
        systemName: `service_orders_settings_${companyId}`,
        displayName: 'إعدادات قسم طلبات الخدمات',
        category: 'services',
        config: JSON.stringify(updated)
      },
      update: {
        config: JSON.stringify(updated)
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: 'فشل حفظ الإعدادات' });
  }
};

module.exports = {
  getAll,
  getById,
  createPublic,
  update,
  updateStatus,
  deleteOrder,
  updatePayment,
  getWhatsAppSessionForOrder,
  sendWhatsAppMessage,
  getTeamMembers,
  getInvoices,
  getSettings,
  updateSettings
};

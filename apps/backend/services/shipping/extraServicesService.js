/**
 * Shipping Extra Services, Package Open Requests & Order Change Requests Service (SHIP-T3)
 * Handles:
 * 1. Shipping Extra Services CRUD & shipment service lines
 * 2. Package open request workflow (PENDING, APPROVED, REJECTED + 409 guard)
 * 3. Order change request workflow (ADDRESS, AMOUNT, RECIPIENT + 409 DELIVERED/REMITTED guard)
 * 4. Company wallet transaction recording on approval
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

function serviceError(message, statusCode = 400, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function round(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

/**
 * ============================================================================
 * 1. Extra Services CRUD
 * ============================================================================
 */

async function createService({
  companyId,
  code,
  name,
  description = null,
  pricingMode = 'FIXED',
  amount = 0,
  appliesTo = 'SHIPMENT',
  isActive = true,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  if (!code || typeof code !== 'string') throw serviceError('كود الخدمة مطلوب', 400);
  if (!name || typeof name !== 'string') throw serviceError('اسم الخدمة مطلوب', 400);

  const normalizedCode = code.trim().toUpperCase();
  const validModes = ['FIXED', 'PERCENT'];
  if (!validModes.includes(pricingMode)) {
    throw serviceError(`نمط التسعير غير صالح (${validModes.join(', ')})`, 400);
  }

  const validAppliesTo = ['SHIPMENT', 'ORDER'];
  if (!validAppliesTo.includes(appliesTo)) {
    throw serviceError(`نطاق التطبيق غير صالح (${validAppliesTo.join(', ')})`, 400);
  }

  const numAmount = round(amount);
  if (numAmount < 0) throw serviceError('قيمة الرسوم لا يمكن أن تكون سالبة', 400);

  const prisma = prismaClient || getSharedPrismaClient();

  // Check unique code per company
  const existing = await prisma.shippingService.findFirst({
    where: { companyId, code: normalizedCode },
  });
  if (existing) {
    throw serviceError('كود الخدمة مسجل بالفعل لهذه الشركة (409)', 409, 'SERVICE_CODE_EXISTS');
  }

  return prisma.shippingService.create({
    data: {
      companyId,
      code: normalizedCode,
      name: name.trim(),
      description: description ? description.trim() : null,
      pricingMode,
      amount: numAmount,
      appliesTo,
      isActive: Boolean(isActive),
    },
  });
}

async function listServices({
  companyId,
  appliesTo = null,
  isActive = null,
  search = null,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const where = { companyId };

  if (appliesTo) where.appliesTo = appliesTo;
  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === true || isActive === 'true';
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search.toUpperCase() } },
    ];
  }

  return prisma.shippingService.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
}

async function getServiceById({ companyId, id, prismaClient = null }) {
  if (!companyId || !id) throw serviceError('المعرفات المطلوبة غير مكتملة', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const service = await prisma.shippingService.findFirst({
    where: { id, companyId },
  });
  if (!service) throw serviceError('الخدمة الإضافية غير موجودة', 404);
  return service;
}

async function updateService({ companyId, id, data = {}, prismaClient = null }) {
  if (!companyId || !id) throw serviceError('المعرفات المطلوبة غير مكتملة', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const existing = await prisma.shippingService.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw serviceError('الخدمة الإضافية غير موجودة', 404);

  const updateData = {};
  if (data.name !== undefined) updateData.name = String(data.name).trim();
  if (data.description !== undefined) updateData.description = data.description ? String(data.description).trim() : null;
  if (data.pricingMode !== undefined) {
    const validModes = ['FIXED', 'PERCENT'];
    if (!validModes.includes(data.pricingMode)) throw serviceError('نمط التسعير غير صالح', 400);
    updateData.pricingMode = data.pricingMode;
  }
  if (data.amount !== undefined) {
    const num = round(data.amount);
    if (num < 0) throw serviceError('قيمة الرسوم لا يمكن أن تكون سالبة', 400);
    updateData.amount = num;
  }
  if (data.appliesTo !== undefined) updateData.appliesTo = data.appliesTo;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  return prisma.shippingService.update({
    where: { id },
    data: updateData,
  });
}

async function deleteService({ companyId, id, prismaClient = null }) {
  if (!companyId || !id) throw serviceError('المعرفات المطلوبة غير مكتملة', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const existing = await prisma.shippingService.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw serviceError('الخدمة الإضافية غير موجودة', 404);

  // Soft delete / deactivate
  return prisma.shippingService.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * ============================================================================
 * 2. Shipment Service Lines
 * ============================================================================
 */

async function addShipmentServiceLine({
  companyId,
  shipmentId,
  serviceId = null,
  name = null,
  amount = null,
  qty = 1,
  pricingMode = 'FIXED',
  createdBy = null,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  if (!shipmentId) throw serviceError('معرف الشحنة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
  });
  if (!shipment) throw serviceError('الشحنة غير موجودة', 404);

  let finalName = name;
  let finalMode = pricingMode;
  let unitAmount = amount != null ? round(amount) : 0;

  if (serviceId) {
    const service = await prisma.shippingService.findFirst({
      where: { id: serviceId, companyId },
    });
    if (!service) throw serviceError('الخدمة المحددة غير موجودة', 404);
    if (!finalName) finalName = service.name;
    finalMode = service.pricingMode;
    if (amount == null) unitAmount = round(service.amount);
  }

  if (!finalName) throw serviceError('اسم بند الخدمة مطلوب', 400);

  const safeQty = Math.max(1, parseInt(qty, 10) || 1);
  let lineTotal = 0;

  if (finalMode === 'PERCENT') {
    const baseVal = Number(shipment.codAmount || shipment.cost || 0);
    lineTotal = round((baseVal * unitAmount) / 100);
  } else {
    lineTotal = round(unitAmount * safeQty);
  }

  const line = await prisma.shipmentServiceLine.create({
    data: {
      companyId,
      shipmentId,
      serviceId,
      name: finalName,
      pricingMode: finalMode,
      unitAmount,
      amount: lineTotal,
      qty: safeQty,
      createdBy,
    },
  });

  const extraFees = await getShipmentExtraFees(shipmentId, companyId, prisma);

  return { line, extraFees };
}

async function listShipmentServiceLines(shipmentId, companyId, prismaClient = null) {
  if (!shipmentId) throw serviceError('معرف الشحنة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const where = { shipmentId };
  if (companyId) where.companyId = companyId;

  const lines = await prisma.shipmentServiceLine.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  const extraFees = round(lines.reduce((acc, l) => acc + Number(l.amount || 0), 0));
  return { lines, extraFees };
}

async function removeShipmentServiceLine({ companyId, shipmentId, lineId, prismaClient = null }) {
  if (!lineId) throw serviceError('معرف بند الخدمة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const where = { id: lineId };
  if (companyId) where.companyId = companyId;
  if (shipmentId) where.shipmentId = shipmentId;

  const existing = await prisma.shipmentServiceLine.findFirst({ where });
  if (!existing) throw serviceError('بند الخدمة غير موجود', 404);

  await prisma.shipmentServiceLine.delete({ where: { id: lineId } });

  const targetShipmentId = shipmentId || existing.shipmentId;
  const extraFees = await getShipmentExtraFees(targetShipmentId, companyId, prisma);

  return { success: true, extraFees };
}

async function getShipmentExtraFees(shipmentId, companyId = null, prismaClient = null) {
  const prisma = prismaClient || getSharedPrismaClient();
  const where = { shipmentId };
  if (companyId) where.companyId = companyId;

  const lines = await prisma.shipmentServiceLine.findMany({
    where,
    select: { amount: true },
  });

  return round(lines.reduce((sum, l) => sum + Number(l.amount || 0), 0));
}

/**
 * ============================================================================
 * 3. Package Open Requests (Workflow)
 * ============================================================================
 */

async function createPackageOpenRequest({
  companyId,
  shipmentId,
  requestedBy,
  requestedByType = 'CLIENT',
  reason = null,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  if (!shipmentId) throw serviceError('معرف الشحنة مطلوب', 400);
  if (!requestedBy) throw serviceError('مقدم الطلب مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
  });
  if (!shipment) throw serviceError('الشحنة غير موجودة', 404);

  // Guard: Reject if a PENDING request already exists for this shipment (409)
  const existingPending = await prisma.packageOpenRequest.findFirst({
    where: { shipmentId, status: 'PENDING' },
  });
  if (existingPending) {
    throw serviceError(
      'هناك طلب فتح شحنة قيد المراجعة بالفعل لهذه الشحنة (409)',
      409,
      'PENDING_REQUEST_EXISTS'
    );
  }

  return prisma.packageOpenRequest.create({
    data: {
      companyId,
      shipmentId,
      requestedBy: String(requestedBy),
      requestedByType,
      reason: reason ? String(reason).trim() : null,
      status: 'PENDING',
      fee: 0,
    },
  });
}

async function listPackageOpenRequests({
  companyId,
  status = null,
  shipmentId = null,
  page = 1,
  limit = 50,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const where = { companyId };

  if (status) where.status = status;
  if (shipmentId) where.shipmentId = shipmentId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    prisma.packageOpenRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.packageOpenRequest.count({ where }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}

async function reviewPackageOpenRequest({
  companyId,
  requestId,
  decision, // APPROVE | REJECT
  rejectionReason = null,
  fee = null,
  reviewerId = null,
  reviewerName = null,
  prismaClient = null,
}) {
  if (!companyId || !requestId) throw serviceError('المعرفات المطلوبة غير مكتملة', 400);
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw serviceError('القرار يجب أن يكون APPROVE أو REJECT', 400);
  }

  const prisma = prismaClient || getSharedPrismaClient();

  const request = await prisma.packageOpenRequest.findFirst({
    where: { id: requestId, companyId },
  });
  if (!request) throw serviceError('طلب فتح الشحنة غير موجود', 404);

  if (request.status !== 'PENDING') {
    throw serviceError('لا يمكن مراجعة طلب تم حسمه مسبقًا', 400);
  }

  const shipment = await prisma.shipment.findFirst({
    where: { id: request.shipmentId, companyId },
  });
  if (!shipment) throw serviceError('الشحنة المرتبطة بالطلب غير موجودة', 404);

  if (decision === 'APPROVE') {
    // Resolve fee: explicit fee, or policy openPackageFeeAsk, or default 5.00
    let appliedFee = 5.0;
    if (fee != null && Number(fee) >= 0) {
      appliedFee = round(fee);
    } else {
      try {
        const policy = await prisma.shippingPolicySettings?.findUnique({
          where: { companyId },
        });
        if (policy?.openPackageFeeAsk != null) {
          appliedFee = round(policy.openPackageFeeAsk);
        }
      } catch (err) {
        // Fallback default 5.00
      }
    }

    // Update request
    const updatedRequest = await prisma.packageOpenRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        fee: appliedFee,
        reviewedBy: reviewerName || reviewerId || 'ADMIN',
        reviewedAt: new Date(),
      },
    });

    // Update shipment allowOpenPackage
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { allowOpenPackage: true },
    });

    // Record ShipmentEvent
    try {
      await prisma.shipmentEvent.create({
        data: {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: shipment.status,
          reasonCode: 'OPEN_PACKAGE_APPROVED',
          notes: `تمت الموافقة على طلب فتح الشحنة برسم: ${appliedFee} ج.م`,
          actorType: 'ADMIN',
          actorId: reviewerId,
          actorName: reviewerName || 'Admin',
        },
      });
    } catch (e) {
      console.warn('[extraServices] ShipmentEvent error:', e.message);
    }

    // Record in Wallet (deduct open package fee & record transaction)
    try {
      await recordWalletTransaction({
        companyId,
        shipmentBarcode: shipment.barcode || shipment.trackingNumber || shipment.id,
        amount: appliedFee,
        reason: 'OPEN_PACKAGE_FEE',
        type: 'WITHDRAW',
        notes: `رسوم فتح شحنة: ${shipment.barcode || shipment.trackingNumber || shipment.id}`,
        createdBy: reviewerId,
        prisma,
      });
    } catch (e) {
      console.warn('[extraServices] Wallet transaction recording warning:', e.message);
    }

    return {
      success: true,
      data: updatedRequest,
      fee: appliedFee,
      message: 'تمت الموافقة على طلب فتح الشحنة بنجاح وخصم الرسوم',
    };
  } else {
    // REJECT
    const updatedRequest = await prisma.packageOpenRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason ? String(rejectionReason).trim() : 'تم الرفض من قبل الإدارة',
        reviewedBy: reviewerName || reviewerId || 'ADMIN',
        reviewedAt: new Date(),
      },
    });

    // Record ShipmentEvent
    try {
      await prisma.shipmentEvent.create({
        data: {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: shipment.status,
          reasonCode: 'OPEN_PACKAGE_REJECTED',
          notes: `تم رفض طلب فتح الشحنة: ${rejectionReason || 'بدون سبب معلن'}`,
          actorType: 'ADMIN',
          actorId: reviewerId,
          actorName: reviewerName || 'Admin',
        },
      });
    } catch (e) {
      console.warn('[extraServices] ShipmentEvent error:', e.message);
    }

    return {
      success: true,
      data: updatedRequest,
      message: 'تم رفض طلب فتح الشحنة',
    };
  }
}

/**
 * ============================================================================
 * 4. Order Change Requests (Workflow)
 * ============================================================================
 */

async function createOrderChangeRequest({
  companyId,
  shipmentId,
  type, // ADDRESS | AMOUNT | RECIPIENT
  newValue,
  reason = null,
  requestedBy,
  requestedByType = 'CLIENT',
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  if (!shipmentId) throw serviceError('معرف الشحنة مطلوب', 400);
  if (!requestedBy) throw serviceError('مقدم الطلب مطلوب', 400);

  const validTypes = ['ADDRESS', 'AMOUNT', 'RECIPIENT'];
  if (!validTypes.includes(type)) {
    throw serviceError(`نوع التعديل غير صالح (${validTypes.join(', ')})`, 400);
  }

  if (newValue === undefined || newValue === null || newValue === '') {
    throw serviceError('القيمة الجديدة مطلوبة', 400);
  }

  const prisma = prismaClient || getSharedPrismaClient();

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId },
  });
  if (!shipment) throw serviceError('الشحنة غير موجودة', 404);

  // Strict Guard: No change allowed after DELIVERED / REMITTED (409)
  const finalizedStatuses = ['DELIVERED', 'REMITTED'];
  if (finalizedStatuses.includes(shipment.status)) {
    throw serviceError(
      'ممنوع تعديل الشحنة بعد التسليم أو التوريد (DELIVERED / REMITTED) (409)',
      409,
      'SHIPMENT_FINALIZED'
    );
  }

  // Derive oldValue from shipment
  let oldValue = '';
  if (type === 'ADDRESS') {
    oldValue = JSON.stringify({
      governorate: shipment.destinationGovernorate || '',
      city: shipment.destinationCity || '',
      address: shipment.destinationAddress || '',
    });
  } else if (type === 'AMOUNT') {
    oldValue = String(shipment.codAmount != null ? shipment.codAmount : 0);
  } else if (type === 'RECIPIENT') {
    oldValue = JSON.stringify({
      name: shipment.recipientName || '',
      phone: shipment.recipientPhone || '',
      phone2: shipment.recipientPhone2 || '',
    });
  }

  const formattedNewValue = typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue);

  return prisma.orderChangeRequest.create({
    data: {
      companyId,
      shipmentId,
      orderId: shipment.orderId || null,
      type,
      oldValue,
      newValue: formattedNewValue,
      requestedBy: String(requestedBy),
      requestedByType,
      reason: reason ? String(reason).trim() : null,
      status: 'PENDING',
    },
  });
}

async function listOrderChangeRequests({
  companyId,
  status = null,
  shipmentId = null,
  type = null,
  page = 1,
  limit = 50,
  prismaClient = null,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();
  const where = { companyId };

  if (status) where.status = status;
  if (shipmentId) where.shipmentId = shipmentId;
  if (type) where.type = type;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    prisma.orderChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.orderChangeRequest.count({ where }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}

async function reviewOrderChangeRequest({
  companyId,
  requestId,
  decision, // APPROVE | REJECT
  rejectionReason = null,
  reviewerId = null,
  reviewerName = null,
  prismaClient = null,
}) {
  if (!companyId || !requestId) throw serviceError('المعرفات المطلوبة غير مكتملة', 400);
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw serviceError('القرار يجب أن يكون APPROVE أو REJECT', 400);
  }

  const prisma = prismaClient || getSharedPrismaClient();

  const request = await prisma.orderChangeRequest.findFirst({
    where: { id: requestId, companyId },
  });
  if (!request) throw serviceError('طلب التعديل غير موجود', 404);

  if (request.status !== 'PENDING') {
    throw serviceError('لا يمكن مراجعة طلب تم حسمه مسبقًا', 400);
  }

  const shipment = await prisma.shipment.findFirst({
    where: { id: request.shipmentId, companyId },
  });
  if (!shipment) throw serviceError('الشحنة المرتبطة بالطلب غير موجودة', 404);

  // Guard: if shipment transitioned to DELIVERED / REMITTED in the interim -> 409
  const finalizedStatuses = ['DELIVERED', 'REMITTED'];
  if (finalizedStatuses.includes(shipment.status)) {
    throw serviceError(
      'ممنوع تعديل الشحنة بعد التسليم أو التوريد (DELIVERED / REMITTED) (409)',
      409,
      'SHIPMENT_FINALIZED'
    );
  }

  if (decision === 'APPROVE') {
    const updateShipmentData = {};

    if (request.type === 'ADDRESS') {
      try {
        const parsed = JSON.parse(request.newValue);
        if (parsed.governorate !== undefined) updateShipmentData.destinationGovernorate = parsed.governorate;
        if (parsed.city !== undefined) updateShipmentData.destinationCity = parsed.city;
        if (parsed.address !== undefined) updateShipmentData.destinationAddress = parsed.address;
      } catch (e) {
        // Plain string address
        updateShipmentData.destinationAddress = request.newValue;
      }
    } else if (request.type === 'AMOUNT') {
      const num = round(request.newValue);
      if (num < 0) throw serviceError('المبلغ لا يمكن أن يكون سالبًا', 400);
      updateShipmentData.codAmount = num;
    } else if (request.type === 'RECIPIENT') {
      try {
        const parsed = JSON.parse(request.newValue);
        if (parsed.name !== undefined) updateShipmentData.recipientName = parsed.name;
        if (parsed.phone !== undefined) updateShipmentData.recipientPhone = parsed.phone;
        if (parsed.phone2 !== undefined) updateShipmentData.recipientPhone2 = parsed.phone2;
      } catch (e) {
        updateShipmentData.recipientName = request.newValue;
      }
    }

    // Apply updates to shipment
    const updatedShipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: updateShipmentData,
    });

    // Record ShipmentEvent ORDER_CHANGED
    try {
      await prisma.shipmentEvent.create({
        data: {
          companyId,
          shipmentId: shipment.id,
          fromStatus: shipment.status,
          toStatus: 'ORDER_CHANGED',
          reasonCode: 'ORDER_CHANGED',
          notes: `تمت الموافقة على تعديل ${request.type}: من ${request.oldValue} إلى ${request.newValue}`,
          actorType: 'ADMIN',
          actorId: reviewerId,
          actorName: reviewerName || 'Admin',
        },
      });
    } catch (e) {
      console.warn('[extraServices] ShipmentEvent error:', e.message);
    }

    // Mark request as APPROVED
    const updatedRequest = await prisma.orderChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerName || reviewerId || 'ADMIN',
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedRequest,
      shipment: updatedShipment,
      message: 'تمت الموافقة على طلب التعديل وتحديث بيانات الشحنة',
    };
  } else {
    // REJECT
    const updatedRequest = await prisma.orderChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason ? String(rejectionReason).trim() : 'تم الرفض من قبل الإدارة',
        reviewedBy: reviewerName || reviewerId || 'ADMIN',
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedRequest,
      message: 'تم رفض طلب تعديل الشحنة',
    };
  }
}

/**
 * ============================================================================
 * 5. Wallet Helper
 * ============================================================================
 */

async function recordWalletTransaction({
  companyId,
  shipmentBarcode,
  amount,
  reason,
  type = 'WITHDRAW',
  notes = null,
  createdBy = null,
  prisma,
}) {
  const numAmount = round(amount);
  if (numAmount <= 0) return;

  // 1. Update company wallet balance if exists
  let balanceAfter = 0;
  if (prisma.companyWallet) {
    try {
      const wallet = await prisma.companyWallet.findUnique({ where: { companyId } });
      if (wallet) {
        const newBalance = type === 'WITHDRAW' ? Number(wallet.balance) - numAmount : Number(wallet.balance) + numAmount;
        balanceAfter = round(newBalance);
        await prisma.companyWallet.update({
          where: { companyId },
          data: {
            balance: newBalance,
            totalSpent: type === 'WITHDRAW' ? { increment: numAmount } : undefined,
          },
        });
      }
    } catch (e) {
      console.warn('[Wallet] Error updating companyWallet:', e.message);
    }
  }

  // 2. Create ledger transaction entry
  const delegate = prisma.companyWalletTransaction || prisma.walletTransaction || prisma.shippingWalletTransaction;
  if (delegate) {
    try {
      await delegate.create({
        data: {
          companyId,
          type,
          reason,
          code: shipmentBarcode,
          amount: numAmount,
          balanceAfter,
          notes,
          createdBy,
        },
      });
    } catch (e) {
      console.warn('[Wallet] Error creating wallet transaction:', e.message);
    }
  }
}

module.exports = {
  // Services
  createService,
  listServices,
  getServiceById,
  updateService,
  deleteService,
  // Shipment Service Lines
  addShipmentServiceLine,
  listShipmentServiceLines,
  removeShipmentServiceLine,
  getShipmentExtraFees,
  // Package Open Requests
  createPackageOpenRequest,
  listPackageOpenRequests,
  reviewPackageOpenRequest,
  // Order Change Requests
  createOrderChangeRequest,
  listOrderChangeRequests,
  reviewOrderChangeRequest,
  // Wallet Helper
  recordWalletTransaction,
};

const { validateEgyptianPhone } = require('../utils/orderValidation');

function getSharedDatabase() {
  return require('./sharedDatabase');
}

function isPlainMetadataObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeMetadataPatch(currentValue, patchValue) {
  const safeCurrent = isPlainMetadataObject(currentValue) ? { ...currentValue } : {};

  if (!isPlainMetadataObject(patchValue)) {
    return safeCurrent;
  }

  Object.entries(patchValue).forEach(([key, value]) => {
    if (value === null) {
      delete safeCurrent[key];
      return;
    }

    if (isPlainMetadataObject(value) && isPlainMetadataObject(safeCurrent[key])) {
      safeCurrent[key] = mergeMetadataPatch(safeCurrent[key], value);
      return;
    }

    safeCurrent[key] = value;
  });

  return safeCurrent;
}

function parseJsonObject(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return { ...fallback, ...value };
  }

  if (typeof value !== 'string') {
    return { ...fallback };
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...fallback, ...parsed }
      : { ...fallback };
  } catch (_error) {
    return { ...fallback };
  }
}

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(input || {}, key);
}

class OrderDetailsUpdateService {
  constructor(options = {}) {
    this.getPrisma = options.getPrisma || (() => getSharedDatabase().getSharedPrismaClient());
    this.now = options.now || (() => new Date());
    this.TurboService = options.TurboService || null;
  }

  getPrismaClient() {
    const prisma = this.getPrisma();
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }
    return prisma;
  }

  getTurboServiceClass() {
    if (!this.TurboService) {
      this.TurboService = require('./turboService');
    }
    return this.TurboService;
  }

  validatePayload(input = {}) {
    if (hasOwn(input, 'metadataPatch') && input.metadataPatch !== undefined && !isPlainMetadataObject(input.metadataPatch)) {
      const error = new Error('metadataPatch must be a plain object');
      error.statusCode = 400;
      throw error;
    }

    if (input.customerPhone) {
      const validation = validateEgyptianPhone(String(input.customerPhone));
      if (!validation.isValid) {
        const error = new Error(validation.error || 'رقم الهاتف غير صحيح');
        error.statusCode = 400;
        throw error;
      }
    }

    if (
      hasOwn(input, 'alternativePhone')
      && input.alternativePhone
      && String(input.alternativePhone).trim() !== ''
    ) {
      const validation = validateEgyptianPhone(String(input.alternativePhone));
      if (!validation.isValid) {
        const error = new Error(`الرقم البديل: ${validation.error}`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  parseShippingAddress(value) {
    return parseJsonObject(value, {});
  }

  buildMergedShippingAddress(existingValue, input = {}, preserveBlankLocation = false) {
    let shippingAddress = this.parseShippingAddress(existingValue);

    if (isPlainMetadataObject(input.shippingAddress)) {
      shippingAddress = {
        ...shippingAddress,
        ...input.shippingAddress,
      };
    }

    if (hasOwn(input, 'governorate')) {
      if (preserveBlankLocation || (input.governorate !== undefined && input.governorate !== null && input.governorate !== '')) {
        shippingAddress.governorate = input.governorate;
      }
    }

    if (hasOwn(input, 'city')) {
      if (preserveBlankLocation || (input.city !== undefined && input.city !== null && input.city !== '')) {
        shippingAddress.city = input.city;
      }
    }

    return shippingAddress;
  }

  buildUpdatedFields(input = {}) {
    return [
      'shippingAddress',
      'notes',
      'customerName',
      'customerPhone',
      'alternativePhone',
      'city',
      'governorate',
      'metadataPatch',
    ].filter((field) => hasOwn(input, field));
  }

  async findRegularOrder(orderIdentifier, companyId) {
    return this.getPrismaClient().order.findFirst({
      where: {
        OR: [
          { id: orderIdentifier, companyId },
          { orderNumber: orderIdentifier, companyId },
        ],
      },
    });
  }

  async findGuestOrder(orderIdentifier, companyId) {
    return this.getPrismaClient().guestOrder.findFirst({
      where: {
        OR: [
          { id: orderIdentifier, companyId },
          { orderNumber: orderIdentifier, companyId },
        ],
      },
    });
  }

  buildRegularUpdateData(regularOrder, input = {}) {
    let metadata = parseJsonObject(regularOrder.metadata, {});
    if (hasOwn(input, 'alternativePhone')) {
      metadata.alternativePhone = input.alternativePhone;
    }
    if (hasOwn(input, 'metadataPatch') && input.metadataPatch !== undefined) {
      metadata = mergeMetadataPatch(metadata, input.metadataPatch);
    }

    const shippingAddress = this.buildMergedShippingAddress(regularOrder.shippingAddress, input, false);
    const updateData = {
      shippingAddress: Object.keys(shippingAddress).length > 0
        ? JSON.stringify(shippingAddress)
        : undefined,
      notes: hasOwn(input, 'notes') ? input.notes : undefined,
      city: hasOwn(input, 'city') ? input.city : undefined,
      customerName: hasOwn(input, 'customerName') ? input.customerName : undefined,
      customerPhone: hasOwn(input, 'customerPhone') ? input.customerPhone : undefined,
      governorate: hasOwn(input, 'governorate') ? input.governorate : undefined,
      customerAddress: (input.shippingAddress && input.shippingAddress.address)
        ? input.shippingAddress.address
        : (hasOwn(input, 'customerAddress') ? input.customerAddress : undefined),
      metadata: JSON.stringify(metadata),
      updatedAt: this.now(),
    };

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    return {
      metadata,
      shippingAddress,
      updateData,
    };
  }

  buildGuestUpdateData(guestOrder, input = {}) {
    let metadata = parseJsonObject(guestOrder.metadata, {
      source: 'storefront',
      isGuestOrder: true,
    });
    if (hasOwn(input, 'alternativePhone')) {
      metadata.alternativePhone = input.alternativePhone;
    }
    if (hasOwn(input, 'metadataPatch') && input.metadataPatch !== undefined) {
      metadata = mergeMetadataPatch(metadata, input.metadataPatch);
    }

    const shippingAddress = this.buildMergedShippingAddress(guestOrder.shippingAddress, input, true);
    const updateData = {
      shippingAddress: JSON.stringify(shippingAddress),
      notes: hasOwn(input, 'notes') ? input.notes : undefined,
      guestName: hasOwn(input, 'customerName') ? input.customerName : undefined,
      guestPhone: hasOwn(input, 'customerPhone') ? input.customerPhone : undefined,
      metadata: JSON.stringify(metadata),
      updatedAt: this.now(),
    };

    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    return {
      metadata,
      shippingAddress,
      updateData,
    };
  }

  async syncTurboForRegularOrder(updatedOrder, companyId, orderNumber) {
    if (!updatedOrder?.turboShipmentId || !updatedOrder.company?.turboEnabled || !updatedOrder.company?.turboApiKey) {
      return {
        attempted: false,
        updated: false,
        shipmentId: updatedOrder?.turboShipmentId || null,
        error: null,
      };
    }

    try {
      const TurboService = this.getTurboServiceClass();
      const turboService = new TurboService(updatedOrder.company.turboApiKey, companyId);
      const orderData = turboService.formatOrderForTurbo(
        updatedOrder,
        updatedOrder.customer,
        updatedOrder.orderItems || []
      );
      await turboService.updateShipment(updatedOrder.turboShipmentId, orderData);

      return {
        attempted: true,
        updated: true,
        shipmentId: updatedOrder.turboShipmentId || null,
        error: null,
      };
    } catch (error) {
      console.error(`❌ [TURBO] Failed to update shipment for order ${orderNumber}:`, error.message);
      return {
        attempted: true,
        updated: false,
        shipmentId: updatedOrder.turboShipmentId || null,
        error: error.message,
      };
    }
  }

  buildRegularResult(updatedOrder, metadata, shippingAddress, updatedFields, turboSync) {
    return {
      orderType: 'regular',
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      updatedFields,
      shippingAddress,
      notes: updatedOrder.notes || null,
      customerName: updatedOrder.customerName || null,
      customerPhone: updatedOrder.customerPhone || null,
      city: updatedOrder.city || null,
      governorate: shippingAddress.governorate || null,
      alternativePhone: metadata.alternativePhone ?? null,
      metadata,
      turboSync,
      socketPayload: {
        orderNumber: updatedOrder.orderNumber,
        shippingAddress,
        notes: updatedOrder.notes || null,
        customerName: updatedOrder.customerName || null,
        customerPhone: updatedOrder.customerPhone || null,
        city: updatedOrder.city || null,
        governorate: shippingAddress.governorate || null,
        metadata,
      },
    };
  }

  buildGuestResult(updatedOrder, metadata, shippingAddress, updatedFields) {
    return {
      orderType: 'guest',
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      updatedFields,
      shippingAddress,
      notes: updatedOrder.notes || null,
      customerName: updatedOrder.guestName || null,
      customerPhone: updatedOrder.guestPhone || null,
      city: shippingAddress.city || null,
      governorate: shippingAddress.governorate || null,
      alternativePhone: metadata.alternativePhone ?? null,
      metadata,
      turboSync: {
        attempted: false,
        updated: false,
        shipmentId: null,
        error: null,
      },
      socketPayload: {
        orderNumber: updatedOrder.orderNumber,
        shippingAddress,
        notes: updatedOrder.notes || null,
        customerName: updatedOrder.guestName || null,
        customerPhone: updatedOrder.guestPhone || null,
        city: shippingAddress.city || null,
        governorate: shippingAddress.governorate || null,
        metadata,
      },
    };
  }

  async updateOrderDetails({ orderIdentifier, companyId, input = {} } = {}) {
    if (!orderIdentifier || !companyId) {
      const error = new Error('Order identifier and companyId are required');
      error.statusCode = 400;
      throw error;
    }

    this.validatePayload(input);
    const updatedFields = this.buildUpdatedFields(input);
    const prisma = this.getPrismaClient();

    const regularOrder = await this.findRegularOrder(orderIdentifier, companyId);
    if (regularOrder) {
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): لو الحالة الحالية غير مسموح
      // تعديل بياناتها، نرفض أي تعديل (اسم/تليفون/عنوان/ملاحظات/ميتا).
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(prisma, companyId, regularOrder.status);

      const { metadata, shippingAddress, updateData } = this.buildRegularUpdateData(regularOrder, input);
      const updatedOrder = await prisma.order.update({
        where: { id: regularOrder.id },
        data: updateData,
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true,
            },
          },
          company: {
            select: {
              id: true,
              turboApiKey: true,
              turboEnabled: true,
            },
          },
        },
      });
      const turboSync = await this.syncTurboForRegularOrder(updatedOrder, companyId, updatedOrder.orderNumber);

      return this.buildRegularResult(updatedOrder, metadata, shippingAddress, updatedFields, turboSync);
    }

    const guestOrder = await this.findGuestOrder(orderIdentifier, companyId);
    if (guestOrder) {
      // 🔒 قفل تعديل بيانات الأوردر (لكل حالة) — طلبات الضيوف.
      const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
      await assertOrderStatusEditable(prisma, companyId, guestOrder.status);

      const { metadata, shippingAddress, updateData } = this.buildGuestUpdateData(guestOrder, input);
      const updatedOrder = await prisma.guestOrder.update({
        where: { id: guestOrder.id },
        data: updateData,
      });

      return this.buildGuestResult(updatedOrder, metadata, shippingAddress, updatedFields);
    }

    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
}

const orderDetailsUpdateService = new OrderDetailsUpdateService();

module.exports = orderDetailsUpdateService;
module.exports.OrderDetailsUpdateService = OrderDetailsUpdateService;
module.exports.isPlainMetadataObject = isPlainMetadataObject;
module.exports.mergeMetadataPatch = mergeMetadataPatch;

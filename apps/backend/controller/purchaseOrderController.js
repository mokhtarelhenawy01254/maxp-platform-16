const {
  getSharedPrismaClient,
  safeQuery,
} = require("../services/sharedDatabase");

const normalizePurchaseOrder = (order) => {
  if (!order) return order;

  const { purchaseOrderItems, purchaseInvoices, _count, ...rest } = order;

  return {
    ...rest,
    ...(purchaseOrderItems !== undefined ? { items: purchaseOrderItems } : {}),
    ...(purchaseInvoices !== undefined ? { invoices: purchaseInvoices } : {}),
    ...(_count
      ? {
          _count: {
            ..._count,
            ...(typeof _count.purchaseOrderItems === "number"
              ? { items: _count.purchaseOrderItems }
              : {}),
          },
        }
      : {}),
  };
};

const generateOrderNumber = async (companyId) => {
  const lastOrder = await safeQuery(() =>
    getSharedPrismaClient().purchaseOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  );

  const lastNumber = lastOrder
    ? parseInt(lastOrder.orderNumber.split("-").pop())
    : 0;
  return `PO-${String(lastNumber + 1).padStart(6, "0")}`;
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      orderDate,
      expectedDelivery,
      items,
      paymentTerms,
      notes,
      shippingCost,
      discountAmount,
    } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: "المورد والأصناف مطلوبة" });
    }

    const orderNumber = await generateOrderNumber(companyId);

    // Validate candidate productIds against actual Products table to avoid Foreign Key violation
    const validProductIds = new Set();
    const candidateProductIds = items
      .map((item) => item.productId)
      .filter(Boolean);

    if (candidateProductIds.length > 0) {
      const existingProducts = await safeQuery(() =>
        getSharedPrismaClient().product.findMany({
          where: {
            id: { in: candidateProductIds },
            companyId,
          },
          select: { id: true },
        }),
      );
      if (Array.isArray(existingProducts)) {
        existingProducts.forEach((p) => validProductIds.add(p.id));
      }
    }

    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map((item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const taxRate = parseFloat(item.taxRate || 0);
      const discountRate = parseFloat(item.discountRate || 0);

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = itemSubtotal * (discountRate / 100);
      const itemTax = (itemSubtotal - itemDiscount) * (taxRate / 100);
      const totalPrice = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      const safeProductId =
        item.productId && validProductIds.has(item.productId)
          ? item.productId
          : null;

      return {
        productId: safeProductId,
        productName: item.productName,
        description: item.description,
        quantity,
        unitPrice,
        taxRate,
        discountRate,
        totalPrice,
        notes: item.notes,
      };
    });

    const shipping = parseFloat(shippingCost || 0);
    const discount = parseFloat(discountAmount || 0);
    const totalAmount = subtotal + taxAmount + shipping - discount;

    const purchaseOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.create({
        data: {
          companyId,
          supplierId,
          orderNumber,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          expectedDelivery: expectedDelivery
            ? new Date(expectedDelivery)
            : null,
          subtotal,
          taxAmount,
          discountAmount: discount,
          shippingCost: shipping,
          totalAmount,
          paymentTerms,
          notes,
          createdBy: userId,
          purchaseOrderItems: {
            create: orderItems,
          },
        },
        include: {
          purchaseOrderItems: true,
          supplier: true,
        },
      }),
    );

    res.status(201).json({
      success: true,
      message: "تم إنشاء أمر الشراء بنجاح",
      purchaseOrder: normalizePurchaseOrder(purchaseOrder),
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء أمر الشراء: " + error.message,
      error: error.message,
      details: error.stack,
    });
  }
};

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status, supplierId, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            supplier: {
              select: { id: true, name: true, phone: true },
            },
            _count: {
              select: { purchaseOrderItems: true },
            },
          },
        }),
      ),
      safeQuery(() => getSharedPrismaClient().purchaseOrder.count({ where })),
    ]);

    res.json({
      orders: orders.map(normalizePurchaseOrder),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب أوامر الشراء" });
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
        include: {
          supplier: true,
          purchaseOrderItems: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, stock: true },
              },
            },
          },
          purchaseInvoices: true,
        },
      }),
    );

    if (!order) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    res.json(normalizePurchaseOrder(order));
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب أمر الشراء" });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const {
      supplierId,
      orderDate,
      expectedDelivery,
      status,
      paymentTerms,
      notes,
      shippingCost,
      discountAmount,
    } = req.body;

    const existingOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
      }),
    );

    if (!existingOrder) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    if (
      existingOrder.status === "RECEIVED" ||
      existingOrder.status === "CLOSED"
    ) {
      return res
        .status(400)
        .json({ message: "لا يمكن تعديل أمر شراء مستلم أو مغلق" });
    }

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          orderDate: orderDate ? new Date(orderDate) : undefined,
          expectedDelivery: expectedDelivery
            ? new Date(expectedDelivery)
            : undefined,
          status,
          paymentTerms,
          notes,
          shippingCost: shippingCost ? parseFloat(shippingCost) : undefined,
          discountAmount: discountAmount
            ? parseFloat(discountAmount)
            : undefined,
        },
        include: {
          purchaseOrderItems: true,
          supplier: true,
        },
      }),
    );

    res.json({
      message: "تم تحديث أمر الشراء بنجاح",
      order: normalizePurchaseOrder(order),
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث أمر الشراء" });
  }
};

exports.approvePurchaseOrder = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
      }),
    );

    if (!order) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    if (order.status !== "DRAFT" && order.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "لا يمكن الموافقة على هذا الأمر" });
    }

    const updatedOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.update({
        where: { id },
        data: {
          status: "ORDERED",
          approvedBy: userId,
          approvedAt: new Date(),
        },
        include: {
          purchaseOrderItems: true,
          supplier: true,
        },
      }),
    );

    res.json({
      message: "تمت الموافقة على أمر الشراء بنجاح",
      order: normalizePurchaseOrder(updatedOrder),
    });
  } catch (error) {
    console.error("Error approving purchase order:", error);
    res.status(500).json({ message: "حدث خطأ أثناء الموافقة على أمر الشراء" });
  }
};

exports.receiveItems = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { items, receivedDate, warehouseId: defaultWarehouseId } = req.body;

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
        include: { purchaseOrderItems: true },
      }),
    );

    if (!order) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    if (
      order.status !== "ORDERED" &&
      order.status !== "PARTIALLY_RECEIVED" &&
      order.status !== "RECEIVED"
    ) {
      return res
        .status(400)
        .json({ message: "لا يمكن استلام أصناف من هذا الأمر" });
    }

    for (const item of items) {
      const orderItem = order.purchaseOrderItems.find(
        (i) => i.id === item.itemId,
      );
      if (!orderItem) continue;

      const newReceivedQty =
        parseFloat(orderItem.receivedQuantity) +
        parseFloat(item.receivedQuantity);

      await safeQuery(() =>
        getSharedPrismaClient().purchaseOrderItem.update({
          where: { id: item.itemId },
          data: { receivedQuantity: newReceivedQty },
        }),
      );

      if (orderItem.productId && item.updateInventory) {
        const targetWarehouseId = item.warehouseId || defaultWarehouseId || null;
        const product = await safeQuery(() =>
          getSharedPrismaClient().product.findUnique({
            where: { id: orderItem.productId },
          }),
        );

        if (product) {
          const receivedQuantity = parseInt(item.receivedQuantity);
          await safeQuery(() =>
            getSharedPrismaClient().product.update({
              where: { id: orderItem.productId },
              data: {
                stock: product.stock + receivedQuantity,
                cost: parseFloat(orderItem.unitPrice),
              },
            }),
          );

          if (targetWarehouseId) {
            const warehouse = await safeQuery(() =>
              getSharedPrismaClient().warehouse.findFirst({
                where: {
                  id: targetWarehouseId,
                  companyId,
                  isActive: true,
                },
              }),
            );

            if (!warehouse) {
              return res.status(400).json({
                success: false,
                message: "المخزن المحدد للاستلام غير موجود أو غير مفعل",
              });
            }

            await safeQuery(() =>
              getSharedPrismaClient().$transaction(async (prisma) => {
                const existingInventory = await prisma.inventory.findFirst({
                  where: {
                    productId: orderItem.productId,
                    warehouseId: targetWarehouseId,
                    batchNumber: item.batchNumber || null,
                  },
                });

                if (existingInventory) {
                  await prisma.inventory.update({
                    where: { id: existingInventory.id },
                    data: {
                      quantity: { increment: receivedQuantity },
                      available: { increment: receivedQuantity },
                      cost: parseFloat(orderItem.unitPrice),
                      expiryDate: item.expiryDate ? new Date(item.expiryDate) : existingInventory.expiryDate,
                    },
                  });
                } else {
                  await prisma.inventory.create({
                    data: {
                      productId: orderItem.productId,
                      warehouseId: targetWarehouseId,
                      quantity: receivedQuantity,
                      available: receivedQuantity,
                      reserved: 0,
                      cost: parseFloat(orderItem.unitPrice),
                      batchNumber: item.batchNumber || null,
                      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                    },
                  });
                }

                await prisma.stockMovement.create({
                  data: {
                    productId: orderItem.productId,
                    warehouseId: targetWarehouseId,
                    type: "IN",
                    reason: "PURCHASE",
                    quantity: receivedQuantity,
                    reference: order.orderNumber,
                    notes: `استلام أمر شراء ${order.orderNumber}`,
                    isApproved: true,
                    userId: req.user.id,
                    userName: req.user.email || req.user.name || "Procurement",
                    approvedBy: req.user.id,
                    approvedAt: new Date(),
                  },
                });
              }),
            );
          }
        }
      }
    }

    const updatedOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id },
        include: { purchaseOrderItems: true },
      }),
    );

    const allReceived = updatedOrder.purchaseOrderItems.every(
      (item) => parseFloat(item.receivedQuantity) >= parseFloat(item.quantity),
    );

    const partiallyReceived = updatedOrder.purchaseOrderItems.some(
      (item) => parseFloat(item.receivedQuantity) > 0,
    );

    let newStatus = order.status;
    if (allReceived) {
      newStatus = "RECEIVED";
    } else if (partiallyReceived) {
      newStatus = "PARTIALLY_RECEIVED";
    }

    const finalOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        },
        include: {
          purchaseOrderItems: true,
          supplier: true,
        },
      }),
    );

    if (newStatus === "RECEIVED") {
      try {
        const existingInvoice = await safeQuery(() =>
          getSharedPrismaClient().purchaseInvoice.findFirst({
            where: { companyId, purchaseOrderId: order.id },
          }),
        );

        if (!existingInvoice) {
          const lastInvoice = await safeQuery(() =>
            getSharedPrismaClient().purchaseInvoice.findFirst({
              where: { companyId },
              orderBy: { createdAt: "desc" },
            }),
          );
          const lastNumber = lastInvoice
            ? parseInt(lastInvoice.invoiceNumber.split("-").pop())
            : 0;
          const invoiceNumber = `PI-${String(lastNumber + 1).padStart(6, "0")}`;

          await safeQuery(() =>
            getSharedPrismaClient().purchaseInvoice.create({
              data: {
                companyId,
                supplierId: order.supplierId,
                purchaseOrderId: order.id,
                invoiceNumber,
                invoiceDate: new Date(),
                subtotal: order.subtotal,
                taxAmount: order.taxAmount,
                discountAmount: order.discountAmount,
                shippingCost: order.shippingCost,
                totalAmount: order.totalAmount,
                paidAmount: 0,
                remainingAmount: order.totalAmount,
                status: "PENDING",
                createdBy: order.createdBy,
                purchaseInvoiceItems: {
                  create: order.purchaseOrderItems.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate,
                    discountRate: item.discountRate,
                    totalPrice: item.totalPrice,
                  })),
                },
              },
            }),
          );

          await safeQuery(() =>
            getSharedPrismaClient().supplier.update({
              where: { id: order.supplierId },
              data: {
                currentBalance: { increment: order.totalAmount },
              },
            }),
          );
        }
      } catch (invError) {
        console.error("Error creating automated invoice:", invError);
      }
    }

    res.json({
      message: "تم استلام الأصناف بنجاح",
      order: normalizePurchaseOrder(finalOrder),
    });
  } catch (error) {
    console.error("Error receiving items:", error);
    res.status(500).json({ message: "حدث خطأ أثناء استلام الأصناف" });
  }
};

exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
      }),
    );

    if (!order) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    if (order.status === "RECEIVED" || order.status === "CLOSED") {
      return res
        .status(400)
        .json({ message: "لا يمكن إلغاء أمر شراء مستلم أو مغلق" });
    }

    const updatedOrder = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          purchaseOrderItems: true,
          supplier: true,
        },
      }),
    );

    res.json({
      message: "تم إلغاء أمر الشراء بنجاح",
      order: normalizePurchaseOrder(updatedOrder),
    });
  } catch (error) {
    console.error("Error cancelling purchase order:", error);
    res.status(500).json({ message: "حدث خطأ أثناء إلغاء أمر الشراء" });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const order = await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.findFirst({
        where: { id, companyId },
      }),
    );

    if (!order) {
      return res.status(404).json({ message: "أمر الشراء غير موجود" });
    }

    if (order.status !== "DRAFT" && order.status !== "CANCELLED") {
      return res
        .status(400)
        .json({ message: "يمكن حذف المسودات والأوامر الملغاة فقط" });
    }

    await safeQuery(() =>
      getSharedPrismaClient().purchaseOrder.delete({
        where: { id },
      }),
    );

    res.json({ message: "تم حذف أمر الشراء بنجاح" });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    res.status(500).json({ message: "حدث خطأ أثناء حذف أمر الشراء" });
  }
};

exports.getPurchaseOrderStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [
      totalOrders,
      draftOrders,
      pendingOrders,
      orderedOrders,
      totalAmount,
    ] = await Promise.all([
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.count({ where: { companyId } }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.count({
          where: { companyId, status: "DRAFT" },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.count({
          where: { companyId, status: "PENDING" },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.count({
          where: { companyId, status: "ORDERED" },
        }),
      ),
      safeQuery(() =>
        getSharedPrismaClient().purchaseOrder.aggregate({
          where: { companyId, status: { notIn: ["CANCELLED"] } },
          _sum: { totalAmount: true },
        }),
      ),
    ]);

    res.json({
      totalOrders,
      draftOrders,
      pendingOrders,
      approvedOrders: orderedOrders,
      orderedOrders,
      totalAmount: totalAmount._sum.totalAmount || 0,
    });
  } catch (error) {
    console.error("Error fetching purchase order stats:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الإحصائيات" });
  }
};

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { getWooCommerceAutoExportService } = require('../services/wooCommerceAutoExportService');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const createPOSOrder = async (req, res) => {
  try {
    const {
      cart,
      customer,
      paymentMethod = 'CASH',
      discount = 0,
      discountType = 'NONE',
      splitDetails = null,
      tableTabId = null
    } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ success: false, message: 'السلة فارغة' });
    }

    // 1. Verify Products & Calculate Totals (Security Check)
    let calculatedTotal = 0;
    let calculatedSubtotal = 0;
    const orderItemsData = [];

    // Fetch real product data to avoid frontend manipulation
    const productIds = cart.map(item => item.productId || item.id);
    const dbProducts = await getSharedPrismaClient().product.findMany({
      where: {
        id: { in: productIds },
        companyId: companyId
      },
      include: {
        inventories: true,
        recipes: { where: { isActive: true } }
      }
    });

    // Validate stock and prices
    for (const cartItem of cart) {
      const prodId = cartItem.productId || cartItem.id;
      const dbProduct = dbProducts.find(p => p.id === prodId);
      
      if (!dbProduct) {
        return res.status(400).json({ 
          success: false, 
          message: `المنتج ${cartItem.name} غير موجود أو تم حذفه` 
        });
      }

      const hasRecipe = dbProduct.recipes && dbProduct.recipes.length > 0;
      if (dbProduct.trackInventory !== false && !hasRecipe && dbProduct.stock < cartItem.qty) {
        return res.status(400).json({ 
          success: false, 
          message: `الكمية المطلوبة للمنتج ${dbProduct.name} غير متوفرة. المتاح: ${dbProduct.stock}` 
        });
      }

      const itemUnitPrice = Number(cartItem.price != null ? cartItem.price : dbProduct.price);
      const itemTotal = itemUnitPrice * cartItem.qty;
      calculatedSubtotal += itemTotal;

      const metadataObj = {};
      if (cartItem.selectedModifiers && cartItem.selectedModifiers.length > 0) {
        metadataObj.selectedModifiers = cartItem.selectedModifiers;
      }
      if (cartItem.itemNotes) {
        metadataObj.itemNotes = cartItem.itemNotes;
      }

      orderItemsData.push({
        productId: dbProduct.id,
        productName: dbProduct.name + (cartItem.selectedModifiers?.length ? ` (${cartItem.selectedModifiers.map(m => m.name).join(', ')})` : ''),
        quantity: cartItem.qty,
        price: itemUnitPrice,
        total: itemTotal,
        productSku: dbProduct.sku,
        extractionSource: 'pos',
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null,
        selectedModifiers: cartItem.selectedModifiers || []
      });
    }

    const discountAmount = Number(discount) > 0 ? Math.min(Number(discount), calculatedSubtotal) : 0;
    const taxableSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
    const tax = taxableSubtotal * 0.14; // 14% VAT
    calculatedTotal = taxableSubtotal + tax;

    // 2. Handle Customer
    let customerId = customer?.id;
    
    // If new customer or guest
    if (!customerId || customerId === 'new') {
      if (customer?.name && customer?.phone) {
        // منع التكرار: لو الرقم موجود نستخدم العميل الموجود
        const { findCustomerByPhone } = require('../utils/customerIdentity');
        const existing = await findCustomerByPhone(getSharedPrismaClient(), customer.phone, companyId);
        if (existing) {
          customerId = existing.id;
        } else {
          // Create new customer
          const newCustomer = await getSharedPrismaClient().customer.create({
            data: {
              firstName: customer.name.split(' ')[0] || 'عميل',
              lastName: customer.name.split(' ').slice(1).join(' ') || 'كاشير',
              phone: customer.phone,
              phoneNormalized: require('../utils/phoneNormalization').toCanonicalE164(customer.phone),
              companyId: companyId,
              status: 'ACTIVE',
              metadata: JSON.stringify({ source: 'pos' })
            }
          });
          customerId = newCustomer.id;
        }
      } else {
        // Find or create generic "Walk-in Customer"
        // For PostgreSQL, use case-insensitive text search instead of contains
        let walkIn = await getSharedPrismaClient().customer.findFirst({
          where: { 
            companyId,
            metadata: { 
              contains: 'isWalkIn',
              mode: 'insensitive'
            }
          }
        });

        if (!walkIn) {
            walkIn = await getSharedPrismaClient().customer.create({
                data: {
                    firstName: 'عميل',
                    lastName: 'كاشير',
                    companyId,
                    status: 'ACTIVE',
                    metadata: JSON.stringify({ isWalkIn: true, source: 'pos' })
                }
            });
        }
        customerId = walkIn.id;
      }
    }

    // 3. Generate Order Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now().toString().slice(-6);
    const orderNumber = `POS-${dateStr}-${timestamp}`;

    const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
    if (!orderLimitCheck.allowed) {
      return res.status(400).json(orderLimitCheck.payload);
    }

    // 4. Execute Transaction (Order + Inventory Update)
    const result = await getSharedPrismaClient().$transaction(async (tx) => {
      const prismaOrderItems = orderItemsData.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        productSku: item.productSku,
        extractionSource: item.extractionSource,
        metadata: item.metadata
      }));

      // A. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          companyId,
          status: 'DELIVERED', // Immediate completion for POS orders
          paymentStatus: 'COMPLETED', // Immediate payment for POS orders
          paymentMethod: paymentMethod,
          subtotal: calculatedSubtotal,
          tax: tax,
          shipping: 0, // No shipping in POS
          total: calculatedTotal,
          currency: 'EGP',
          sourceType: 'pos',
          isViewed: false,
          orderItems: {
            create: prismaOrderItems
          },
          metadata: JSON.stringify({
            cashierId: userId,
            source: 'pos_terminal',
            discountAmount,
            discountType,
            splitDetails: paymentMethod === 'SPLIT' ? splitDetails : null,
            tableTabId: tableTabId || null
          })
        },
        include: {
          orderItems: true
        }
      });

      // B. Update Product Stock / Recipe Ingredients
      const recipeService = require('../services/recipeService');
      for (const item of orderItemsData) {
        // Check if item has an active recipe
        const recipe = await tx.recipe.findFirst({
          where: { companyId, productId: item.productId, isActive: true }
        });

        if (recipe) {
          // Deduct raw ingredients (beans, milk, cups)
          await recipeService.deductRecipeIngredients({
            companyId,
            warehouseId: req.body.warehouseId || null,
            orderItems: [item],
            orderNumber,
            userId,
            tx
          });
        } else {
          // Regular finished product stock decrement
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
          
          // Update Warehouse Inventory
          const inventoryItem = await tx.inventory.findFirst({
            where: { 
              productId: item.productId,
              warehouse: { companyId: companyId }
            },
            include: { warehouse: true }
          });

          if (inventoryItem) {
            await tx.inventory.update({
              where: { id: inventoryItem.id },
              data: {
                quantity: { decrement: item.quantity },
                available: { decrement: item.quantity }
              }
            });
          }
        }
      }

      // C. If order was parked as a cloud table tab, mark it closed
      if (tableTabId) {
        await tx.cafeTableTab.updateMany({
          where: { id: tableTabId, companyId },
          data: {
            status: 'CLOSED',
            updatedAt: new Date()
          }
        });
      }

      return order;
    });

    // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية)
    try {
      const wooExportService = getWooCommerceAutoExportService();
      wooExportService.exportOrderAsync(result.id);
    } catch (wooError) {
      console.log('⚠️ [POS] WooCommerce auto-export skipped:', wooError.message);
    }

    res.json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: result
    });

  } catch (error) {
    console.error('POS Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الطلب',
      error: error.message
    });
  }
};

module.exports = {
  createPOSOrder
};


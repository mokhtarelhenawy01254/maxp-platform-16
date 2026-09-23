const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const axios = require('axios');
const { resolveProductMediaState } = require('../utils/productMediaUtils');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const { validateStock } = require('../utils/stockValidation');

/**
 * استيراد منتج واحد من Easy Orders
 * POST /api/v1/easy-orders/import-product
 */
const importProductFromEasyOrders = async (req, res) => {
  try {
    console.log('📦 [EASY-ORDERS] Starting product import...');

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { productData } = req.body;

    if (!productData) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المنتج مطلوبة'
      });
    }

    // استخراج البيانات من Easy Orders
    const {
      name,
      description,
      price,
      comparePrice,
      cost,
      sku,
      barcode,
      stock,
      trackInventory,
      images,
      category,
      tags,
      weight,
      dimensions,
      easyOrdersId, // معرف المنتج في Easy Orders
      easyOrdersUrl // رابط المنتج في Easy Orders
    } = productData;

    // التحقق من الحقول الإجبارية
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'اسم المنتج والسعر مطلوبان'
      });
    }

    // التحقق من وجود المنتج مسبقاً باستخدام easyOrdersId
    if (easyOrdersId) {
      const existingProduct = await getSharedPrismaClient().product.findFirst({
        where: {
          easyOrdersId: easyOrdersId,
          companyId
        }
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: 'هذا المنتج موجود بالفعل في النظام',
          data: existingProduct
        });
      }
    }

    // التحقق من وجود SKU مكرر
    if (sku) {
      const skuExists = await getSharedPrismaClient().product.findFirst({
        where: {
          sku: sku,
          companyId,
          deletedAt: null
        }
      });

      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: 'رمز SKU موجود بالفعل. يرجى استخدام رمز مختلف.'
        });
      }
    }

    // معالجة الفئة إذا كانت موجودة
    let categoryId = null;
    if (category && category.trim() !== '') {
      // البحث عن الفئة أو إنشاؤها
      let categoryRecord = await getSharedPrismaClient().category.findFirst({
        where: {
          name: category.trim(),
          companyId
        }
      });

      if (!categoryRecord) {
        // إنشاء فئة جديدة
        categoryRecord = await getSharedPrismaClient().category.create({
          data: {
            name: category.trim(),
            companyId
          }
        });
        console.log(`✅ [EASY-ORDERS] Created new category: ${category}`);
      }

      categoryId = categoryRecord.id;
    }

    // معالجة الصور - التأكد من أنها URLs صحيحة من Easy Orders
    let processedImages = [];
    if (images && Array.isArray(images)) {
      processedImages = images.filter(img => {
        try {
          const url = new URL(img);
          // التأكد من أن الصورة من Easy Orders
          return url.hostname.includes('easy-orders.net') ||
            url.hostname.includes('files.easy-orders.net');
        } catch {
          return false;
        }
      });
    }

    console.log(`📦 [EASY-ORDERS] Creating product: ${name}`);
    console.log(`🏢 [EASY-ORDERS] Company ID: ${companyId}`);
    console.log(`📸 [EASY-ORDERS] Images count: ${processedImages.length}`);

    const resolvedMedia = resolveProductMediaState({
      currentImages: [],
      currentMainImage: null,
      nextImages: processedImages,
    });

    // إنشاء المنتج
    const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
    if (!productLimitCheck.allowed) {
      return res.status(400).json(productLimitCheck.payload);
    }

    // قصّ المخزون غير المنطقي بدلاً من تخزينه
    const stockResult = validateStock(stock);
    const normalizedStock = stockResult.ok ? (parseInt(stock, 10) || 0) : 0;

    const product = await getSharedPrismaClient().product.create({
      data: {
        name: name.trim(),
        description: description || '',
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        cost: cost ? parseFloat(cost) : null,
        sku: sku || null,
        barcode: barcode || null,
        stock: normalizedStock,
        trackInventory: trackInventory !== undefined ? Boolean(trackInventory) : true,
        companyId,
        categoryId,
        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
        mainImage: resolvedMedia.mainImage,
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions ? JSON.stringify(dimensions) : null,
        easyOrdersId: easyOrdersId || null,
        easyOrdersUrl: easyOrdersUrl || null,
        source: 'easy-orders' // مصدر المنتج
      },
      include: {
        category: true
      }
    });

    console.log(`✅ [EASY-ORDERS] Product imported successfully: ${product.name}`);

    res.status(201).json({
      success: true,
      message: 'تم استيراد المنتج بنجاح من Easy Orders',
      data: product
    });

  } catch (error) {
    console.error('❌ [EASY-ORDERS] Error importing product:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد المنتج',
      error: error.message
    });
  }
};

/**
 * استيراد عدة منتجات دفعة واحدة من Easy Orders
 * POST /api/v1/easy-orders/import-products-bulk
 */
const importProductsBulk = async (req, res) => {
  try {
    console.log('📦 [EASY-ORDERS] Starting bulk product import...');

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'قائمة المنتجات مطلوبة'
      });
    }

    console.log(`📦 [EASY-ORDERS] Importing ${products.length} products...`);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const productData of products) {
      try {
        const { name, price, easyOrdersId } = productData;

        // التحقق من الحقول الإجبارية
        if (!name || !price) {
          results.failed.push({
            product: productData,
            reason: 'اسم المنتج والسعر مطلوبان'
          });
          continue;
        }

        // التحقق من وجود المنتج مسبقاً
        if (easyOrdersId) {
          const existingProduct = await getSharedPrismaClient().product.findFirst({
            where: {
              easyOrdersId: easyOrdersId,
              companyId
            }
          });

          if (existingProduct) {
            results.skipped.push({
              product: productData,
              reason: 'المنتج موجود بالفعل',
              existingProduct
            });
            continue;
          }
        }

        // التحقق من وجود SKU مكرر — تخطي بدلاً من إعادة تسميته
        if (productData.sku) {
          const existingBySku = await getSharedPrismaClient().product.findFirst({
            where: {
              sku: productData.sku,
              companyId,
              deletedAt: null
            }
          });

          if (existingBySku) {
            results.skipped.push({
              product: productData,
              reason: 'منتج بنفس رمز SKU موجود بالفعل',
              existingProduct: existingBySku
            });
            continue;
          }
        }

        // معالجة الفئة
        let categoryId = null;
        if (productData.category && productData.category.trim() !== '') {
          let categoryRecord = await getSharedPrismaClient().category.findFirst({
            where: {
              name: productData.category.trim(),
              companyId
            }
          });

          if (!categoryRecord) {
            categoryRecord = await getSharedPrismaClient().category.create({
              data: {
                name: productData.category.trim(),
                companyId
              }
            });
          }

          categoryId = categoryRecord.id;
        }

        // معالجة الصور
        let processedImages = [];
        if (productData.images && Array.isArray(productData.images)) {
          processedImages = productData.images.filter(img => {
            try {
              const url = new URL(img);
              return url.hostname.includes('easy-orders.net') ||
                url.hostname.includes('files.easy-orders.net');
            } catch {
              return false;
            }
          });
        }

        const resolvedMedia = resolveProductMediaState({
          currentImages: [],
          currentMainImage: null,
          nextImages: processedImages,
        });

        // إنشاء المنتج
        const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          results.failed.push({
            product: productData,
            reason: productLimitCheck.payload.message
          });
          continue;
        }

        // قصّ المخزون غير المنطقي بدلاً من تخزينه
        const bulkStockResult = validateStock(productData.stock);
        const bulkNormalizedStock = bulkStockResult.ok
          ? (parseInt(productData.stock, 10) || 0)
          : 0;

        const product = await getSharedPrismaClient().product.create({
          data: {
            name: productData.name.trim(),
            description: productData.description || '',
            price: parseFloat(productData.price),
            comparePrice: productData.comparePrice ? parseFloat(productData.comparePrice) : null,
            cost: productData.cost ? parseFloat(productData.cost) : null,
            sku: productData.sku || null,
            barcode: productData.barcode || null,
            stock: bulkNormalizedStock,
            trackInventory: productData.trackInventory !== undefined ? Boolean(productData.trackInventory) : true,
            companyId,
            categoryId,
            images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
            mainImage: resolvedMedia.mainImage,
            tags: productData.tags && Array.isArray(productData.tags) ? JSON.stringify(productData.tags) : null,
            weight: productData.weight ? parseFloat(productData.weight) : null,
            dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
            easyOrdersId: productData.easyOrdersId || null,
            easyOrdersUrl: productData.easyOrdersUrl || null,
            source: 'easy-orders'
          }
        });

        results.success.push(product);

      } catch (error) {
        console.error(`❌ [EASY-ORDERS] Error importing product ${productData.name}:`, error);
        results.failed.push({
          product: productData,
          reason: error.message
        });
      }
    }

    console.log(`✅ [EASY-ORDERS] Bulk import completed:`);
    console.log(`   - Success: ${results.success.length}`);
    console.log(`   - Failed: ${results.failed.length}`);
    console.log(`   - Skipped: ${results.skipped.length}`);

    res.status(200).json({
      success: true,
      message: 'تم استيراد المنتجات',
      data: {
        imported: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results
      }
    });

  } catch (error) {
    console.error('❌ [EASY-ORDERS] Error in bulk import:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد المنتجات',
      error: error.message
    });
  }
};

/**
 * مزامنة منتج موجود مع Easy Orders
 * PUT /api/v1/easy-orders/sync-product/:id
 */
const syncProductWithEasyOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { productData } = req.body;

    if (!productData) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المنتج مطلوبة'
      });
    }

    // التحقق من وجود المنتج
    const existingProduct = await getSharedPrismaClient().product.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // تحديث بيانات المنتج
    const updateData = {};

    if (productData.name) updateData.name = productData.name.trim();
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.price) updateData.price = parseFloat(productData.price);
    if (productData.comparePrice !== undefined) updateData.comparePrice = productData.comparePrice ? parseFloat(productData.comparePrice) : null;
    if (productData.cost !== undefined) updateData.cost = productData.cost ? parseFloat(productData.cost) : null;
    if (productData.stock !== undefined) updateData.stock = parseInt(productData.stock);

    // معالجة الصور
    if (productData.images && Array.isArray(productData.images)) {
      const processedImages = productData.images.filter(img => {
        try {
          const url = new URL(img);
          return url.hostname.includes('easy-orders.net') ||
            url.hostname.includes('files.easy-orders.net');
        } catch {
          return false;
        }
      });
      updateData.images = JSON.stringify(processedImages);
    }

    if (productData.easyOrdersUrl) updateData.easyOrdersUrl = productData.easyOrdersUrl;

    const updatedProduct = await getSharedPrismaClient().product.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    console.log(`✅ [EASY-ORDERS] Product synced: ${updatedProduct.name}`);

    res.json({
      success: true,
      message: 'تم مزامنة المنتج بنجاح',
      data: updatedProduct
    });

  } catch (error) {
    console.error('❌ [EASY-ORDERS] Error syncing product:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مزامنة المنتج',
      error: error.message
    });
  }
};

/**
 * جلب المنتجات من Easy Orders API
 * POST /api/v1/easy-orders/fetch-products
 */
const fetchProductsFromEasyOrders = async (req, res) => {
  try {
    console.log('🔍 [EASY-ORDERS] Fetching products from Easy Orders...');

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'مفتاح API مطلوب'
      });
    }

    console.log(`🔑 [EASY-ORDERS] Using API Key: ${apiKey.substring(0, 10)}...`);

    try {
      // Easy Orders API endpoint
      const apiUrl = 'https://api.easy-orders.net/api/v1/external-apps/products';

      const headers = {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      };

      console.log(`📡 [EASY-ORDERS] Fetching from: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        headers,
        timeout: 30000 // 30 seconds timeout
      });

      const products = response.data;

      if (!Array.isArray(products)) {
        return res.status(400).json({
          success: false,
          message: 'تنسيق البيانات غير صحيح من Easy Orders'
        });
      }

      console.log(`✅ [EASY-ORDERS] Found ${products.length} products`);

      // تحويل المنتجات لصيغة موحدة
      const formattedProducts = products.map(product => ({
        name: product.name,
        description: '', // Easy Orders لا يرسل description في هذا الـ endpoint
        price: parseFloat(product.price || 0),
        comparePrice: null,
        cost: null,
        sku: product.slug || null,
        barcode: null,
        stock: parseInt(product.quantity || 0),
        trackInventory: product.track_stock === true,
        images: product.thumb ? [product.thumb] : [],
        category: null,
        tags: [],
        weight: null,
        dimensions: null,
        easyOrdersId: product.id || null,
        easyOrdersUrl: `https://easy-orders.net/products/${product.slug}`,
        isActive: !product.hidden // المنتجات المخفية تكون غير نشطة
      }));

      res.json({
        success: true,
        message: `تم جلب ${formattedProducts.length} منتج من Easy Orders`,
        data: {
          products: formattedProducts,
          count: formattedProducts.length
        }
      });

    } catch (apiError) {
      console.error('❌ [EASY-ORDERS] API Error:', apiError.message);

      // إذا فشل الـ API، نرجع رسالة مفيدة
      return res.status(400).json({
        success: false,
        message: 'فشل الاتصال بـ Easy Orders',
        error: apiError.response?.data?.message || apiError.message,
        hint: 'تأكد من صحة مفتاح API'
      });
    }

  } catch (error) {
    console.error('❌ [EASY-ORDERS] Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
      error: error.message
    });
  }
};

/**
 * استيراد المنتجات المحددة من Easy Orders
 * POST /api/v1/easy-orders/import-selected
 */
const importSelectedProducts = async (req, res) => {
  try {
    console.log('📦 [EASY-ORDERS] Importing selected products...');

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { products, importAll } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'قائمة المنتجات مطلوبة'
      });
    }

    console.log(`📦 [EASY-ORDERS] Importing ${products.length} products...`);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const productData of products) {
      try {
        const { name, price, easyOrdersId } = productData;

        if (!name || !price) {
          results.failed.push({
            product: productData,
            reason: 'اسم المنتج والسعر مطلوبان'
          });
          continue;
        }

        // التحقق من وجود المنتج مسبقاً
        if (easyOrdersId) {
          const existingProduct = await getSharedPrismaClient().product.findFirst({
            where: {
              easyOrdersId: easyOrdersId.toString(),
              companyId
            }
          });

          if (existingProduct) {
            results.skipped.push({
              product: productData,
              reason: 'المنتج موجود بالفعل',
              existingProduct
            });
            continue;
          }
        }

        // التحقق من وجود SKU مكرر — تخطي بدلاً من إعادة تسميته (يمنع توليد مكررات)
        const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          results.failed.push({
            product: productData,
            reason: productLimitCheck.payload.message
          });
          continue;
        }

        let finalSku = productData.sku || null;
        if (productData.sku) {
          const existingProductBySku = await getSharedPrismaClient().product.findFirst({
            where: {
              sku: productData.sku,
              companyId,
              deletedAt: null
            }
          });

          if (existingProductBySku) {
            results.skipped.push({
              product: productData,
              reason: 'منتج بنفس رمز SKU موجود بالفعل',
              existingProduct: existingProductBySku
            });
            continue;
          }
        }

        // معالجة الفئة
        let categoryId = null;
        if (productData.category && productData.category.trim() !== '') {
          let categoryRecord = await getSharedPrismaClient().category.findFirst({
            where: {
              name: productData.category.trim(),
              companyId
            }
          });

          if (!categoryRecord) {
            categoryRecord = await getSharedPrismaClient().category.create({
              data: {
                name: productData.category.trim(),
                companyId
              }
            });
            console.log(`✅ [EASY-ORDERS] Created category: ${productData.category}`);
          }

          categoryId = categoryRecord.id;
        }

        // معالجة الصور
        let processedImages = [];
        if (productData.images && Array.isArray(productData.images)) {
          processedImages = productData.images.filter(img => {
            if (!img) return false;
            try {
              new URL(img);
              return true;
            } catch {
              return false;
            }
          });
        }

        // قصّ المخزون غير المنطقي بدلاً من تخزينه
        const selectedStockResult = validateStock(productData.stock);
        const selectedNormalizedStock = selectedStockResult.ok
          ? (parseInt(productData.stock, 10) || 0)
          : 0;

        // إنشاء المنتج
        const product = await getSharedPrismaClient().product.create({
          data: {
            name: productData.name.trim(),
            description: productData.description || '',
            price: parseFloat(productData.price),
            comparePrice: productData.comparePrice ? parseFloat(productData.comparePrice) : null,
            cost: productData.cost ? parseFloat(productData.cost) : null,
            sku: finalSku || null,
            barcode: productData.barcode || null,
            stock: selectedNormalizedStock,
            trackInventory: productData.trackInventory !== undefined ? Boolean(productData.trackInventory) : true,
            companyId,
            categoryId,
            images: processedImages.length > 0 ? JSON.stringify(processedImages) : null,
            tags: productData.tags && Array.isArray(productData.tags) ? JSON.stringify(productData.tags) : null,
            weight: productData.weight ? parseFloat(productData.weight) : null,
            dimensions: productData.dimensions ? JSON.stringify(productData.dimensions) : null,
            easyOrdersId: productData.easyOrdersId?.toString() || null,
            easyOrdersUrl: productData.easyOrdersUrl || null,
            source: 'easy-orders'
          }
        });

        results.success.push(product);

      } catch (error) {
        console.error(`❌ [EASY-ORDERS] Error importing product ${productData.name}:`, error);
        results.failed.push({
          product: productData,
          reason: error.message
        });
      }
    }

    console.log(`✅ [EASY-ORDERS] Import completed:`);
    console.log(`   - Success: ${results.success.length}`);
    console.log(`   - Failed: ${results.failed.length}`);
    console.log(`   - Skipped: ${results.skipped.length}`);

    res.status(200).json({
      success: true,
      message: 'تم استيراد المنتجات',
      data: {
        imported: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results
      }
    });

  } catch (error) {
    console.error('❌ [EASY-ORDERS] Error in import:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد المنتجات',
      error: error.message
    });
  }
};

/**
 * Get Order Statistics
 * GET /api/v1/orders-new/simple/stats
 */
const getOrderStats = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { dateFrom, dateTo } = req.query;

    // Build date filter
    const dateFilter = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // Get orders with filters
    const orders = await executeWithRetry(async () => {
      return await prisma.order.findMany({
        where: {
          companyId,
          ...(Object.keys(dateFilter).length > 0 && {
            createdAt: dateFilter
          })
        },
        include: {
          orderItems: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total) || 0;
      return sum + orderTotal;
    }, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Status counts
    const statusCounts = {};
    orders.forEach(order => {
      const status = (order.status || 'pending').toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Recent orders (last 10)
    const recentOrders = orders
      .slice(0, 10)
      .map(order => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName || 'غير محدد',
        total: parseFloat(order.total) || 0,
        status: (order.status || 'pending').toLowerCase(),
        createdAt: order.createdAt
      }));

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        statusCounts,
        recentOrders
      }
    });

  } catch (error) {
    console.error('❌ Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات الطلبات',
      error: error.message
    });
  }
};

/**
 * جلب إعدادات Easy Orders
 * GET /api/v1/easy-orders/settings
 */
const getEasyOrdersSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const settings = await getSharedPrismaClient().easyOrdersSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      return res.json({ success: true, data: null, message: 'لا توجد إعدادات محفوظة' });
    }

    res.json({
      success: true,
      data: {
        id: settings.id,
        syncEnabled: settings.syncEnabled,
        syncInterval: settings.syncInterval,
        statusMapping: settings.statusMapping ? JSON.parse(settings.statusMapping) : {},
        lastSyncAt: settings.lastSyncAt,
        lastSyncStatus: settings.lastSyncStatus,
        hasApiKey: !!settings.apiKey
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات', error: error.message });
  }
};

/**
 * حفظ إعدادات Easy Orders
 * POST /api/v1/easy-orders/settings
 */
const saveEasyOrdersSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const { apiKey, syncEnabled, syncInterval, statusMapping } = req.body;

    const data = {
      syncEnabled: syncEnabled !== undefined ? Boolean(syncEnabled) : false,
      syncInterval: parseInt(syncInterval) || 15,
      statusMapping: statusMapping ? JSON.stringify(statusMapping) : null,
      updatedAt: new Date()
    };

    if (apiKey) {
      data.apiKey = apiKey;
    }

    const settings = await getSharedPrismaClient().easyOrdersSettings.upsert({
      where: { companyId },
      update: data,
      create: {
        ...data,
        companyId,
        apiKey: apiKey || ''
      }
    });

    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حفظ الإعدادات', error: error.message });
  }
};

/**
 * تشغيل المزامنة يدوياً
 * POST /api/v1/easy-orders/sync-orders
 */
const fetchAndImportOrders = async (req, res) => {
  const { fetchOrdersFromEasyOrder, importEasyOrdersBatch } = require('../services/easyOrdersImportService');

  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    // 1. Get settings
    const settings = await getSharedPrismaClient().easyOrdersSettings.findUnique({
      where: { companyId }
    });

    if (!settings || !settings.apiKey) {
      return res.status(400).json({ success: false, message: 'يرجى إعداد مفتاح API أولاً' });
    }

    // 2. Start Log
    const log = await getSharedPrismaClient().easyOrdersSyncLog.create({
      data: {
        companyId,
        syncType: 'orders',
        status: 'RUNNING',
        startedAt: new Date(),
        triggeredBy: req.user.id
      }
    });

    try {
      // 3. Fetch from API
      const response = await fetchOrdersFromEasyOrder(settings.apiKey);
      const orders = Array.isArray(response) ? response : (response.data || []);

      // 4. Import Batch
      const stats = await importEasyOrdersBatch(getSharedPrismaClient(), companyId, orders);

      // 5. Update Log
      const completedAt = new Date();
      await getSharedPrismaClient().easyOrdersSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          totalItems: orders.length,
          successCount: stats.imported + stats.updated,
          failedCount: stats.failed,
          skippedCount: stats.skipped,
          completedAt,
          duration: Math.floor((completedAt - log.startedAt) / 1000)
        }
      });

      // 6. Update Settings lastSync
      await getSharedPrismaClient().easyOrdersSettings.update({
        where: { companyId },
        data: {
          lastSyncAt: completedAt,
          lastSyncStatus: 'success',
          lastSyncMessage: `Imported: ${stats.imported}, Updated: ${stats.updated}`
        }
      });

      res.json({
        success: true,
        message: 'تمت المزامنة بنجاح',
        data: stats
      });

    } catch (syncError) {
      await getSharedPrismaClient().easyOrdersSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: syncError.message,
          completedAt: new Date()
        }
      });

      // 🚨 إشعار فوري بفشل مزامنة وتنزيل أوردرات EasyOrders
      try {
        const systemIncidentAlertService = require('../services/systemIncidentAlertService');
        await systemIncidentAlertService.dispatchIncident({
          companyId,
          incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
          title: '⚠️ تعطل مزامنة أوردرات Easy Orders',
          message: `فشلت مزامنة طلبات Easy Orders: ${syncError.message}`,
          severity: systemIncidentAlertService.SEVERITIES.WARNING,
          entityId: log.id,
          url: '/orders'
        });
      } catch (incErr) {
        console.warn('⚠️ [EASY-ORDER] Failed to dispatch incident:', incErr.message);
      }

      throw syncError;
    }

  } catch (error) {
    console.error('❌ [EASY-ORDER-SYNC] Error:', error);
    res.status(500).json({ success: false, message: 'خطأ في المزامنة', error: error.message });
  }
};

/**
 * جلب سجلات المزامنة
 * GET /api/v1/easy-orders/sync-logs
 */
const getSyncLogs = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

    const logs = await getSharedPrismaClient().easyOrdersSyncLog.findMany({
      where: { companyId },
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب السجلات', error: error.message });
  }
};

module.exports = {
  importProductFromEasyOrders,
  importProductsBulk,
  syncProductWithEasyOrders,
  fetchProductsFromEasyOrders,
  importSelectedProducts,
  getOrderStats,
  getEasyOrdersSettings,
  saveEasyOrdersSettings,
  fetchAndImportOrders,
  getSyncLogs
};


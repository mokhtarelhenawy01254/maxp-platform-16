const sharedDatabase = require('../services/sharedDatabase');

/**
 * Bulk Search Controller
 * البحث الجماعي عن الطلبات باستخدام أكواد الطلبات أو أرقام التليفونات
 * يدعم البحث والدمج في جدولي الطلبات المسجلة (Order) وطلبات المتجر/الزائر (GuestOrder)
 * مع ضمان مطابقة شرط الشركة، إزالة التكرار، وتوضيح مصدر الطلب (متجر / مسجل)
 */

const normalizeKey = (val) => String(val || '').trim().toLowerCase();

const getPhoneVariations = (input) => {
    if (!input) return [];
    const rawStr = String(input).trim();
    const toEnglishDigits = (str) => String(str || '')
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));

    const convertedInput = toEnglishDigits(rawStr);
    const clean = convertedInput.replace(/\D/g, '');
    if (!clean) return [rawStr];
    const variations = new Set([clean, convertedInput, rawStr]);

    // Handle 11-digit Egyptian numbers (e.g. 01012345678)
    if (clean.startsWith('0') && clean.length === 11) {
        const withoutZero = clean.slice(1);
        variations.add(withoutZero);
        variations.add('+20' + withoutZero);
        variations.add('20' + withoutZero);
        variations.add('+20 ' + withoutZero);
        // التنسيقات الشائعة ذات المسافات أو الشرطات (المتجر والـ autofill)
        variations.add(`${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`);
        variations.add(`${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`);
        variations.add(`${clean.slice(0, 4)} ${clean.slice(4)}`);
        variations.add(`${clean.slice(0, 4)}-${clean.slice(4, 7)}-${clean.slice(7)}`);
    } else if (clean.startsWith('20') && clean.length === 12) {
        const withoutPrefix = clean.slice(2);
        variations.add(withoutPrefix);
        variations.add('0' + withoutPrefix);
        variations.add('+' + clean);
        variations.add(`0${withoutPrefix.slice(0, 4)} ${withoutPrefix.slice(4, 7)} ${withoutPrefix.slice(7)}`);
        variations.add(`0${withoutPrefix.slice(0, 3)} ${withoutPrefix.slice(3, 7)} ${withoutPrefix.slice(7)}`);
        variations.add(`0${withoutPrefix.slice(0, 4)} ${withoutPrefix.slice(4)}`);
    } else if (clean.startsWith('1') && clean.length === 10) {
        const withZero = '0' + clean;
        variations.add(withZero);
        variations.add('+20' + clean);
        variations.add('20' + clean);
        variations.add(`${withZero.slice(0, 4)} ${withZero.slice(4, 7)} ${withZero.slice(7)}`);
        variations.add(`${withZero.slice(0, 3)} ${withZero.slice(3, 7)} ${withZero.slice(7)}`);
    } else if (clean.length >= 7) {
        if (clean.startsWith('0')) {
            variations.add(clean.slice(1));
        } else {
            variations.add('0' + clean);
        }
    }
    return Array.from(variations);
};

const safeParseJson = (val, fallback = {}) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        } catch (_) {
            return fallback;
        }
    }
    return fallback;
};

const transformGuestOrder = (guestOrder) => {
    let parsedItems = [];
    if (typeof guestOrder.items === 'string') {
        try {
            parsedItems = JSON.parse(guestOrder.items);
        } catch (_) {
            parsedItems = [];
        }
    } else if (Array.isArray(guestOrder.items)) {
        parsedItems = guestOrder.items;
    }

    const orderItems = parsedItems.map((item, idx) => ({
        id: item.id || item.productId || `guest-item-${idx}`,
        productId: item.productId || item.id || '',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.price) || 0) * (Number(item.quantity) || 1),
        product: {
            id: item.productId || item.id || '',
            name: item.name || item.productName || 'منتج غير محدد',
            sku: item.sku || item.productSku || ''
        }
    }));

    const nameParts = String(guestOrder.guestName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const subtotal = Number(guestOrder.total) || 0;
    const shipping = Number(guestOrder.shippingCost) || 0;
    const discount = Number(guestOrder.discountAmount) || 0;
    const finalTotal = guestOrder.finalTotal !== null && guestOrder.finalTotal !== undefined && guestOrder.finalTotal !== ''
        ? Number(guestOrder.finalTotal)
        : Math.max(0, subtotal + shipping - discount);

    return {
        id: guestOrder.id,
        orderNumber: guestOrder.orderNumber,
        customerId: null,
        companyId: guestOrder.companyId,
        customerName: guestOrder.guestName || '',
        customerPhone: guestOrder.guestPhone || '',
        customerEmail: guestOrder.guestEmail || '',
        customer: {
            id: null,
            firstName,
            lastName,
            email: guestOrder.guestEmail || '',
            phone: guestOrder.guestPhone || ''
        },
        orderItems: orderItems,
        items: orderItems,
        status: guestOrder.status ? String(guestOrder.status).toUpperCase() : 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: (guestOrder.paymentMethod || 'CASH').toLowerCase(),
        total: finalTotal,
        subtotal: subtotal,
        shipping: shipping,
        discount: discount,
        tax: 0,
        currency: 'EGP',
        createdAt: guestOrder.createdAt,
        updatedAt: guestOrder.updatedAt,
        sourceType: 'storefront',
        orderSource: 'STOREFRONT',
        extractionMethod: 'storefront',
        isStorefront: true,
        isGuestOrder: true
    };
};

const transformRegularOrder = (order, hasGuestTwin = false) => {
    const metadata = safeParseJson(order.metadata, {});
    const isStorefront = Boolean(
        hasGuestTwin ||
        order.sourceType === 'storefront' ||
        order.orderSource === 'STOREFRONT' ||
        order.extractionMethod === 'storefront' ||
        metadata.source === 'storefront' ||
        metadata.isGuestOrder === true
    );

    return {
        ...order,
        total: Number(order.total) || 0,
        subtotal: order.subtotal ? Number(order.subtotal) || 0 : undefined,
        shipping: order.shipping ? Number(order.shipping) || 0 : undefined,
        discount: order.discount ? Number(order.discount) || 0 : undefined,
        tax: order.tax ? Number(order.tax) || 0 : undefined,
        customerName: order.customerName || (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : ''),
        customerPhone: order.customerPhone || order.customer?.phone || '',
        customerEmail: order.customerEmail || order.customer?.email || '',
        sourceType: isStorefront ? 'storefront' : (order.sourceType || 'manual'),
        orderSource: isStorefront ? 'STOREFRONT' : (order.orderSource || 'REGULAR'),
        isStorefront: isStorefront,
        isGuestOrder: Boolean(metadata.isGuestOrder || hasGuestTwin)
    };
};

const bulkSearchOrders = async (req, res) => {
    try {
        const { searchType, values } = req.body;
        const companyId = req.user?.companyId || req.user?.effectiveCompanyId;

        // Validation
        if (!companyId) {
            return res.status(403).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        if (!searchType || !values || !Array.isArray(values)) {
            return res.status(400).json({
                success: false,
                error: 'searchType and values array are required'
            });
        }

        if (values.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Values array cannot be empty'
            });
        }

        if (values.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 values allowed per search'
            });
        }

        // تنظيف القيم
        const cleanedValues = values
            .map(v => String(v).trim())
            .filter(v => v.length > 0);

        if (cleanedValues.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid values provided after cleaning'
            });
        }

        const prisma = sharedDatabase.getSharedPrismaClient();
        let regularOrders = [];
        let guestOrders = [];

        // تحديد نوع البحث
        if (searchType === 'orderNumber') {
            // بناء استعلام مرن للجدولين: كل قيمة تبحث بـ exact match أو endsWith أو contains
            const orderNumberConditions = cleanedValues.map(v => ({
                OR: [
                    { orderNumber: v },                          // exact match
                    { orderNumber: { endsWith: `-${v}` } },     // مثال: ORD-1793047
                    { orderNumber: { endsWith: v } },            // يغطي أي suffix
                    { orderNumber: { contains: v } },            // fallback عام
                ]
            }));

            [regularOrders, guestOrders] = await Promise.all([
                prisma.order.findMany({
                    where: {
                        companyId: companyId,
                        OR: orderNumberConditions
                    },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        },
                        orderItems: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        sku: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.guestOrder.findMany({
                    where: {
                        companyId: companyId,
                        OR: orderNumberConditions
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })
            ]);

        } else if (searchType === 'phone') {
            // توليد كل احتمالات وتنسيقات أرقام الهواتف (مع الصفر وبدونه وكود الدولة 20/966)
            const allPhoneSearchValues = [...new Set(cleanedValues.flatMap(getPhoneVariations))];

            [regularOrders, guestOrders] = await Promise.all([
                prisma.order.findMany({
                    where: {
                        companyId: companyId,
                        OR: [
                            { customer: { phone: { in: allPhoneSearchValues } } },
                            { customerPhone: { in: allPhoneSearchValues } }
                        ]
                    },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        },
                        orderItems: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        sku: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.guestOrder.findMany({
                    where: {
                        companyId: companyId,
                        guestPhone: {
                            in: allPhoneSearchValues
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })
            ]);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid searchType. Must be "orderNumber" or "phone"'
            });
        }

        // الدمج وإزالة التكرار — الطلب اللي ليه صف في الجدولين يظهر مرة واحدة
        const guestOrderNumbersSet = new Set(
            guestOrders.map(g => normalizeKey(g.orderNumber)).filter(Boolean)
        );

        const regularOrderNumbersSet = new Set();
        const transformedRegularOrders = [];

        for (const order of regularOrders) {
            const key = normalizeKey(order.orderNumber);
            if (key && regularOrderNumbersSet.has(key)) {
                continue; // منع أي تكرار محتمل داخل جدول الطلبات العادية
            }
            if (key) {
                regularOrderNumbersSet.add(key);
            }
            const hasGuestTwin = Boolean(key && guestOrderNumbersSet.has(key));
            transformedRegularOrders.push(transformRegularOrder(order, hasGuestTwin));
        }

        const seenGuestNumbers = new Set();
        const transformedGuestOrders = [];

        for (const guestOrder of guestOrders) {
            const key = normalizeKey(guestOrder.orderNumber);
            // إذا كان للطلب صف في جدول الطلبات المسجلة، لا نكرره (الطلب المسجل يظهر فقط)
            if (key && regularOrderNumbersSet.has(key)) {
                continue;
            }
            if (key && seenGuestNumbers.has(key)) {
                continue;
            }
            if (key) {
                seenGuestNumbers.add(key);
            }
            transformedGuestOrders.push(transformGuestOrder(guestOrder));
        }

        // المصفوفة المدمجة كاملة
        const mergedOrders = [...transformedRegularOrders, ...transformedGuestOrders];
        mergedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // حساب «موجود/مش موجود» على إجمالي المدخلات
        let foundInputValues = [];
        let uniqueMatches = 0;

        if (searchType === 'orderNumber') {
            const dbOrderNumbers = mergedOrders.map(o => normalizeKey(o.orderNumber));

            foundInputValues = cleanedValues.filter(searchVal => {
                const normSearchVal = normalizeKey(searchVal);
                return dbOrderNumbers.some(dbNum =>
                    dbNum === normSearchVal ||
                    dbNum.endsWith(`-${normSearchVal}`) ||
                    dbNum.endsWith(normSearchVal) ||
                    dbNum.includes(normSearchVal)
                );
            });
            uniqueMatches = foundInputValues.length;
        } else if (searchType === 'phone') {
            const extractDigits = (str) => String(str || '')
                .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
                .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776))
                .replace(/\D/g, '');

            const allOrderPhones = mergedOrders.flatMap(o => [
                o.customer?.phone,
                o.customerPhone,
                o.guestPhone
            ]).filter(Boolean);

            const allOrderDigits = allOrderPhones.map(extractDigits).filter(Boolean);

            foundInputValues = cleanedValues.filter(searchVal => {
                const searchDigits = extractDigits(searchVal);
                if (!searchDigits) return false;
                const searchVariations = new Set(getPhoneVariations(searchVal));
                const searchDigitVariations = new Set(Array.from(searchVariations).map(extractDigits).filter(Boolean));

                if (allOrderDigits.includes(searchDigits)) return true;

                for (const dbDigits of allOrderDigits) {
                    if (searchDigitVariations.has(dbDigits)) return true;
                    if (dbDigits.length >= 9 && searchDigits.length >= 9) {
                        if (dbDigits.endsWith(searchDigits) || searchDigits.endsWith(dbDigits)) return true;
                    }
                }

                return allOrderPhones.some(dbPhone => {
                    const dbVariations = getPhoneVariations(dbPhone);
                    return dbVariations.some(v => searchVariations.has(v));
                });
            });
            uniqueMatches = foundInputValues.length;
        }

        const notFoundValues = cleanedValues.filter(v => !foundInputValues.includes(v));

        // إحصائيات محسّنة وشاملة
        const storefrontCount = mergedOrders.filter(o => o.isStorefront).length;
        const stats = {
            total: cleanedValues.length,
            found: uniqueMatches,
            notFound: notFoundValues.length,
            ordersCount: mergedOrders.length,
            storefrontCount: storefrontCount,
            regularCount: mergedOrders.length - storefrontCount,
            searchType: searchType,
            note: searchType === 'phone'
                ? 'found = unique phone numbers matched, ordersCount = total orders'
                : 'found = unique order numbers matched, ordersCount = total orders'
        };

        res.json({
            success: true,
            data: {
                orders: mergedOrders,
                notFoundValues: notFoundValues,
                stats: stats,
                searchType: searchType
            }
        });

    } catch (error) {
        console.error('❌ Error in bulkSearchOrders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to perform bulk search'
        });
    }
};

module.exports = {
    bulkSearchOrders,
    getPhoneVariations,
    transformGuestOrder,
    transformRegularOrder
};

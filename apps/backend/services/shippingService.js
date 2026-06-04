const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const parseStoredGovernorates = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Keep support for legacy plain-text values.
    }

    return [trimmed];
  }

  return [];
};
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Shipping Service for automated reply helpers
 * يوفر معلومات الشحن للردود التلقائية
 */

class ShippingService {
  /**
   * البحث عن معلومات الشحن بناءً على المحافظة
   * @param {string} governorate - اسم المحافظة
   * @param {string} companyId - معرف الشركة
   * @param {Object} options - إعدادات إضافية للسلوك
   * @returns {Object} معلومات الشحن أو null
   */
  async findShippingInfo(governorate, companyId, options = {}) {
    try {
      if (!governorate || !companyId) {
        console.log('⚠️ [SHIPPING] Missing governorate or companyId');
        return null;
      }

      const allowFlatShipping = options?.allowFlatShipping !== false;

      // تنظيف اسم المحافظة
      const normalizedInput = this.normalizeGovernorate(governorate);
      console.log(`🔍 [SHIPPING] البحث عن شحن للمحافظة: "${governorate}" (normalized: "${normalizedInput}")`);

      // جلب إعدادات الترويج للتحقق من الشحن الموحد
      const prisma = getSharedPrismaClient();
      const promoSettings = allowFlatShipping && prisma?.storePromotionSettings?.findUnique
        ? await safeQuery(async () => {
          return await prisma.storePromotionSettings.findUnique({
            where: { companyId }
          });
        }, 3)
        : null;

      if (allowFlatShipping && promoSettings?.flatShippingEnabled) {
        console.log(`🚀 [SHIPPING] الشحن الموحد مفعل: ${promoSettings.flatShippingFee}`);
        return {
          found: true,
          price: parseFloat(promoSettings.flatShippingFee),
          deliveryTime: "1-3 أيام عمل",
          governorate: governorate,
          isFlat: true
        };
      }

      const { resolveShippingQuoteForGovernorate } = require('../controller/shippingZoneController');
      const shippingQuote = await resolveShippingQuoteForGovernorate(companyId, governorate);

      if (shippingQuote?.zoneId) {
        console.log(`✅ [SHIPPING] تم العثور على معلومات الشحن:`, {
          price: shippingQuote.price,
          deliveryTime: shippingQuote.deliveryTime,
          governorate: shippingQuote.governorate
        });

        return {
          found: true,
          zoneId: shippingQuote.zoneId,
          price: parseFloat(shippingQuote.price),
          deliveryTime: shippingQuote.deliveryTime,
          governorate: shippingQuote.governorate || governorate
        };
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على معلومات شحن للمحافظة: ${governorate}`);
      return {
        found: false,
        price: null,
        deliveryTime: null,
        governorate: null
      };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في البحث عن معلومات الشحن:', error);
      return null;
    }
  }

  async getShippingPrice(companyId, governorate, options = {}) {
    const shippingInfo = await this.findShippingInfo(governorate, companyId, options);
    return shippingInfo?.found ? shippingInfo : null;
  }

  /**
   * استخراج اسم المحافظة من رسالة العميل أو المحادثة السابقة
   * @param {string} message - رسالة العميل الحالية
   * @param {string} companyId - معرف الشركة
   * @param {Array} conversationMemory - سجل المحادثة (اختياري)
   * @returns {Object} معلومات المحافظة المستخرجة
   */
  async extractGovernorateFromMessage(message, companyId, conversationMemory = null) {
    try {
      if (!companyId) {
        return { found: false, governorate: null };
      }

      // جلب جميع المحافظات المتاحة
      const zones = await safeQuery(async () => {
        return await getSharedPrismaClient().shippingZone.findMany({
          where: {
            companyId,
            isActive: true
          }
        });
      }, 3);

      // استخراج جميع أسماء المحافظات
      const allGovernorates = [];
      zones.forEach(zone => {
        allGovernorates.push(...parseStoredGovernorates(zone.governorates));
      });
      const uniqueGovernorates = [...new Set(allGovernorates)];

      // ✅ FIX: البحث في الرسالة الحالية أولاً
      if (message && message.trim().length > 0) {
        const normalizedMessage = this.normalizeGovernorate(message);

        for (const gov of uniqueGovernorates) {
          const normalizedGov = this.normalizeGovernorate(gov);
          // ✅ FIX: تحسين المطابقة - البحث عن المحافظة ككلمة كاملة أو جزء من الرسالة
          if (normalizedMessage.includes(normalizedGov) || (normalizedMessage.trim().length >= 3 && normalizedGov.includes(normalizedMessage.trim()))) {
            console.log(`✅ [SHIPPING] تم استخراج المحافظة من الرسالة الحالية: ${gov}`);
            return {
              found: true,
              governorate: gov,
              normalizedGovernorate: normalizedGov,
              source: 'current_message'
            };
          }
        }
      }

      // ✅ FIX: البحث في المحادثة السابقة إذا لم يتم العثور في الرسالة الحالية
      if (conversationMemory && Array.isArray(conversationMemory) && conversationMemory.length > 0) {
        console.log(`🔍 [SHIPPING] البحث في المحادثة السابقة (${conversationMemory.length} رسالة)...`);

        // البحث من الأحدث للأقدم
        for (let i = conversationMemory.length - 1; i >= 0; i--) {
          const msg = conversationMemory[i];
          if (msg && msg.content && typeof msg.content === 'string') {
            const normalizedMsg = this.normalizeGovernorate(msg.content);

            for (const gov of uniqueGovernorates) {
              const normalizedGov = this.normalizeGovernorate(gov);
              // ✅ FIX: تحسين المطابقة - البحث عن المحافظة ككلمة كاملة
              if (normalizedMsg.includes(normalizedGov) || (normalizedMsg.trim().length >= 3 && normalizedGov.includes(normalizedMsg.trim()))) {
                console.log(`✅ [SHIPPING] تم استخراج المحافظة من المحادثة السابقة: ${gov} (من رسالة ${i + 1})`);
                return {
                  found: true,
                  governorate: gov,
                  normalizedGovernorate: normalizedGov,
                  source: 'conversation_memory'
                };
              }
            }
          }
        }
      }

      console.log(`❌ [SHIPPING] لم يتم العثور على محافظة في الرسالة أو المحادثة`);
      return { found: false, governorate: null };
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في استخراج المحافظة:', error);
      return { found: false, governorate: null };
    }
  }

  /**
   * الحصول على قائمة بجميع المحافظات المتاحة
   * @param {string} companyId - معرف الشركة
   * @returns {Array} قائمة المحافظات
   */
  async getAvailableGovernorates(companyId) {
    try {
      const zones = await safeQuery(async () => {
        return await getSharedPrismaClient().shippingZone.findMany({
          where: {
            companyId,
            isActive: true
          }
        });
      }, 3);

      const governorates = [];
      zones.forEach(zone => {
        const storedGovernorates = parseStoredGovernorates(zone.governorates);
        if (storedGovernorates.length > 0) {
          governorates.push({
            name: storedGovernorates[0],
            price: parseFloat(zone.price),
            deliveryTime: zone.deliveryTime
          });
        }
      });

      return governorates;
    } catch (error) {
      console.error('❌ [SHIPPING] خطأ في جلب المحافظات:', error);
      return [];
    }
  }

  /**
   * تنظيف وتوحيد اسم المحافظة
   * @param {string} governorate - اسم المحافظة
   * @returns {string} الاسم المنظف
   */
  normalizeGovernorate(governorate) {
    if (!governorate) return '';

    return governorate
      .trim()
      .toLowerCase()
      .replace(/محافظة/g, '')
      .replace(/محافظه/g, '')
      .replace(/ال/g, '')
      .replace(/أ/g, 'ا')
      .replace(/إ/g, 'ا')
      .replace(/آ/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * فحص إذا كان العميل يسأل عن الشحن
   * @param {string} message - رسالة العميل
   * @returns {boolean}
   */
  isAskingAboutShipping(message) {
    if (!message) return false;

    const shippingKeywords = [
      'شحن',
      'توصيل',
      'مصاريف',
      'كام الشحن',
      'سعر الشحن',
      'تكلفة الشحن',
      'هيوصل امتى',
      'مدة التوصيل',
      'كام يوم',
      'shipping',
      'delivery'
    ];

    const normalizedMessage = message.toLowerCase();
    return shippingKeywords.some(keyword => normalizedMessage.includes(keyword));
  }

  /**
   * بناء رد تلقائي عن الشحن
   * @param {Object} shippingInfo - معلومات الشحن
   * @param {string} governorate - اسم المحافظة
   * @returns {string}
   */
  buildShippingResponse(shippingInfo, governorate) {
    return null;
  }
}

module.exports = new ShippingService();

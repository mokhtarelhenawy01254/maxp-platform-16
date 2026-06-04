/**
 * 🔔 WhatsApp Notification Service
 * خدمة إدارة الإشعارات التلقائية عبر WhatsApp
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
const WhatsAppManager = require('./WhatsAppManager');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 القوالب الافتراضية
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TEMPLATES = {
  // إشعارات الطلبات
  ORDER_CREATED: {
    name: 'تأكيد الطلب التلقائي',
    content: `مرحباً بك {customerName} ✨
    
شكراً لتسوقك معنا! لقد استلمنا طلبك بنجاح وجاري العمل عليه الآن.

📋 تفاصيل الطلب:
------------------------------
🆔 رقم الطلب: {orderNumber}
📅 التاريخ: {orderDate}
📱 الهاتف: {customerPhone}

{orderItems}

🚚 الشحن: {shipping} {currency}
💰 الإجمالي: {total} {currency}
------------------------------

📑 الخطوات القادمة:
1️⃣ سيتم تأكيد البيانات وشحن الطلب في أسرع وقت.
2️⃣ ستصلك رسالة عند خروج الطلب مع المندوب.

🚚 تتبع طلبك من هنا: {trackingLink}

يسعدنا دائماً خدمتك 🙏✨`,
    variables: ['customerName', 'orderNumber', 'orderDate', 'customerPhone', 'orderItems', 'shipping', 'total', 'currency', 'trackingLink'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ],
    footer: "Mokhtar Elhenawy Store"
  },

  ORDER_CONFIRMED: {
    name: 'تأكيد الطلب',
    content: `أهلا بحضرتك نورتينا 🌟

✅ تم تأكيد الطلب

👤 العميل: {customerName}
📱 رقم الهاتف: {customerPhone}
📦 رقم الطلب: {orderNumber}
{orderItems}
💰 الإجمالي: {total} {currency}

🚀 سيتم البدء في التجهيز حالاً`,
    variables: ['customerName', 'customerPhone', 'orderNumber', 'orderItems', 'total', 'currency'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  ORDER_PROCESSING: {
    name: 'الطلب قيد التجهيز',
    content: `مرحباً {customerName} 📦

طلبك رقم #{orderNumber} قيد التجهيز الآن!

سنخبرك عند الشحن.`,
    variables: ['customerName', 'orderNumber'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  ORDER_SHIPPED: {
    name: 'تم شحن الطلب',
    content: `مرحباً {customerName} 🚚

تم شحن طلبك رقم #{orderNumber}!

📍 رقم التتبع: {trackingNumber}

سيصلك خلال {estimatedDays} أيام.`,
    variables: ['customerName', 'orderNumber', 'trackingNumber', 'estimatedDays'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  ORDER_OUT_FOR_DELIVERY: {
    name: 'الطلب في الطريق',
    content: `مرحباً {customerName} 🎉

طلبك رقم #{orderNumber} في الطريق إليك!

📞 سيتواصل معك المندوب قريباً.

يرجى التأكد من توفرك لاستلام الطلب.`,
    variables: ['customerName', 'orderNumber'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  ORDER_DELIVERED: {
    name: 'تم التوصيل',
    content: `مرحباً {customerName} ✅

تم توصيل طلبك رقم #{orderNumber} بنجاح!

نتمنى أن تكون راضياً عن منتجاتنا 😊

شكراً لثقتك بنا! 🙏`,
    variables: ['customerName', 'orderNumber'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  ORDER_CANCELLED: {
    name: 'إلغاء الطلب',
    content: `مرحباً {customerName}

تم إلغاء طلبك رقم #{orderNumber}.

السبب: {reason}

إذا كان لديك أي استفسار، تواصل معنا.`,
    variables: ['customerName', 'orderNumber', 'reason'],
    hasButtons: true,
    buttons: [
      { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
      { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
      { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
    ]
  },

  PAYMENT_REMINDER: {
    name: 'تذكير بالدفع',
    content: `مرحباً {customerName} 👋

لديك طلب معلق رقم #{orderNumber} بقيمة {total} {currency}.

يرجى إتمام الدفع لتأكيد الطلب.

للمساعدة، تواصل معنا.`,
    variables: ['customerName', 'orderNumber', 'total', 'currency']
  },

  // إشعارات المنتجات
  BACK_IN_STOCK: {
    name: 'المنتج متوفر',
    content: `مرحباً {customerName} 🎉

المنتج الذي طلبته متوفر الآن!

📦 {productName}
💰 السعر: {price} {currency}

اطلبه الآن قبل نفاد الكمية!`,
    variables: ['customerName', 'productName', 'price', 'currency']
  },

  PRICE_DROP: {
    name: 'تخفيض السعر',
    content: `مرحباً {customerName} 🔥

خبر سار! تم تخفيض سعر المنتج الذي تابعته:

📦 {productName}
💰 السعر الجديد: {newPrice} {currency}
🏷️ كان: {oldPrice} {currency}

وفر {discount}%! اطلب الآن!`,
    variables: ['customerName', 'productName', 'newPrice', 'oldPrice', 'currency', 'discount']
  },

  // العربة المتروكة
  CART_ABANDONED_1H: {
    name: 'تذكير العربة - ساعة',
    content: `مرحباً {customerName} 👋

لاحظنا أنك تركت منتجات في عربة التسوق!

🛒 لديك {itemCount} منتج بقيمة {total} {currency}

أكمل طلبك الآن قبل نفاد الكمية!`,
    variables: ['customerName', 'itemCount', 'total', 'currency']
  },

  CART_ABANDONED_24H: {
    name: 'تذكير العربة - يوم',
    content: `مرحباً {customerName} 👋

منتجاتك لا تزال في انتظارك! 🛒

لديك {itemCount} منتج بقيمة {total} {currency}

لا تفوت الفرصة، أكمل طلبك الآن!`,
    variables: ['customerName', 'itemCount', 'total', 'currency']
  },

  CART_ABANDONED_WITH_DISCOUNT: {
    name: 'تذكير العربة مع خصم',
    content: `مرحباً {customerName} 🎁

هدية خاصة لك!

خصم {discount}% على عربة التسوق الخاصة بك!

🛒 {itemCount} منتج
💰 السعر بعد الخصم: {discountedTotal} {currency}

استخدم الكود: {couponCode}

العرض ساري لمدة 24 ساعة فقط!`,
    variables: ['customerName', 'itemCount', 'discount', 'discountedTotal', 'currency', 'couponCode']
  },

  // التسويق
  PROMOTIONAL: {
    name: 'عرض ترويجي',
    content: `مرحباً {customerName} 🎉

{promotionTitle}

{promotionDescription}

🏷️ خصم يصل إلى {discount}%

العرض ساري حتى {endDate}

تسوق الآن!`,
    variables: ['customerName', 'promotionTitle', 'promotionDescription', 'discount', 'endDate']
  },

  COUPON_SENT: {
    name: 'كوبون خصم',
    content: `مرحباً {customerName} 🎁

لديك كوبون خصم خاص!

🏷️ الكود: {couponCode}
💰 الخصم: {discount}%
📅 صالح حتى: {expiryDate}

استخدمه في طلبك القادم!`,
    variables: ['customerName', 'couponCode', 'discount', 'expiryDate']
  },

  BIRTHDAY_WISH: {
    name: 'تهنئة عيد ميلاد',
    content: `عيد ميلاد سعيد {customerName}! 🎂🎉

نتمنى لك عاماً سعيداً!

هديتنا لك: خصم {discount}% على طلبك القادم!

🎁 الكود: {couponCode}

كل عام وأنت بخير! 💝`,
    variables: ['customerName', 'discount', 'couponCode']
  },

  REVIEW_REQUEST: {
    name: 'طلب تقييم',
    content: `مرحباً {customerName} 😊

نأمل أنك استمتعت بمنتجاتنا!

نود سماع رأيك في طلبك رقم #{orderNumber}

تقييمك يساعدنا على التحسين 🌟

شكراً لك!`,
    variables: ['customerName', 'orderNumber']
  },

  NEW_SIGNUP_WELCOME: {
    name: 'رسالة ترحيب بعد التسجيل',
    content: `أهلاً {customerName} 👋

تم تسجيلك بنجاح في {companyName}.

نوع التسجيل: {signupTypeLabel}
تاريخ التسجيل: {createdAt}

يسعدنا وجودك معنا، وإذا احتجت أي مساعدة يمكنك التواصل على:
{supportLine}

نتمنى لك تجربة رائعة معنا ✨`,
    variables: ['customerName', 'companyName', 'signupTypeLabel', 'createdAt', 'supportLine']
  },

  NEW_SIGNUP_ADMIN_ALERT: {
    name: 'تنبيه المدير بتسجيل جديد',
    content: `تنبيه تسجيل جديد 🔔

الاسم: {customerName}
الهاتف: {customerPhone}
البريد: {email}
نوع التسجيل: {signupTypeLabel}
الشركة: {companyName}
التاريخ: {createdAt}`,
    variables: ['customerName', 'customerPhone', 'email', 'signupTypeLabel', 'companyName', 'createdAt']
  },

  SUBSCRIPTION_CREATED: {
    name: 'تأكيد إنشاء الاشتراك',
    content: `مرحباً {customerName} ✅

تم تفعيل الاشتراك بنجاح لشركة {companyName}.

الخطة: {planName}
الدورة: {billingCycleLabel}
القيمة: {monthlyFee} {currency}
تاريخ الفاتورة القادمة: {nextBillingDate}
مدة التجربة: {trialDays} يوم

بالتوفيق في رحلتك معنا 🚀`,
    variables: ['customerName', 'companyName', 'planName', 'billingCycleLabel', 'monthlyFee', 'currency', 'nextBillingDate', 'trialDays']
  },

  SUBSCRIPTION_RENEWED: {
    name: 'تجديد الاشتراك',
    content: `مرحباً {customerName} ♻️

تم تجديد الاشتراك الخاص بشركة {companyName}.

الخطة: {planName}
الدورة: {billingCycleLabel}
القيمة: {monthlyFee} {currency}
تاريخ الفاتورة القادمة: {nextBillingDate}

شكراً لاستمرارك معنا 🌟`,
    variables: ['customerName', 'companyName', 'planName', 'billingCycleLabel', 'monthlyFee', 'currency', 'nextBillingDate']
  },

  SUBSCRIPTION_CANCELLED: {
    name: 'إلغاء الاشتراك',
    content: `مرحباً {customerName}

تم تسجيل إلغاء الاشتراك الخاص بشركة {companyName}.

الخطة: {planName}
سبب الإلغاء: {reason}
تاريخ الإيقاف: {endDate}

إذا رغبت في إعادة التفعيل لاحقاً فنحن جاهزون لخدمتك.`,
    variables: ['customerName', 'companyName', 'planName', 'reason', 'endDate']
  },

  NEWSLETTER_SUBSCRIBED: {
    name: 'تأكيد الاشتراك في النشرة',
    content: `مرحباً {customerName} 💌

تم تأكيد اشتراكك في تحديثات {companyName}.

تاريخ الاشتراك: {subscribedAt}

سنرسل لك الأخبار والعروض المهمة أولاً بأول.`,
    variables: ['customerName', 'companyName', 'subscribedAt']
  },

  BENEFIT_GRANTED: {
    name: 'إشعار ميزة جديدة',
    content: `مبروك {customerName} 🎁

تمت إضافة ميزة جديدة لك في {companyName}.

النوع: {benefitTitle}
التفاصيل: {benefitSummary}
الكود: {couponCode}

نتمنى أن تستفيد منها بأفضل شكل ممكن ✨`,
    variables: ['customerName', 'companyName', 'benefitTitle', 'benefitSummary', 'couponCode']
  },

  // الموارد البشرية
  ATTENDANCE_REMINDER: {
    name: 'تذكير الحضور',
    content: `صباح الخير {employeeName} ☀️

تذكير: لا تنسَ تسجيل حضورك اليوم.

⏰ وقت بدء العمل: {startTime}

يوم موفق!`,
    variables: ['employeeName', 'startTime']
  },

  ATTENDANCE_CONFIRMED: {
    name: 'تأكيد الحضور',
    content: `✅ تم تسجيل حضورك بنجاح {employeeName}!

⏰ وقت الحضور: {checkInTime}
📅 التاريخ: {date}

شكراً لالتزامك بالمواعيد! 💚`,
    variables: ['employeeName', 'checkInTime', 'date']
  },

  ATTENDANCE_LATE: {
    name: 'إشعار التأخير',
    content: `مرحباً {employeeName}
    
تم تسجيل تأخير اليوم {date}.

⏰ وقت الحضور: {checkInTime}
📝 مدة التأخير: {lateMinutes} دقيقة
💰 الخصم: {deductionAmount} {currency}

يرجى الالتزام بمواعيد العمل.`,
    variables: ['employeeName', 'date', 'checkInTime', 'lateMinutes', 'deductionAmount', 'currency']
  },

  ATTENDANCE_LATE_WITH_DEDUCTION: {
    name: 'إشعار التأخير مع الخصم',
    content: `⚠️ تم تسجيل تأخير {employeeName}

📅 التاريخ: {date}
⏰ وقت الحضور: {checkInTime}
📝 مدة التأخير: {lateMinutes} دقيقة
💰 الخصم: {deductionAmount} {currency}

يرجى الالتزام بمواعيد العمل لتجنب الخصومات.`,
    variables: ['employeeName', 'date', 'checkInTime', 'lateMinutes', 'deductionAmount', 'currency']
  },

  CHECKOUT_CONFIRMED: {
    name: 'تأكيد الانصراف',
    content: `👋 تم تسجيل انصرافك {employeeName}

⏰ وقت الحضور: {checkInTime}
⏰ وقت الانصراف: {checkOutTime}
📅 التاريخ: {date}
📊 ساعات العمل اليوم: {workHours} ساعة
💰 الخصم: {deductionAmount} {currency}

شكراً لجهودك اليوم! 🙏`,
    variables: ['employeeName', 'checkInTime', 'checkOutTime', 'date', 'workHours', 'deductionAmount', 'currency']
  },

  LEAVE_APPROVED: {
    name: 'الموافقة على الإجازة',
    content: `مرحباً {employeeName} ✅

تمت الموافقة على طلب إجازتك!

📅 من: {startDate}
📅 إلى: {endDate}
📝 النوع: {leaveType}

إجازة سعيدة! 🌴`,
    variables: ['employeeName', 'startDate', 'endDate', 'leaveType']
  },

  LEAVE_REJECTED: {
    name: 'رفض الإجازة',
    content: `مرحباً {employeeName}

للأسف، تم رفض طلب إجازتك.

📅 من: {startDate}
📅 إلى: {endDate}
📝 السبب: {reason}

يمكنك التواصل مع الإدارة للمزيد من التفاصيل.`,
    variables: ['employeeName', 'startDate', 'endDate', 'reason']
  },

  PERMISSION_APPROVED: {
    name: 'الموافقة على الإذن',
    content: `مرحباً {employeeName} ✅

تمت الموافقة على طلب الإذن الخاص بك!

📅 التاريخ: {date}
⏰ من: {startTime}
⏰ إلى: {endTime}
📝 النوع: {permissionType}

يوم موفق!`,
    variables: ['employeeName', 'date', 'startTime', 'endTime', 'permissionType']
  },

  PERMISSION_REJECTED: {
    name: 'رفض الإذن',
    content: `مرحباً {employeeName}

للأسف، تم رفض طلب الإذن الخاص بك.

📅 التاريخ: {date}
📝 النوع: {permissionType}
📝 السبب: {reason}

إذا كان لديك أي استفسار، تواصل مع الإدارة.`,
    variables: ['employeeName', 'date', 'permissionType', 'reason']
  },

  PAYROLL_READY: {
    name: 'الراتب جاهز',
    content: `مرحباً {employeeName} 💰

تم إيداع راتبك لشهر {month}!

💵 المبلغ الصافي: {netSalary} {currency}

شكراً لجهودك! 🙏`,
    variables: ['employeeName', 'month', 'netSalary', 'currency']
  },

  BIRTHDAY_EMPLOYEE: {
    name: 'عيد ميلاد موظف',
    content: `عيد ميلاد سعيد {employeeName}! 🎂🎉

نتمنى لك عاماً مليئاً بالنجاح والسعادة!

فريق العمل يتمنى لك كل التوفيق! 💝

كل عام وأنت بخير!`,
    variables: ['employeeName']
  },

  WARNING_ISSUED: {
    name: 'إنذار',
    content: `مرحباً {employeeName}

تم إصدار إنذار بتاريخ {date}.

📝 السبب: {reason}
⚠️ النوع: {warningType}

يرجى مراجعة الإدارة.`,
    variables: ['employeeName', 'date', 'reason', 'warningType']
  },

  ANNOUNCEMENT: {
    name: 'إعلان',
    content: `📢 إعلان هام

{title}

{content}

{signature}`,
    variables: ['title', 'content', 'signature']
  },

  OTP: {
    name: 'كود الواتساب لتسجيل الدخول',
    content: `كود الواتساب لتسجيل الدخول: {otpCode}`,
    variables: ['otpCode']
  },

  ASSET_REQUEST_APPROVED: {
    name: 'الموافقة على طلب عهدة',
    content: `مرحباً {employeeName} ✅
    
تمت الموافقة على طلبك للحصول على: {assetType}

سيقوم فريق الدعم بتجهيز الأصل لك في أقرب وقت.

شكراً لك!`,
    variables: ['employeeName', 'assetType']
  },

  ASSET_REQUEST_REJECTED: {
    name: 'رفض طلب عهدة',
    content: `مرحباً {employeeName} ❌
    
نأسف، تم رفض طلبك للحصول على: {assetType}

السبب: {reason}

يمكنك التواصل مع الإدارة للمزيد من التفاصيل.`,
    variables: ['employeeName', 'assetType', 'reason']
  },

  ASSET_REQUEST_FULFILLED: {
    name: 'تسليم عهدة',
    content: `مرحباً {employeeName} 📦
    
تم تسليمك العهدة التالية بنجاح:
✅ {assetName}

يرجى مراجعة تفاصيل العهدة في لوحة التحكم الخاصة بك.

يوم موفق!`,
    variables: ['employeeName', 'assetName']
  },

  // الولاء
  LOYALTY_POINTS_AWARDED: {
    name: 'إشعار كسب نقاط',
    content: `مبروك {customerName}! 🎉

لقد حصلت على {points} نقطة ولاء جديدة! 🌟

💰 رصيدك الحالي: {currentPoints} نقطة
📝 السبب: {reason}

شكراً لولائك الدائم لنا! ❤️`,
    variables: ['customerName', 'points', 'currentPoints', 'reason']
  },

  // السلف
  LOAN_REQUEST_CREATED: {
    name: 'طلب سلفة جديد',
    content: `مرحباً {employeeName} 👋
    
تم استلام طلب السلفة الخاص بك.

💰 المبلغ: {amount} {currency}
📝 السبب: {reason}

سيتم مراجعته قريباً.`,
    variables: ['employeeName', 'amount', 'currency', 'reason']
  },

  LOAN_APPROVED: {
    name: 'الموافقة على السلفة',
    content: `مرحباً {employeeName} ✅

تمت الموافقة على طلب السلفة الخاص بك!

💰 المبلغ: {amount} {currency}
📅 عدد الأقساط: {installmentsCount}

سيتم صرف المبلغ قريباً.`,
    variables: ['employeeName', 'amount', 'currency', 'installmentsCount']
  },

  LOAN_REJECTED: {
    name: 'رفض السلفة',
    content: `مرحباً {employeeName}

نأسف، تم رفض طلب السلفة الخاص بك.

💰 المبلغ: {amount} {currency}
📝 السبب: {reason}

يمكنك التواصل مع الإدارة للمزيد من التفاصيل.`,
    variables: ['employeeName', 'amount', 'currency', 'reason']
  },

  // المكافآت
  BONUS_ISSUED: {
    name: 'صرف مكافأة',
    content: `مبروك {employeeName}! 🎉

تم صرف مكافأة لك!

💰 المبلغ: {amount} {currency}
📝 السبب: {reason}
📅 التاريخ: {date}

شكراً لجهودك وعملكم المميز! 🌟`,
    variables: ['employeeName', 'amount', 'currency', 'reason', 'date']
  },

  // الاستقالات
  RESIGNATION_STATUS_UPDATE: {
    name: 'تحديث حالة الاستقالة',
    content: `مرحباً {employeeName}

تم تحديث حالة طلب الاستقالة الخاص بك.

📝 الحالة الجديدة: {status}
📅 تاريخ آخر يوم عمل: {lastWorkingDay}

يرجى مراجعة قسم الموارد البشرية للمزيد من التفاصيل.`,
    variables: ['employeeName', 'status', 'lastWorkingDay']
  },

  MANUAL_DEDUCTION: {
    name: 'إشعار خصم يدوي',
    content: `مرحباً {employeeName} ⚠️
    
تم تسجيل خصم جديد بحسابك.

📅 التاريخ: {date}
📝 النوع: {deductionType}
💰 المبلغ: {amount} {currency}
📝 السبب: {reason}

يرجى مراجعة الإدارة في حال وجود أي استفسار.`,
    variables: ['employeeName', 'date', 'deductionType', 'amount', 'currency', 'reason']
  },

  // المهام (Tasks)
  TASK_CREATED: {
    name: 'مهمة جديدة',
    content: `مرحباً {userName} 👋
    
تم إسناد مهمة جديدة لك:
📌 العنوان: {taskTitle}
📅 تاريخ الاستحقاق: {dueDate}
🚀 الأولوية: {priority}

يرجى مراجعة التفاصيل في لوحة التحكم.`,
    variables: ['userName', 'taskTitle', 'dueDate', 'priority']
  },

  TASK_COMMENTED: {
    name: 'تعليق جديد على مهمة',
    content: `مرحباً {userName} 💬
    
تم إضافة تعليق جديد على المهمة: {taskTitle}
👤 بواسطة: {commentAuthor}
📝 التعليق: {commentExcerpt}

يمكنك الرد من خلال الموقع.`,
    variables: ['userName', 'taskTitle', 'commentAuthor', 'commentExcerpt']
  },

  TASK_STATUS_CHANGED: {
    name: 'تغيير حالة المهمة',
    content: `مرحباً {userName} 🔄
    
تم تحديث حالة المهمة: {taskTitle}
📉 الحالة السابقة: {oldStatus}
📈 الحالة الجديدة: {newStatus}

بالتوفيق!`,
    variables: ['userName', 'taskTitle', 'oldStatus', 'newStatus']
  },

  TASK_DEADLINE_REMINDER: {
    name: 'تذكير بموعد المهمة',
    content: `تنبيه {userName} ⏰
    
تقترب مهمة "{taskTitle}" من موعد استحقاقها.
📅 الموعد: {dueDate}

يرجى العمل على إنهائها في الموعد المحدد.`,
    variables: ['userName', 'taskTitle', 'dueDate']
  },

  TASK_UPDATED: {
    name: 'تحديث مهمة',
    content: `مرحباً {userName} 🔔

تم تحديث المهمة: {taskTitle}
📝 التغيير: {changes}
📅 موعد التسليم: {dueDate}
📌 الحالة: {status}

يرجى مراجعة التفاصيل في لوحة التحكم.`,
    variables: ['userName', 'taskTitle', 'changes', 'dueDate', 'status']
  },

  TASK_ATTACHMENT_ADDED: {
    name: 'مرفق جديد على مهمة',
    content: `مرحباً {userName} 📎

تم إضافة مرفق جديد على المهمة: {taskTitle}
📄 الملف: {attachmentName}

يمكنك مراجعته من تفاصيل المهمة.`,
    variables: ['userName', 'taskTitle', 'attachmentName']
  },

  TASK_OVERDUE: {
    name: 'مهمة متأخرة',
    content: `تنبيه {userName} ⚠️

المهمة "{taskTitle}" متأخرة عن موعدها.
📅 الموعد: {dueDate}
📌 الحالة الحالية: {status}

تم إرسال متابعة للمنفذ لمعرفة موقف التنفيذ.`,
    variables: ['userName', 'taskTitle', 'dueDate', 'status']
  },

  TASK_EXECUTION_CHECK: {
    name: 'سؤال متابعة تنفيذ مهمة',
    content: `مرحباً {userName}

هل تم تنفيذ المهمة التالية؟
📌 المهمة: {taskTitle}
📅 موعد التسليم: {dueDate}
📍 السبب: {reason}

اختر الرد المناسب من الأزرار.`,
    variables: ['userName', 'taskTitle', 'dueDate', 'reason'],
    hasButtons: true,
    buttons: [
      { id: 'task_done_{taskId}', text: 'تم التنفيذ' },
      { id: 'task_not_done_{taskId}', text: 'لم يتم بعد' },
      { id: 'task_blocked_{taskId}', text: 'توجد مشكلة' }
    ],
    footer: 'متابعة المهام'
  },

  TASK_EXECUTION_CHECK_SENT: {
    name: 'تم إرسال سؤال متابعة للمنفذ',
    content: `مرحباً {userName}

تم سؤال منفذ المهمة عن موقف التنفيذ.
📌 المهمة: {taskTitle}
👤 المنفذ: {assigneeName}
📍 السبب: {reason}

سنرسل لك رد المنفذ عند وصوله.`,
    variables: ['userName', 'taskTitle', 'assigneeName', 'reason']
  },

  TASK_EXECUTION_RESPONSE: {
    name: 'رد منفذ المهمة',
    content: `مرحباً {userName}

وصل رد على متابعة المهمة:
📌 المهمة: {taskTitle}
👤 المنفذ: {responderName}
✅ الرد: {response}
🔄 الحالة: {oldStatus} ← {newStatus}

تم تسجيل الرد في سجل المهمة.`,
    variables: ['userName', 'taskTitle', 'responderName', 'response', 'oldStatus', 'newStatus']
  },

  TASK_WATCHER_ADDED: {
    name: 'متابعة مهمة',
    content: `مرحباً {userName}

تمت إضافتك كمراقب على المهمة:
📌 {taskTitle}
📅 موعد التسليم: {dueDate}

ستصلك التحديثات المهمة الخاصة بها.`,
    variables: ['userName', 'taskTitle', 'dueDate']
  },

  TASK_DELETED: {
    name: 'حذف مهمة',
    content: `مرحباً {userName}

تم حذف المهمة: {taskTitle}

هذا إشعار للمتابعة فقط.`,
    variables: ['userName', 'taskTitle']
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 الدوال المساعدة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استبدال المتغيرات في القالب
 */
function replaceVariables(template, variables) {
  if (!template) return '';
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\{?\\{${escapedKey}\\}\\}?`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? value : '');
  }
  return result;
}

/**
 * التحقق من ساعات الهدوء
 */
function isQuietHours(settings) {
  if (!settings?.quietHoursEnabled || !settings?.quietHoursStart || !settings?.quietHoursEnd) return false;

  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    if (isNaN(startHour) || isNaN(endHour)) return false;

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      // ساعات الهدوء تمتد لليوم التالي (مثل 22:00 - 08:00)
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  } catch (err) {
    console.error('Error calculating quiet hours:', err);
    return false;
  }
}

/**
 * تنسيق رقم الهاتف
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;

  // إزالة كل شيء ما عدا الأرقام
  let cleaned = phone.replace(/\D/g, '');

  // إذا كان الرقم يبدأ بـ 0 وليس 00، نفترض أنه رقم محلي مصري ونضيف 20
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // حالة أرقام مصر (010...) بدون الصفر
    cleaned = '20' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('2')) {
    // افتراض رقم محلي بدون كود الدولة (مصر)
    cleaned = '20' + cleaned;
  }

  return cleaned;
}

const COMPANY_OWNER_ROLES = ['OWNER', 'COMPANY_ADMIN'];
const COMPANY_OPERATIONS_ROLES = ['MANAGER', 'ADMIN'];
const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'];
const ADMIN_RECIPIENT_ROUTING_MODES = {
  AUTO: 'AUTO',
  MANUAL_ONLY: 'MANUAL_ONLY',
  MANUAL_PLUS_AUTO: 'MANUAL_PLUS_AUTO'
};
const COMPANY_LIFECYCLE_EVENT_TYPES = new Set([
  'NEW_SIGNUP_WELCOME',
  'NEW_SIGNUP_ADMIN_ALERT',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CANCELLED',
  'NEWSLETTER_SUBSCRIBED',
  'BENEFIT_GRANTED'
]);
const PERSISTED_EVENT_TYPE_FALLBACKS = {
  TASK_CREATED: 'ANNOUNCEMENT',
  TASK_COMMENTED: 'ANNOUNCEMENT',
  TASK_STATUS_CHANGED: 'ANNOUNCEMENT',
  TASK_DEADLINE_REMINDER: 'ANNOUNCEMENT'
};
const PERSISTED_CATEGORY_FALLBACKS = {
  TASKS: 'HR'
};
const VALID_PERSISTED_RECIPIENT_TYPES = new Set(['CUSTOMER', 'EMPLOYEE', 'ADMIN']);

let platformSenderCompanyCache = {
  value: null,
  expiresAt: 0
};

function formatNotificationDate(value) {
  if (!value) return '';

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return '';
  }

  return dateValue.toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function getPersistedNotificationEventType(eventType) {
  if (String(eventType || '').toUpperCase().startsWith('TASK_')) {
    return 'ANNOUNCEMENT';
  }

  return PERSISTED_EVENT_TYPE_FALLBACKS[eventType] || eventType;
}

function getPersistedNotificationCategory(category, eventType) {
  const normalizedCategory = String(category || '').toUpperCase();
  if (PERSISTED_CATEGORY_FALLBACKS[normalizedCategory]) {
    return PERSISTED_CATEGORY_FALLBACKS[normalizedCategory];
  }

  if (normalizedCategory) {
    return normalizedCategory;
  }

  if (String(eventType || '').toUpperCase().startsWith('TASK_')) {
    return 'HR';
  }

  return 'GENERAL';
}

function getPersistedNotificationRecipientType(recipientType) {
  const normalizedRecipientType = String(recipientType || 'CUSTOMER').toUpperCase();
  return VALID_PERSISTED_RECIPIENT_TYPES.has(normalizedRecipientType)
    ? normalizedRecipientType
    : 'CUSTOMER';
}

function formatPlanLabel(plan) {
  const normalizedPlan = String(plan || '').toUpperCase();
  if (normalizedPlan === 'ENTERPRISE') return 'Enterprise';
  if (normalizedPlan === 'PRO') return 'Pro';
  if (normalizedPlan === 'BASIC') return 'Basic';
  return normalizedPlan || 'الخطة الحالية';
}

function formatBillingCycleLabel(billingCycle) {
  const normalizedCycle = String(billingCycle || '').toLowerCase();
  if (normalizedCycle === 'yearly') return 'سنوي';
  if (normalizedCycle === 'quarterly') return 'ربع سنوي';
  if (normalizedCycle === 'weekly') return 'أسبوعي';
  return 'شهري';
}

function formatSignupTypeLabel(signupType) {
  const labels = {
    platform_signup: 'تسجيل منصة جديد',
    storefront_customer: 'تسجيل عميل جديد',
    landing_lead: 'تسجيل Lead جديد',
    membership_member: 'تسجيل عضوية جديدة',
    newsletter: 'اشتراك نشرة إخبارية'
  };

  return labels[signupType] || 'تسجيل جديد';
}

function buildDisplayName({ firstName, lastName, fallback = 'عميلنا العزيز' }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
}

function summarizeNotificationResults(results, recipients) {
  const normalizedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        ...result.value,
        recipient: recipients[index]
      };
    }

    return {
      success: false,
      reason: 'error',
      error: result.reason?.message || String(result.reason),
      recipient: recipients[index]
    };
  });

  return {
    success: normalizedResults.some((item) => item?.success),
    results: normalizedResults
  };
}

function dedupeRecipients(recipients = []) {
  const seen = new Set();

  return recipients.reduce((accumulator, recipient) => {
    const formattedPhone = formatPhoneNumber(recipient?.phone);
    if (!formattedPhone || seen.has(formattedPhone)) {
      return accumulator;
    }

    seen.add(formattedPhone);
    accumulator.push({
      ...recipient,
      phone: formattedPhone,
      name: recipient?.name || recipient?.email || formattedPhone
    });

    return accumulator;
  }, []);
}

function normalizeAdminRoutingMode(mode) {
  if (!mode || typeof mode !== 'string') {
    return ADMIN_RECIPIENT_ROUTING_MODES.AUTO;
  }

  const upperMode = mode.toUpperCase();
  return Object.values(ADMIN_RECIPIENT_ROUTING_MODES).includes(upperMode)
    ? upperMode
    : ADMIN_RECIPIENT_ROUTING_MODES.AUTO;
}

function parseConfiguredRecipientPhones(value, fallbackRole = 'ADMIN') {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const rawPhones = value
    .split(/[\r\n,;،]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return dedupeRecipients(
    rawPhones.map((phone, index) => ({
      phone,
      name: `Manual recipient ${index + 1}`,
      role: fallbackRole
    }))
  );
}

function mergeRecipientsByRoutingMode({
  autoRecipients = [],
  manualRecipients = [],
  routingMode = ADMIN_RECIPIENT_ROUTING_MODES.AUTO
}) {
  switch (normalizeAdminRoutingMode(routingMode)) {
    case ADMIN_RECIPIENT_ROUTING_MODES.MANUAL_ONLY:
      return manualRecipients;
    case ADMIN_RECIPIENT_ROUTING_MODES.MANUAL_PLUS_AUTO:
      return dedupeRecipients([...manualRecipients, ...autoRecipients]);
    case ADMIN_RECIPIENT_ROUTING_MODES.AUTO:
    default:
      return manualRecipients.length > 0 ? manualRecipients : autoRecipients;
  }
}

function getEventSettingKey(eventType) {
  return eventType.toLowerCase().replace(/_([a-z])/g, (match) => match[1].toUpperCase()) + 'Enabled';
}

function getModuleSettingKey(eventType) {
  if (COMPANY_LIFECYCLE_EVENT_TYPES.has(eventType)) {
    return 'companyLifecycleNotificationsEnabled';
  }

  if (eventType.startsWith('ORDER_') || eventType === 'PAYMENT_REMINDER') {
    return 'orderNotificationsEnabled';
  }

  if (
    eventType === 'BACK_IN_STOCK' ||
    eventType === 'PRICE_DROP' ||
    eventType === 'NEW_PRODUCT' ||
    eventType === 'REVIEW_REQUEST'
  ) {
    return 'productNotificationsEnabled';
  }

  if (
    eventType.startsWith('CART_') ||
    eventType === 'PROMOTIONAL' ||
    eventType === 'COUPON_SENT' ||
    eventType === 'BIRTHDAY_WISH' ||
    eventType === 'LOYALTY_POINTS_AWARDED'
  ) {
    return 'marketingNotificationsEnabled';
  }

  if (
    eventType.startsWith('ATTENDANCE_') ||
    eventType.startsWith('LEAVE_') ||
    eventType.startsWith('PERMISSION_') ||
    eventType === 'CHECKOUT_CONFIRMED' ||
    eventType === 'PAYROLL_READY' ||
    eventType === 'BIRTHDAY_EMPLOYEE' ||
    eventType === 'WARNING_ISSUED' ||
    eventType === 'MANUAL_DEDUCTION'
  ) {
    return 'hrNotificationsEnabled';
  }

  return null;
}

function isEventEnabledForSettings(settings, eventType) {
  if (!settings?.isEnabled) {
    return { enabled: false, reason: 'notifications_disabled' };
  }

  const moduleSettingKey = getModuleSettingKey(eventType);
  if (moduleSettingKey && settings[moduleSettingKey] === false) {
    return { enabled: false, reason: 'module_disabled', settingKey: moduleSettingKey };
  }

  const eventSettingKey = getEventSettingKey(eventType);
  if (Object.prototype.hasOwnProperty.call(settings, eventSettingKey) && settings[eventSettingKey] === false) {
    return { enabled: false, reason: 'event_type_disabled', settingKey: eventSettingKey };
  }

  return { enabled: true, reason: null, settingKey: eventSettingKey };
}

async function resolveCompanyContext(companyId) {
  if (!companyId) return null;

  return safeQuery(() =>
    getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        slug: true
      }
    })
  );
}

function mapUserRecipient(user, fallbackRole) {
  return {
    phone: user?.phone,
    name: buildDisplayName(user),
    email: user?.email,
    role: fallbackRole || user?.role || 'ADMIN'
  };
}

async function collectCompanyRecipientsByRoles(companyId, roles = []) {
  const prisma = getSharedPrismaClient();

  const [directUsers, memberships] = await Promise.all([
    safeQuery(() =>
      prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: roles }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true
        }
      })
    ),
    safeQuery(() =>
      prisma.userCompany.findMany({
        where: {
          companyId,
          isActive: true,
          role: { in: roles }
        },
        select: {
          role: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      })
    )
  ]);

  const recipients = [];

  for (const user of directUsers || []) {
    recipients.push(mapUserRecipient(user, user.role));
  }

  for (const membership of memberships || []) {
    if (!membership?.user?.isActive) continue;
    recipients.push(mapUserRecipient(membership.user, membership.role || membership.user.role));
  }

  return dedupeRecipients(recipients);
}

async function resolveCompanyOwnerRecipients(companyId) {
  const [company, ownerRecipients] = await Promise.all([
    resolveCompanyContext(companyId),
    collectCompanyRecipientsByRoles(companyId, COMPANY_OWNER_ROLES)
  ]);

  return {
    company,
    recipients: ownerRecipients
  };
}

async function resolveCompanyLeadershipRecipients(companyId) {
  const ownerResult = await resolveCompanyOwnerRecipients(companyId);
  if (ownerResult.recipients.length > 0) {
    return ownerResult;
  }

  return {
    company: ownerResult.company,
    recipients: await collectCompanyRecipientsByRoles(companyId, COMPANY_OPERATIONS_ROLES)
  };
}

async function resolveCompanyAdminRecipients(companyId) {
  return resolveCompanyLeadershipRecipients(companyId);
}

async function resolveSuperAdminRecipients() {
  const prisma = getSharedPrismaClient();

  const [directUsers, memberships] = await Promise.all([
    safeQuery(() =>
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: SUPER_ADMIN_ROLES }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true
        }
      })
    ),
    safeQuery(() =>
      prisma.userCompany.findMany({
        where: {
          isActive: true,
          role: 'SUPER_ADMIN'
        },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          }
        }
      })
    )
  ]);

  const recipients = [];

  for (const user of directUsers || []) {
    recipients.push({
      phone: user.phone,
      name: buildDisplayName(user),
      email: user.email,
      role: user.role || 'SUPER_ADMIN'
    });
  }

  for (const membership of memberships || []) {
    if (!membership?.user?.isActive) continue;
    recipients.push({
      phone: membership.user.phone,
      name: buildDisplayName(membership.user),
      email: membership.user.email,
      role: membership.user.role || 'SUPER_ADMIN'
    });
  }

  return dedupeRecipients(recipients);
}

async function resolveRecipientSettingsCompanyId(companyId, audience = 'company-admins') {
  if (audience === 'super-admins') {
    return (await resolvePlatformSenderCompanyId()) || companyId;
  }

  return companyId;
}

async function loadManualAdminRecipients(companyId, audience = 'company-admins') {
  const recipientSettingsCompanyId = await resolveRecipientSettingsCompanyId(companyId, audience);
  if (!recipientSettingsCompanyId) {
    return {
      recipientSettingsCompanyId: null,
      recipientSettings: null,
      manualRecipients: [],
      routingMode: ADMIN_RECIPIENT_ROUTING_MODES.AUTO
    };
  }

  const recipientSettings = await ensureNotificationSettings(recipientSettingsCompanyId);
  return {
    recipientSettingsCompanyId,
    recipientSettings,
    manualRecipients: parseConfiguredRecipientPhones(
      recipientSettings?.companyLifecycleAdminPhones,
      audience === 'super-admins' ? 'SUPER_ADMIN' : 'ADMIN'
    ),
    routingMode: normalizeAdminRoutingMode(
      recipientSettings?.companyLifecycleAdminRoutingMode
    )
  };
}

async function resolveAudienceRecipients(companyId, audience = 'company-admins') {
  const manualConfig = await loadManualAdminRecipients(companyId, audience);

  if (audience === 'super-admins') {
    return {
      company: await resolveCompanyContext(companyId),
      recipients: mergeRecipientsByRoutingMode({
        autoRecipients: await resolveSuperAdminRecipients(),
        manualRecipients: manualConfig.manualRecipients,
        routingMode: manualConfig.routingMode
      }),
      recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
    };
  }

  if (audience === 'company-owners') {
    return resolveCompanyOwnerRecipients(companyId);
  }

  const companyResult = await resolveCompanyLeadershipRecipients(companyId);
  let autoRecipients = companyResult.recipients;

  if (audience === 'company-or-super-admins' && autoRecipients.length === 0) {
    autoRecipients = await resolveSuperAdminRecipients();
  }

  const recipients = mergeRecipientsByRoutingMode({
    autoRecipients,
    manualRecipients: manualConfig.manualRecipients,
    routingMode: manualConfig.routingMode
  });

  if (audience === 'company-or-super-admins' && recipients.length === 0) {
    return {
      company: companyResult.company,
      recipients: await resolveSuperAdminRecipients(),
      recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
    };
  }

  return {
    company: companyResult.company,
    recipients,
    recipientSettingsCompanyId: manualConfig.recipientSettingsCompanyId
  };
}

async function hasConnectedSessionForCompany(companyId) {
  if (!companyId) return false;

  const memorySessions = (WhatsAppManager.getCompanySessions(companyId) || []).filter(
    (session) => session.status === 'connected'
  );

  if (memorySessions.length > 0) {
    return true;
  }

  const connectedSession = await safeQuery(() =>
    getSharedPrismaClient().whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED'
      },
      select: { id: true }
    })
  );

  return Boolean(connectedSession?.id);
}

async function resolvePlatformSenderCompanyId() {
  const now = Date.now();
  if (platformSenderCompanyCache.expiresAt > now) {
    return platformSenderCompanyCache.value;
  }

  const prisma = getSharedPrismaClient();
  const envCompanyId =
    process.env.WHATSAPP_PLATFORM_SENDER_COMPANY_ID ||
    process.env.PLATFORM_COMPANY_ID ||
    '';
  const slugCandidates = [
    process.env.WHATSAPP_PLATFORM_SENDER_COMPANY_SLUG,
    process.env.PLATFORM_COMPANY_SLUG,
    'maxp'
  ].filter(Boolean);

  let company = null;

  if (envCompanyId) {
    company = await safeQuery(() =>
      prisma.company.findFirst({
        where: {
          id: envCompanyId,
          isActive: true
        },
        select: { id: true }
      })
    );
  }

  if (!company && slugCandidates.length > 0) {
    company = await safeQuery(() =>
      prisma.company.findFirst({
        where: {
          slug: { in: slugCandidates },
          isActive: true
        },
        select: { id: true }
      })
    );
  }

  platformSenderCompanyCache = {
    value: company?.id || null,
    expiresAt: now + 5 * 60 * 1000
  };

  return platformSenderCompanyCache.value;
}

async function resolveDeliveryCompanyId(targetCompanyId, strategy = 'company') {
  if (!targetCompanyId || strategy === 'company') {
    return targetCompanyId;
  }

  const platformCompanyId = await resolvePlatformSenderCompanyId();
  if (!platformCompanyId) {
    return targetCompanyId;
  }

  if (strategy === 'platform-only') {
    return platformCompanyId;
  }

  const targetHasConnectedSession = await hasConnectedSessionForCompany(targetCompanyId);
  return targetHasConnectedSession ? targetCompanyId : platformCompanyId;
}

async function fanOutNotification(recipients, buildOptions) {
  if (!recipients.length) {
    return { success: false, reason: 'no_recipients', results: [] };
  }

  const results = await Promise.allSettled(
    recipients.map((recipient) => sendNotification(buildOptions(recipient)))
  );

  return summarizeNotificationResults(results, recipients);
}

function buildSignupAdminAlertContent(variables) {
  return `تنبيه تسجيل جديد 🔔

الاسم: {customerName}
الهاتف: {customerPhone}
البريد: {email}
نوع التسجيل: {signupTypeLabel}
الشركة: {companyName}
التاريخ: {createdAt}`;
}

function buildNewsletterAdminAlertContent() {
  return `اشتراك جديد في النشرة 💌

الاسم: {customerName}
الهاتف: {customerPhone}
البريد: {email}
الشركة: {companyName}
المصدر: {sourceLabel}
التاريخ: {subscribedAt}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 دوال الإرسال
// ═══════════════════════════════════════════════════════════════════════════════

// تتبع الدوران (Round Robin) للجلسات لكل شركة لـ موازنة الحمل (Load Balancing)
const sessionRotation = new Map();
const SESSION_ROTATION_MAX_SIZE = 5000;
function setSessionRotation(companyId, index) {
  if (sessionRotation.size >= SESSION_ROTATION_MAX_SIZE && !sessionRotation.has(companyId)) {
    const oldestKey = sessionRotation.keys().next().value;
    sessionRotation.delete(oldestKey);
  }
  sessionRotation.set(companyId, index);
}

const sessionInitializationInFlight = new Map();
const settingsInitializationInFlight = new Map();

/**
 * الحصول على الجلسة المناسبة للإرسال (Sticky Load Balancer)
 * تعتمد على تثبيت العميل مع رقم واتس محدد لضمان استمرارية المحادثة من نفس الرقم
 */
async function getOrAssignSession({ companyId, customerId, recipientPhone, connectedSessions, settings }) {
  const prisma = getSharedPrismaClient();

  if (!connectedSessions || connectedSessions.length === 0) {
    return settings?.defaultSessionId || null;
  }

  // 1. البحث عن جلسة مثبتة (Sticky Session Affinity)
  // نطبق هذا المنطق فقط إذا كان الخيار مفعلاً في الإعدادات
  if (settings?.stickySessionEnabled !== false) {
    const connectedSessionIds = connectedSessions.map(s => s.sessionId);

    try {
      let existingSessionId = null;

      if (customerId) {
        const contact = await safeQuery(() => prisma.whatsAppContact.findFirst({
          where: {
            customerId,
            sessionId: { in: connectedSessionIds }
          },
          orderBy: { lastMessageAt: 'desc' },
          select: { sessionId: true }
        }));
        if (contact) existingSessionId = contact.sessionId;
      }

      if (!existingSessionId && recipientPhone) {
        const formattedPhone = formatPhoneNumber(recipientPhone);
        const contact = await safeQuery(() => prisma.whatsAppContact.findFirst({
          where: {
            phoneNumber: formattedPhone,
            sessionId: { in: connectedSessionIds }
          },
          orderBy: { lastMessageAt: 'desc' },
          select: { sessionId: true }
        }));
        if (contact) existingSessionId = contact.sessionId;
      }

      if (existingSessionId) {
        console.log(`🔗 [WHATSAPP-AFFINITY] Sticky session matched: ${existingSessionId}`);
        return existingSessionId;
      }
    } catch (err) {
      console.error('❌ [WHATSAPP-AFFINITY] Error checking affinity:', err);
    }
  } else {
    console.log(`⚖️ [WHATSAPP-LB] Sticky sessions disabled, forcing load balancing for every message.`);
  }

  // 2. إذا لم توجد جلسة مثبتة أو الخيار معطل، نستخدم التوزيع الموزون (Weighted Round Robin)
  if (connectedSessions.length > 1) {
    let weightedPool = [];
    connectedSessions.forEach(s => {
      // الأولوية لـ loadBalanceWeight ثم لـ isDefault
      const weight = s.loadBalanceWeight || (s.isDefault ? 3 : 1);
      for (let i = 0; i < weight; i++) {
        weightedPool.push(s.sessionId);
      }
    });

    let lastIndex = sessionRotation.get(companyId) || 0;
    let nextIndex = (lastIndex + 1) % weightedPool.length;
    setSessionRotation(companyId, nextIndex);

    const pickedId = weightedPool[nextIndex];
    console.log(`⚖️ [LOAD-BALANCER] New assignment via Weighted Round-Robin (Weight Strategy): ${pickedId} (Step ${nextIndex + 1}/${weightedPool.length})`);
    return pickedId;
  }

  // إذا كان هناك رقم واحد فقط متصل
  return connectedSessions[0].sessionId;
}

async function ensureRuntimeSessionConnected(sessionId, companyId) {
  let pendingInitialization = sessionInitializationInFlight.get(sessionId);

  if (!pendingInitialization) {
    pendingInitialization = (async () => {
      let session = WhatsAppManager.getSession(sessionId);
      if (session && session.status === 'connected') {
        return session;
      }

      const dbSession = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findUnique({
        where: { id: sessionId },
        select: { status: true, authState: true }
      }));

      if (!dbSession || dbSession.status !== 'CONNECTED' || !dbSession.authState) {
        return session;
      }

      console.log(`🔄 [WHATSAPP-JIT] Session ${sessionId} is CONNECTED in DB but null in memory. Initializing...`);

      try {
        await WhatsAppManager.createSession(sessionId, companyId);

        let waitTime = 0;
        while (waitTime < 5000) {
          session = WhatsAppManager.getSession(sessionId);
          if (session && session.status === 'connected') {
            console.log(`✅ [WHATSAPP-JIT] Session ${sessionId} initialized and connected successfully via JIT`);
            return session;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
          waitTime += 1000;
        }
      } catch (err) {
        console.error(`❌ [WHATSAPP-JIT] Failed to initialize session ${sessionId}:`, err.message);
      }

      return WhatsAppManager.getSession(sessionId);
    })().finally(() => {
      sessionInitializationInFlight.delete(sessionId);
    });

    sessionInitializationInFlight.set(sessionId, pendingInitialization);
  } else {
    console.log(`⏳ [WHATSAPP-JIT] Awaiting in-flight initialization for session ${sessionId}`);
  }

  return pendingInitialization;
}

async function ensureNotificationSettings(companyId) {
  const prisma = getSharedPrismaClient();

  const existingSettings = await safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  }));

  if (existingSettings) {
    return existingSettings;
  }

  let pendingInitialization = settingsInitializationInFlight.get(companyId);

  if (!pendingInitialization) {
    console.log(`[WHATSAPP-DEBUG] Settings not found for company ${companyId}. Auto-creating default settings...`);

    pendingInitialization = (async () => {
      const currentSettings = await safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
        where: { companyId }
      }));

      if (currentSettings) {
        return currentSettings;
      }

      try {
        return await safeQuery(() => prisma.whatsAppNotificationSettings.create({
          data: {
            companyId,
            isEnabled: true,
            hrNotificationsEnabled: true,
            attendanceConfirmedEnabled: true,
            attendanceReminderEnabled: true,
            warningNotificationEnabled: true,
            payrollEnabled: true,
            leaveApprovalEnabled: true,
            permissionApprovalEnabled: true
          }
        }));
      } catch (e) {
        console.error(`❌ [WHATSAPP-DEBUG] Error auto-creating settings:`, e.message);
        return safeQuery(() => prisma.whatsAppNotificationSettings.findUnique({
          where: { companyId }
        }));
      }
    })().finally(() => {
      settingsInitializationInFlight.delete(companyId);
    });

    settingsInitializationInFlight.set(companyId, pendingInitialization);
  } else {
    console.log(`⏳ [WHATSAPP-DEBUG] Awaiting in-flight settings initialization for company ${companyId}`);
  }

  return pendingInitialization;
}

/**
 * إرسال إشعار
 */
async function sendNotification(options) {
  const {
    companyId,
    deliveryCompanyId = companyId,
    recipientPhone,
    recipientName,
    recipientType = 'CUSTOMER',
    category,
    eventType,
    variables = {},
    orderId,
    customerId,
    productId,
    employeeId,
    cartId,
    priority = 5,
    scheduleAt = null,
    buttons = null
  } = options;

  const prisma = getSharedPrismaClient();

  // Ensure orderId is in variables for variable replacement in buttons and content
  if (orderId && !variables.orderId) {
    variables.orderId = orderId;
  }

  try {
    // 1. جلب إعدادات الإشعارات
    const settings = await ensureNotificationSettings(companyId);
    const persistedEventType = getPersistedNotificationEventType(eventType);
    const persistedCategory = getPersistedNotificationCategory(category, eventType);
    const persistedRecipientType =
      getPersistedNotificationRecipientType(recipientType);

    console.log(`[WHATSAPP-DEBUG-sendNotification] Settings check:`, {
      hasSettings: !!settings,
      isEnabled: settings?.isEnabled
    });

    const eventSettingState = isEventEnabledForSettings(settings, eventType);
    if (!eventSettingState.enabled) {
      console.log(
        `⚠️ [WHATSAPP-DEBUG] Notification for ${eventType} blocked. reason=${eventSettingState.reason} setting=${eventSettingState.settingKey || 'n/a'}`
      );
      return { success: false, reason: eventSettingState.reason };
    }


    // 2. التحقق من الجلسة (مع موازنة الحمل والـ Sticky Session)
    let sessionId = null;
    let senderSettings = settings;

    if (deliveryCompanyId && deliveryCompanyId !== companyId) {
      senderSettings = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
        where: { companyId: deliveryCompanyId }
      }));
    }

    // جلب جميع الجلسات المتصلة لهذه الشركة من الذاكرة
    const connectedSessions = (WhatsAppManager.getCompanySessions(deliveryCompanyId) || [])
      .filter(s => s.status === 'connected');

    sessionId = await getOrAssignSession({
      companyId: deliveryCompanyId,
      customerId,
      recipientPhone,
      connectedSessions,
      settings: senderSettings
    });

    if (!sessionId) {
      // محاولة أخيرة: البحث عن أي جلسة متصلة في DB (fallback قديم)
      const connected = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findFirst({
        where: {
          companyId: deliveryCompanyId,
          status: 'CONNECTED'
        },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      }));

      if (connected?.id) {
        sessionId = connected.id;
        console.log(`ℹ️ [WHATSAPP-DEBUG] Used DB fallback session: ${sessionId}`);
      }
    }

    if (!sessionId) {
      console.log(`⚠️ [WHATSAPP-DEBUG] No session available for company ${companyId}`);
      return { success: false, reason: 'no_session' };
    }

    let session = WhatsAppManager.getSession(sessionId);
    console.log(`[WHATSAPP-DEBUG] Session status from manager memory:`, session ? session.status : 'null');

    // 🆕 JIT Initialization: إذا لم تكن الجلسة في الذاكرة ولكنها متصلة في DB، قم بتنشيطها
    if (!session || session.status !== 'connected') {
      session = await ensureRuntimeSessionConnected(sessionId, deliveryCompanyId);
    }

    if (!session || session.status !== 'connected') {
      console.log(`⚠️ [WHATSAPP-DEBUG] Session not connected: ${sessionId}`);

      // Try one more fallback: pick any CONNECTED session from DB and see if runtime is connected
      const connected = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findFirst({
        where: {
          companyId: deliveryCompanyId,
          status: 'CONNECTED',
          id: { not: sessionId }
        },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      }));

      if (connected?.id) {
        const fallbackId = connected.id;
        const fallbackSession = WhatsAppManager.getSession(fallbackId);
        if (fallbackSession && fallbackSession.status === 'connected') {
          sessionId = fallbackId;
          session = fallbackSession;
          console.log(`ℹ️ Using fallback runtime-connected session for company ${deliveryCompanyId}: ${sessionId}`);
        }
      }
    }

    if (!session || session.status !== 'connected') {
      return { success: false, reason: 'session_not_connected' };
    }

    // 3. التحقق من ساعات الهدوء
    // استثناء: الطلبات الحرجة ورسائل onboarding / الاشتراك الخاصة بالشركات تُرسل فوراً.
    const bypassQuietHours =
      eventType === 'ORDER_CREATED' || COMPANY_LIFECYCLE_EVENT_TYPES.has(eventType);

    if (isQuietHours(settings) && !scheduleAt && !bypassQuietHours) {
      const nextAllowedSendAt = new Date();
      const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
      nextAllowedSendAt.setHours(endHour, endMin, 0, 0);

      // إذا كنا بعد وقت نهاية الهدوء لليوم الحالي، نؤجل لليوم التالي.
      if (nextAllowedSendAt <= new Date()) {
        nextAllowedSendAt.setDate(nextAllowedSendAt.getDate() + 1);
      }

      return scheduleNotification({
        ...options,
        scheduleAt: nextAllowedSendAt
      });
    }

    // 4. جلب القالب (ما لم يتم توفير محتوى مباشر)
    let template = null;
    let templateId = null;

    if (options.contentOverride) {
      console.log(`[WHATSAPP-NOTIFY] Using contentOverride for journey notification`);
    } else {
      template = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationTemplate.findFirst({
        where: {
          companyId,
          eventType,
          isActive: true
        },
        orderBy: { isDefault: 'desc' }
      }));

      // استخدام القالب الافتراضي إذا لم يوجد
      if (!template && DEFAULT_TEMPLATES[eventType]) {
        const defaultTemplate = DEFAULT_TEMPLATES[eventType];
        template = {
          id: null,
          content: defaultTemplate.content,
          hasButtons: defaultTemplate.hasButtons || false,
          buttons: defaultTemplate.buttons || null,
          hasList: false
        };
      }

      if (!template) {
        // Fallback for order status updates
        if (category === 'ORDERS' || eventType.startsWith('ORDER_') || eventType.match(/^[A-Z_]+$/)) {
          template = {
            content: `مرحباً {{customerName}} 👋\n\nنود إعلامك أن حالة طلبك رقم {{orderNumber}} قد تغيرت إلى حالياً: *{{status}}* \n\n{{orderItems}}\nشكراً لتعاملك معنا! ✨`,
            hasButtons: true,
            buttons: [
              { id: "confirm_order_{orderId}", text: "تأكيد الأوردر" },
              { id: "delay_order_{orderId}", text: "تأجيل التسليم" },
              { id: "cancel_order_{orderId}", text: "إلغاء الأوردر" }
            ],
            hasList: false
          };
        } else {
          return { success: false, reason: 'no_template' };
        }
      }
      templateId = template.id || null;
    }

    const safeTemplate = template || {
      id: null,
      content: '',
      hasButtons: false,
      buttons: null,
      hasList: false,
      listData: null,
      footer: null
    };

    // 5. تجهيز المحتوى
    const rawContent = options.contentOverride || safeTemplate.content || '';
    const content = replaceVariables(rawContent, {
      ...variables,
      customerName: variables.customerName || recipientName || 'عميلنا العزيز',
      customerPhone: variables.customerPhone || recipientPhone || '',
      orderNumber: variables.orderNumber || '',
      orderDate: variables.orderDate || new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      orderItems: variables.orderItems || '',
      subtotal: variables.subtotal || '0',
      shipping: variables.shipping || '0',
      total: variables.total || '0',
      currency: variables.currency || settings.currency || 'EGP',
      trackingLink: variables.trackingLink || (variables.orderNumber ? `https://mokhtarelhenawy.online/track/${variables.orderNumber}` : ''),
      trackingNumber: variables.trackingNumber || '',
      estimatedDays: variables.estimatedDays || '3-5',
      employeeName: variables.employeeName || recipientName || 'الموظف العزيز'
    });

    console.log(`[WHATSAPP-DEBUG] Content after variable replacement:`, content?.substring(0, 50));

    // 6. تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(recipientPhone);
    console.log(`[WHATSAPP-DEBUG] Formatted phone: ${formattedPhone} (original: ${recipientPhone})`);

    if (!formattedPhone) {
      console.log(`⚠️ [WHATSAPP-DEBUG] Invalid phone number: ${recipientPhone}`);
      return { success: false, reason: 'invalid_phone' };
    }

    // 7. إنشاء سجل الإشعار
    let notificationLog;
    try {
      notificationLog = await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.create({
        data: {
          companyId,
          templateId: templateId || null,
          sessionId,
          recipientPhone: formattedPhone,
          recipientName,
          recipientType: persistedRecipientType,
          category: persistedCategory,
          eventType: persistedEventType,
          content,
          orderId,
          customerId,
          productId,
          employeeId,
          cartId,
          status: 'PENDING'
        }
      }));
    } catch (enumError) {
      // Workaround for enum issues - use raw SQL
      console.log(`[WHATSAPP-DEBUG] Enum error, trying raw SQL...`);
      const result = await prisma.$queryRaw`
        INSERT INTO "whatsapp_notification_logs" (
          id, "companyId", "templateId", "sessionId", "recipientPhone", "recipientName",
          "recipientType", category, "eventType", content, "orderId", "customerId",
          status, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), ${companyId}, ${templateId || null}, ${sessionId},
          ${formattedPhone}, ${recipientName},
          CAST(${persistedRecipientType} AS "whatsapp_notification_logs_recipientType"),
          CAST(${persistedCategory} AS "whatsapp_notification_logs_category"),
          CAST(${persistedEventType} AS "whatsapp_notification_logs_eventType"), ${content},
          ${orderId}, ${customerId}, 'PENDING', NOW(), NOW()
        ) RETURNING *;
      `;
      notificationLog = result[0];
      console.log(`[WHATSAPP-DEBUG] Created log via raw SQL: ${notificationLog.id}`);
    }

    // 8. إرسال الرسالة
    console.log(`[WHATSAPP-DEBUG] About to send message via session ${sessionId} to ${formattedPhone}`);

    try {
      const jid = `${formattedPhone}@s.whatsapp.net`;

      let result;
      // 📋 معالجة الأزرار التفاعلية
      // الأولوية للأزرار من القالب إذا كانت موجودة، مع الحفاظ على الأيدي (IDs) الوظيفية إذا تم تمريرها من الكود
      let templateButtons = null;
      if (safeTemplate.hasButtons && safeTemplate.buttons) {
        try {
          templateButtons = typeof safeTemplate.buttons === 'string' ? JSON.parse(safeTemplate.buttons) : safeTemplate.buttons;
        } catch (e) {
          console.error('❌ Failed to parse template buttons:', e);
        }
      }

      let finalButtons = buttons;

      if (templateButtons && templateButtons.length > 0) {
        if (buttons && buttons.length > 0) {
          // إذا تم تمرير أزرار من الكود (تحتوي على IDs وظيفية)
          // نستخدم نصوص القالب (Template Texts) للحفاظ على التخصيص
          finalButtons = buttons.map((btn, index) => {
            const tplBtn = templateButtons[index];
            return {
              id: replaceVariables(btn.id, variables),
              text: tplBtn && tplBtn.text ? replaceVariables(tplBtn.text, variables) : replaceVariables(btn.text, variables)
            };
          });
        } else {
          // إذا لم يتم تمرير أزرار من الكود، نستخدم أزرار القالب مباشرة
          finalButtons = templateButtons.map(btn => ({
            id: replaceVariables(btn.id, variables),
            text: replaceVariables(btn.text, variables)
          }));
        }
      } else if (buttons) {
        // إذا لم يوجد أزرار في القالب، نستخدم الأزرار الممررة من الكود
        finalButtons = buttons.map(btn => ({
          id: replaceVariables(btn.id, variables),
          text: replaceVariables(btn.text, variables)
        }));
      }

      // 🔥 ضمان وجود أزرار لإشعارات الطلبات إذا لم يتم توفيرها (Default Fallback)
      if ((!finalButtons || finalButtons.length === 0) && (category === 'ORDER' || category === 'ORDERS' || eventType.startsWith('ORDER_'))) {
        console.log(`[WHATSAPP-DEBUG] Injecting default buttons for order notification: ${eventType}`);
        finalButtons = [
          { id: replaceVariables("confirm_order_{orderId}", variables), text: "تأكيد الأوردر" },
          { id: replaceVariables("delay_order_{orderId}", variables), text: "تأجيل التسليم" },
          { id: replaceVariables("cancel_order_{orderId}", variables), text: "إلغاء الأوردر" }
        ];
      }

      if (finalButtons && finalButtons.length > 0) {
        try {
          // Get footer from default template if not in DB template (DB model lacks footer field currently)
          const footerStr =
            safeTemplate.footer ||
            (DEFAULT_TEMPLATES[eventType]?.footer
              ? replaceVariables(DEFAULT_TEMPLATES[eventType].footer, variables)
              : "Mokhtar Elhenawy Store");

          console.log(`🚀 [WHATSAPP-DEBUG] Triggering sendButtons with ${finalButtons.length} buttons and footer: ${footerStr}`);

          result = await WhatsAppMessageHandler.sendButtons(sessionId, jid, content, finalButtons, {
            footer: footerStr
          });
        } catch (error) {
          console.error(`❌ [WHATSAPP-DEBUG] Failed to send buttons, falling back to text:`, error);
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
        }
      } else if (safeTemplate.hasList && safeTemplate.listData) {
        try {
          const listData = typeof safeTemplate.listData === 'string' ? JSON.parse(safeTemplate.listData) : safeTemplate.listData;
          console.log(`[WHATSAPP-DEBUG] Sending list message`);
          result = await WhatsAppMessageHandler.sendList(sessionId, jid, listData);
        } catch (parseError) {
          console.error(`❌ [WHATSAPP-DEBUG] Failed to parse listData, falling back to text:`, parseError);
          result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
        }
      } else {
        console.log(`[WHATSAPP-DEBUG] Sending text message:`, content?.substring(0, 50));
        result = await WhatsAppMessageHandler.sendText(sessionId, jid, content);
      }

      console.log(`[WHATSAPP-DEBUG] Send result:`, result);

      // تحديث السجل
      await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          whatsappMessageId: result?.messageId || result?.key?.id || null
        }
      }));

      console.log(`✅ [WHATSAPP-DEBUG] Notification SENT successfully: ${eventType} to ${formattedPhone}`);

      // 9. إرسال عبر المنصة المحلية (SMS Parity)
      // نرسل الطلبات فقط إذا لم يكن هناك خيار لتعطيلها
      if ((category === 'ORDERS' || eventType === 'ORDER_CREATED') && process.env.ENABLE_LOCAL_WHATSAPP === 'true') {
        await sendViaLocalWhatsApp({
          phone: formattedPhone,
          message: content,
          orderNumber: variables.orderNumber,
          customerName: recipientName,
          variables: variables,
          eventType: eventType,
          buttons: finalButtons // ✅ Pass buttons to local bridge
        });
      }

      return { success: true, notificationId: notificationLog.id };

    } catch (sendError) {
      console.error(`❌ [WHATSAPP-DEBUG] Failed to send message:`, sendError.message);
      console.error(`❌ [WHATSAPP-DEBUG] Error stack:`, sendError.stack);

      // تحديث السجل بالخطأ
      await safeQuery(() => getSharedPrismaClient().whatsAppNotificationLog.update({
        where: { id: notificationLog.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: sendError.message
        }
      }));

      return { success: false, reason: 'send_failed', error: sendError.message };
    }

  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * إرسال رسالة عبر المنصة المحلية (SMS Parity)
 * Hits http://localhost:3000/whatsapp
 */
async function sendViaLocalWhatsApp(data) {
  try {
    const { phone, message, orderNumber, customerName, variables, eventType } = data;

    console.log(`🚀 [LOCAL-WHATSAPP] Sending to localhost:3000 for order ${orderNumber || 'N/A'}`);

    const response = await axios.post('http://localhost:3007/whatsapp', {
      phone,
      message,
      orderNumber,
      customerName,
      eventType,
      buttons: data.buttons || variables.buttons || [], // ✅ Pass buttons to local bridge
      variables: variables || {},
      metadata: {
        source: 'WhatsAppNotificationService',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: process.env.LOCAL_WHATSAPP_BRIDGE_SECRET
        ? { 'x-local-bridge-secret': process.env.LOCAL_WHATSAPP_BRIDGE_SECRET }
        : undefined,
      timeout: 5000 // 5 seconds timeout
    });

    console.log(`✅ [LOCAL-WHATSAPP] Response:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ [LOCAL-WHATSAPP] Error:`, error.message);
    // لا نوقف العملية الأصلية إذا فشل هذا الإرسال
    return { success: false, error: error.message };
  }
}

/**
 * جدولة إشعار
 */
async function scheduleNotification(options) {
  const prisma = getSharedPrismaClient();

  try {
    const {
      companyId,
      deliveryCompanyId = companyId,
      recipientPhone,
      recipientName,
      recipientType = 'CUSTOMER',
      category,
      eventType,
      variables = {},
      orderId,
      customerId,
      productId,
      employeeId,
      cartId,
      priority = 5,
      scheduleAt,
      contentOverride = null
    } = options;
    const persistedEventType = getPersistedNotificationEventType(eventType);
    const persistedCategory = getPersistedNotificationCategory(category, eventType);
    const persistedRecipientType =
      getPersistedNotificationRecipientType(recipientType);

    // جلب الإعدادات
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId }
    });

    let senderSettings = settings;
    if (deliveryCompanyId && deliveryCompanyId !== companyId) {
      senderSettings = await prisma.whatsAppNotificationSettings.findUnique({
        where: { companyId: deliveryCompanyId }
      });
    }

    // 2. التحقق من الجلسة (مع موازنة الحمل والـ Sticky Session)
    let sessionId = null;
    const connectedSessions = (WhatsAppManager.getCompanySessions(deliveryCompanyId) || [])
      .filter(s => s.status === 'connected');

    sessionId = await getOrAssignSession({
      companyId: deliveryCompanyId,
      customerId,
      recipientPhone,
      connectedSessions,
      settings: senderSettings
    });

    if (!sessionId) {
      const connected = await prisma.whatsAppSession.findFirst({
        where: { companyId: deliveryCompanyId, status: 'CONNECTED' },
        select: { id: true },
        orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
      });
      if (connected?.id) sessionId = connected.id;
    }

    if (!sessionId) {
      return { success: false, reason: 'no_session' };
    }

    // 3. جلب القالب
    let template = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId, eventType, isActive: true }
    });

    if (!template && DEFAULT_TEMPLATES[eventType]) {
      template = { content: DEFAULT_TEMPLATES[eventType].content };
    }

    if (!template && !contentOverride) {
      return { success: false, reason: 'no_template' };
    }

    // تجهيز المحتوى
    const content = replaceVariables(contentOverride || template?.content || '', {
      ...variables,
      customerName: variables.customerName || recipientName || 'عميلنا العزيز',
      employeeName: variables.employeeName || recipientName || 'الموظف العزيز'
    });

    // إضافة للطابور
    const queueItem = await prisma.whatsAppNotificationQueue.create({
      data: {
        companyId,
        templateId: template?.id || null,
        sessionId: sessionId,
        recipientPhone: formatPhoneNumber(recipientPhone),
        recipientName,
        recipientType: persistedRecipientType,
        category: persistedCategory,
        eventType: persistedEventType,
        content,
        orderId,
        customerId,
        productId,
        employeeId,
        cartId,
        scheduledAt: scheduleAt,
        priority,
        status: 'PENDING'
      }
    });

    console.log(`📅 Notification scheduled: ${eventType} at ${scheduleAt}`);
    return {
      success: true,
      queueId: queueItem.id,
      scheduledAt: queueItem.scheduledAt
    };

  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات الطلبات
// ═══════════════════════════════════════════════════════════════════════════════

function getOrderNotificationTracking(order) {
  const isGuestOrder = Boolean(order?.guestPhone || order?.guestName) && !order?.customerId;

  return {
    isGuestOrder,
    trackedOrderId: isGuestOrder ? null : (order?.id || null)
  };
}

/**
 * إرسال إشعار طلب جديد
 */
async function sendOrderCreatedNotification(order) {
  const prisma = getSharedPrismaClient();

  console.log(`[WHATSAPP-DEBUG] sendOrderCreatedNotification called for order: ${order.orderNumber}, company: ${order.companyId}`);

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  console.log(`[WHATSAPP-DEBUG] Settings found:`, settings ? 'YES' : 'NO');
  if (settings) {
    console.log(`[WHATSAPP-DEBUG] Settings details:`, {
      isEnabled: settings.isEnabled,
      orderNotificationsEnabled: settings.orderNotificationsEnabled,
      orderCreatedEnabled: settings.orderCreatedEnabled,
      defaultSessionId: settings.defaultSessionId
    });
  }

  if (!settings?.orderNotificationsEnabled || !settings?.orderCreatedEnabled) {
    console.log(`[WHATSAPP-DEBUG] FAILED: orderNotificationsEnabled=${settings?.orderNotificationsEnabled}, orderCreatedEnabled=${settings?.orderCreatedEnabled}`);
    return { success: false, reason: 'disabled' };
  }

  const phone = order.customerPhone || order.customer?.phone;
  console.log(`[WHATSAPP-DEBUG] Phone: ${phone}`);
  if (!phone) return { success: false, reason: 'no_phone' };

  // Format order items with color and size
  let orderItemsText = '';
  if (order.items && order.items.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    order.items.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  }

  // Build tracking link
  let trackingLink = '';
  try {
    const company = await prisma.company.findUnique({
      where: { id: order.companyId },
      select: { slug: true, customDomain: true }
    });

    const baseUrl = company?.customDomain
      ? `https://${company.customDomain}`
      : `https://${company?.slug || 'store'}.mokhtarelhenawy.online`;

    trackingLink = `${baseUrl}/shop/track-order?orderNumber=${order.orderNumber}&phone=${encodeURIComponent(phone)}&companyId=${order.companyId}`;
  } catch (err) {
    console.error('Error building tracking link:', err);
  }

  console.log(`[WHATSAPP-DEBUG] Calling sendNotification...`);
  const { trackedOrderId } = getOrderNotificationTracking(order);
  return sendNotification({
    companyId: order.companyId,
    recipientPhone: phone,
    recipientName: order.customerName || order.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ORDER',
    eventType: 'ORDER_CREATED',
    variables: {
      customerName: order.customerName || order.customer?.firstName || 'عميلنا العزيز',
      customerPhone: phone,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      orderItems: orderItemsText,
      shipping: (order.shipping || 0).toString(),
      total: (order.total || 0).toString(),
      currency: order.currency || 'EGP',
      trackingLink,
      orderId: order.id
    },
    orderId: trackedOrderId,
    customerId: order.customerId,
    priority: 1
  });
}

/**
 * إرسال إشعار تحديث حالة الطلب
 */
async function sendOrderStatusNotification(order, newStatus, oldStatus) {
  const prisma = getSharedPrismaClient();

  console.log(`[WHATSAPP-STATUS] ==== sendOrderStatusNotification called ====`);
  console.log(`[WHATSAPP-STATUS] Order: ${order?.orderNumber}, New Status: ${newStatus}, Old Status: ${oldStatus}`);
  console.log(`[WHATSAPP-STATUS] Company ID: ${order?.companyId}`);

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: order.companyId }
  });

  console.log(`[WHATSAPP-STATUS] Settings found: ${!!settings}`);
  console.log(`[WHATSAPP-STATUS] orderNotificationsEnabled: ${settings?.orderNotificationsEnabled}`);

  if (!settings?.orderNotificationsEnabled) {
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: orderNotificationsEnabled is false`);
    return { success: false, reason: 'disabled' };
  }

  // 🆕 تحديد نوع الإشعار بناءً على الحالة (دعم للحالات الديناميكية)
  let statusConfig = null;
  const statusEventMap = {
    'CONFIRMED': { event: 'ORDER_CONFIRMED', enabled: settings.orderConfirmedEnabled },
    'PROCESSING': { event: 'ORDER_PROCESSING', enabled: settings.orderProcessingEnabled },
    'SHIPPED': { event: 'ORDER_SHIPPED', enabled: settings.orderShippedEnabled },
    'OUT_FOR_DELIVERY': { event: 'ORDER_OUT_FOR_DELIVERY', enabled: settings.orderShippedEnabled },
    'DELIVERED': { event: 'ORDER_DELIVERED', enabled: settings.orderDeliveredEnabled },
    'CANCELLED': { event: 'ORDER_CANCELLED', enabled: settings.orderCancelledEnabled }
  };

  if (statusEventMap[newStatus]) {
    statusConfig = statusEventMap[newStatus];
  } else {
    // التحقق من الحالات المخصصة في قاعدة البيانات
    const dbStatus = await prisma.orderStatusConfig.findFirst({
      where: { companyId: order.companyId, code: newStatus, statusType: 'order', isActive: true }
    });

    if (dbStatus) {
      statusConfig = {
        event: dbStatus.code,
        enabled: dbStatus.notifyCustomer,
        isCustom: true,
        statusName: dbStatus.name
      };
    } else {
      // 🚀 [FALLBACK] If not in map or DB, allow the notification but let sendNotification decide
      // This supports the 82 system statuses that might not be in the config table yet.
      console.log(`[WHATSAPP-STATUS] ℹ️ Using dynamic fallback for status: ${newStatus}`);
      statusConfig = {
        event: newStatus,
        enabled: true, // Specific check will happen in sendNotification based on settings[settingKey]
        isFallback: true
      };
    }
  }

  console.log(`[WHATSAPP-STATUS] Status Config:`, JSON.stringify(statusConfig));

  if (!statusConfig) {
    // This part is technically unreachable now but kept for safety
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: No config for status ${newStatus}`);
    return { success: false, reason: 'status_notification_disabled' };
  }

  if (!statusConfig.enabled) {
    console.log(`[WHATSAPP-STATUS] ❌ FAILED: ${newStatus} notification is disabled`);
    return { success: false, reason: 'status_notification_disabled' };
  }

  console.log(`[WHATSAPP-STATUS] ✅ Will send: ${statusConfig.event}`);

  const phone = order.customerPhone || order.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  // Format order items with color and size (Always include if available)
  let orderItemsText = '';
  if (order.items && order.items.length > 0) {
    orderItemsText = '\n📋 تفاصيل الطلب:\n';
    order.items.forEach((item, index) => {
      const color = item.productColor || item.color || item.attributes?.color;
      const size = item.productSize || item.size || item.attributes?.size;
      let itemDetails = `${index + 1}. ${item.productName || item.name}`;
      if (color) itemDetails += ` | اللون: ${color}`;
      if (size) itemDetails += ` | المقاس: ${size}`;
      itemDetails += ` | الكمية: ${item.quantity || 1}`;
      orderItemsText += itemDetails + '\n';
    });
    // Add separator line after items
    orderItemsText += '------------------------------\n';
  }

  console.log(`[WHATSAPP-STATUS] Phone: ${phone}`);
  console.log(`[WHATSAPP-STATUS] About to call sendNotification with event: ${statusConfig.event}`);

  try {
    const { trackedOrderId } = getOrderNotificationTracking(order);
    const result = await sendNotification({
      companyId: order.companyId,
      recipientPhone: phone,
      recipientName: order.customerName || order.customer?.firstName,
      recipientType: 'CUSTOMER',
      category: 'ORDER',
      eventType: statusConfig.event,
      variables: {
        customerName: order.customerName || order.customer?.firstName || 'عميلنا العزيز',
        customerPhone: phone,
        orderNumber: order.orderNumber,
        orderItems: orderItemsText,
        status: statusConfig.statusName || newStatus, // 🔥 Added status name for templates
        total: order.total?.toString(),
        currency: order.currency || 'EGP',
        trackingNumber: order.turboTrackingNumber || '',
        estimatedDays: '2-3',
        reason: ''
      },
      orderId: trackedOrderId,
      customerId: order.customerId,
      priority: 2
    });

    console.log(`[WHATSAPP-STATUS] Result:`, JSON.stringify(result));
    console.log(`[WHATSAPP-STATUS] ==== END ====`);
    return result;
  } catch (error) {
    console.error(`[WHATSAPP-STATUS] ❌ ERROR:`, error.message);
    console.error(`[WHATSAPP-STATUS] Stack:`, error.stack);
    console.log(`[WHATSAPP-STATUS] ==== END (with error) ====`);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒 إشعارات العربة المتروكة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار عربة متروكة
 */
async function sendAbandonedCartNotification(cart, reminderType = 'CART_ABANDONED_1H') {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: cart.companyId }
  });

  if (!settings?.abandonedCartEnabled) {
    return { success: false, reason: 'disabled' };
  }

  // التحقق من تفضيلات العميل
  if (cart.customerId) {
    const preference = await prisma.customerNotificationPreference.findUnique({
      where: { companyId_customerId: { companyId: cart.companyId, customerId: cart.customerId } }
    });

    if (preference && !preference.abandonedCart) {
      return { success: false, reason: 'customer_opted_out' };
    }
  }

  const phone = cart.customerPhone || cart.customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType = reminderType;
  let variables = {
    itemCount: cart.items?.length?.toString() || '0',
    total: cart.total?.toString() || '0',
    currency: cart.currency || 'EGP'
  };

  // إضافة خصم للتذكير الأخير
  if (reminderType === 'CART_ABANDONED_WITH_DISCOUNT' && settings.abandonedCartDiscountEnabled) {
    const discountPercent = settings.abandonedCartDiscountPercent;
    const discountedTotal = cart.total * (1 - discountPercent / 100);

    variables = {
      ...variables,
      discount: discountPercent.toString(),
      discountedTotal: discountedTotal.toFixed(2),
      couponCode: `CART${Date.now().toString(36).toUpperCase()}`
    };
  }

  return sendNotification({
    companyId: cart.companyId,
    recipientPhone: phone,
    recipientName: cart.customerName || cart.customer?.firstName,
    recipientType: 'CUSTOMER',
    category: 'ABANDONED_CART',
    eventType,
    variables,
    customerId: cart.customerId,
    cartId: cart.id,
    priority: 3
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 إشعارات المنتجات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار المنتج متوفر
 */
async function sendBackInStockNotification(product, customer) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: product.companyId }
  });

  if (!settings?.productNotificationsEnabled || !settings?.backInStockEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = customer.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: product.companyId,
    recipientPhone: phone,
    recipientName: customer.firstName,
    recipientType: 'CUSTOMER',
    category: 'PRODUCTS',
    eventType: 'BACK_IN_STOCK',
    variables: {
      productName: product.name,
      price: product.price?.toString(),
      currency: 'EGP'
    },
    productId: product.id,
    customerId: customer.id,
    priority: 4
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 إشعارات الموارد البشرية
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * إرسال تذكير الحضور
 */
async function sendAttendanceReminderNotification(employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceReminderEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_REMINDER',
    variables: {
      startTime: '09:00'
    },
    employeeId: employee.id,
    priority: 3
  });
}

/**
 * إرسال إشعار التأخير بدون خصم (يظهر الخصم 0 إذا كان في حدود السماحية)
 */
async function sendAttendanceLateNotification(attendance, employee, companyId, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_LATE',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : ''),
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      lateMinutes: attendance.lateMinutes?.toString() || '0',
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال تأكيد الحضور
 */
async function sendAttendanceConfirmedNotification(attendance, employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '')
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار التأخير مع الخصم
 */
async function sendAttendanceLateWithDeductionNotification(attendance, employee, companyId, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.attendanceConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'ATTENDANCE_LATE_WITH_DEDUCTION',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : ''),
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      lateMinutes: attendance.lateMinutes?.toString() || '0',
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال تأكيد الانصراف
 */
async function sendCheckoutConfirmedNotification(attendance, employee, companyId, workHours = 0, deductionAmount = 0) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.checkoutConfirmedEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'CHECKOUT_CONFIRMED',
    variables: {
      employeeName: employee.firstName || employee.name,
      checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      checkOutTime: attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '',
      date: attendance.checkOut ? new Date(attendance.checkOut).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.checkIn ? new Date(attendance.checkIn).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : (attendance.date ? new Date(attendance.date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : '')),
      workHours: workHours.toFixed(1),
      deductionAmount: deductionAmount.toFixed(2),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الموافقة على الإذن
 */
async function sendPermissionApprovalNotification(permissionRequest, approved = true) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: permissionRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.permissionApprovalEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = permissionRequest.user || permissionRequest.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: permissionRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: approved ? 'PERMISSION_APPROVED' : 'PERMISSION_REJECTED',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: permissionRequest.date ? new Date(permissionRequest.date).toLocaleDateString('ar-EG') : '',
      startTime: permissionRequest.startTime || '',
      endTime: permissionRequest.endTime || '',
      permissionType: permissionRequest.type === 'LATENESS' ? 'تأخير' : permissionRequest.type === 'EARLY_LEAVE' ? 'انصراف مبكر' : 'إذن خروج',
      reason: permissionRequest.rejectionReason || ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الموافقة على الإجازة
 */
async function sendLeaveApprovalNotification(leaveRequest, approved = true) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: leaveRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.leaveApprovalEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = leaveRequest.user || leaveRequest.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: leaveRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
    variables: {
      startDate: leaveRequest.startDate?.toLocaleDateString('ar-EG'),
      endDate: leaveRequest.endDate?.toLocaleDateString('ar-EG'),
      leaveType: leaveRequest.type || 'إجازة',
      reason: leaveRequest.rejectionReason || ''
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الراتب
 */
async function sendPayrollNotification(payroll) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: payroll.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings?.payrollEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const employee = payroll.user || payroll.employee;
  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return sendNotification({
    companyId: payroll.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'PAYROLL_READY',
    variables: {
      month: monthNames[new Date(payroll.month).getMonth()],
      netSalary: payroll.netSalary?.toString(),
      currency: 'EGP'
    },
    employeeId: employee.id,
    priority: 1
  });
}


/**
 * إرسال إشعار حالة طلب العهدة
 */
async function sendAssetRequestNotification(request, employee, status) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: request.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType;
  let variables = {
    employeeName: employee.firstName || employee.name,
    assetType: request.assetType,
    assetName: request.assets?.name || request.assetName || ''
  };

  if (status === 'APPROVED') {
    eventType = 'ASSET_REQUEST_APPROVED';
  } else if (status === 'REJECTED') {
    eventType = 'ASSET_REQUEST_REJECTED';
    variables.reason = request.rejectionReason || 'غير محدد';
  } else if (status === 'FULFILLED') {
    eventType = 'ASSET_REQUEST_FULFILLED';
  }

  if (!eventType) return { success: false, reason: 'invalid_status' };

  return sendNotification({
    companyId: request.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType,
    variables,
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار عيد ميلاد
 */
async function sendBirthdayNotification(employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'BIRTHDAY_EMPLOYEE',
    variables: {
      employeeName: employee.firstName || employee.name
    },
    employeeId: employee.id,
    priority: 3
  });
}

/**
 * إرسال إشعار تحديث حالة الاستقالة
 */
async function sendResignationNotification(resignation, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: resignation.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  const statusMap = {
    'APPROVED': 'مقبولة ✅',
    'REJECTED': 'مرفوضة ❌',
    'PENDING': 'قيد المراجعة ⏳',
    'CANCELLED': 'ملغاة 🚫',
    'SETTLED': 'تمت التسوية المالية 💰'
  };

  return sendNotification({
    companyId: resignation.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'RESIGNATION_STATUS_UPDATE',
    variables: {
      employeeName: employee.firstName || employee.name,
      status: statusMap[resignation.status] || resignation.status,
      lastWorkingDay: resignation.lastWorkingDay ? new Date(resignation.lastWorkingDay).toLocaleDateString('ar-EG') : 'غير محدد'
    },
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار الخصم اليدوي
 */
async function sendManualDeductionNotification(deduction, employee, companyId) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'MANUAL_DEDUCTION',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: deduction.date ? new Date(deduction.date).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG'),
      deductionType: deduction.type || 'خصم إداري',
      amount: deduction.amount?.toString() || '0',
      currency: 'EGP',
      reason: deduction.reason || 'غير محدد'
    },
    employeeId: employee.id,
    priority: 2
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 معالج الطابور
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * معالجة الإشعارات المجدولة
 */
async function processNotificationQueue() {
  const prisma = getSharedPrismaClient();

  // ✅ CRITICAL FIX: Check if prisma client is available
  if (!prisma) {
    console.error('❌ [WHATSAPP-QUEUE] Prisma client not available - database not initialized');
    return;
  }

  // ✅ CRITICAL FIX: Check if models are available
  if (!prisma.whatsAppNotificationQueue) {
    console.error('❌ [WHATSAPP-QUEUE] Prisma models not loaded - database connection not ready');
    console.error('   This usually means initializeSharedDatabase() has not completed yet');
    return;
  }

  try {
    // جلب الإشعارات المستحقة
    const pendingNotifications = await prisma.whatsAppNotificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() }
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledAt: 'asc' }
      ],
      take: 50
    });

    console.log(`📬 Processing ${pendingNotifications.length} queued notifications`);

    for (const notification of pendingNotifications) {
      // تحديث الحالة
      await prisma.whatsAppNotificationQueue.update({
        where: { id: notification.id },
        data: { status: 'PROCESSING' }
      });

      try {
        // التحقق من الجلسة
        const session = WhatsAppManager.getSession(notification.sessionId);
        if (!session || session.status !== 'connected') {
          throw new Error('Session not connected');
        }

        // إرسال الرسالة
        const jid = `${notification.recipientPhone}@s.whatsapp.net`;

        let result;
        if (notification.buttons) {
          try {
            const buttons = typeof notification.buttons === 'string' ? JSON.parse(notification.buttons) : notification.buttons;
            result = await WhatsAppMessageHandler.sendButtons(notification.sessionId, jid, notification.content, buttons);
          } catch (parseErr) {
            console.error('❌ [WHATSAPP-QUEUE] Failed to parse buttons:', parseErr);
            result = await WhatsAppMessageHandler.sendText(notification.sessionId, jid, notification.content);
          }
        } else if (notification.listData) {
          try {
            const listData = typeof notification.listData === 'string' ? JSON.parse(notification.listData) : notification.listData;
            result = await WhatsAppMessageHandler.sendList(notification.sessionId, jid, listData);
          } catch (parseErr) {
            console.error('❌ [WHATSAPP-QUEUE] Failed to parse listData:', parseErr);
            result = await WhatsAppMessageHandler.sendText(notification.sessionId, jid, notification.content);
          }
        } else {
          result = await WhatsAppMessageHandler.sendText(notification.sessionId, jid, notification.content);
        }

        // إنشاء سجل
        await prisma.whatsAppNotificationLog.create({
          data: {
            companyId: notification.companyId,
            templateId: notification.templateId,
            sessionId: notification.sessionId,
            recipientPhone: notification.recipientPhone,
            recipientName: notification.recipientName,
            recipientType: notification.recipientType,
            category: notification.category,
            eventType: getPersistedNotificationEventType(notification.eventType),
            content: notification.content,
            orderId: notification.orderId,
            customerId: notification.customerId,
            productId: notification.productId,
            employeeId: notification.employeeId,
            cartId: notification.cartId,
            status: 'SENT',
            sentAt: new Date(),
            whatsappMessageId: result?.key?.id
          }
        });

        // تحديث الطابور
        await prisma.whatsAppNotificationQueue.update({
          where: { id: notification.id },
          data: { status: 'COMPLETED', processedAt: new Date() }
        });

        console.log(`✅ Queued notification sent: ${notification.eventType}`);

      } catch (error) {
        // زيادة عداد المحاولات
        const newRetryCount = notification.retryCount + 1;

        if (newRetryCount >= notification.maxRetries) {
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: { status: 'FAILED', retryCount: newRetryCount }
          });
        } else {
          // إعادة الجدولة بعد 5 دقائق
          await prisma.whatsAppNotificationQueue.update({
            where: { id: notification.id },
            data: {
              status: 'PENDING',
              retryCount: newRetryCount,
              scheduledAt: new Date(Date.now() + 5 * 60 * 1000)
            }
          });
        }

        console.error(`❌ Failed to process queued notification:`, error);
      }

      // تأخير بين الرسائل لتجنب الحظر
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Error processing notification queue:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جلب إحصائيات الإشعارات
 */
async function getNotificationStats(companyId, dateRange = 30) {
  const prisma = getSharedPrismaClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const [total, sent, delivered, read, failed, byCategory, byEvent] = await Promise.all([
    // إجمالي
    prisma.whatsAppNotificationLog.count({
      where: { companyId, createdAt: { gte: startDate } }
    }),
    // المرسلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'SENT', createdAt: { gte: startDate } }
    }),
    // المستلمة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'DELIVERED', createdAt: { gte: startDate } }
    }),
    // المقروءة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'READ', createdAt: { gte: startDate } }
    }),
    // الفاشلة
    prisma.whatsAppNotificationLog.count({
      where: { companyId, status: 'FAILED', createdAt: { gte: startDate } }
    }),
    // حسب التصنيف
    prisma.whatsAppNotificationLog.groupBy({
      by: ['category'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    }),
    // حسب الحدث
    prisma.whatsAppNotificationLog.groupBy({
      by: ['eventType'],
      where: { companyId, createdAt: { gte: startDate } },
      _count: true
    })
  ]);

  return {
    total,
    sent,
    delivered,
    read,
    failed,
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : 0,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count;
      return acc;
    }, {}),
    byEvent: byEvent.reduce((acc, item) => {
      acc[item.eventType] = item._count;
      return acc;
    }, {})
  };
}

/**
 * إرسال إشعار كسب نقاط ولاء
 */
async function sendLoyaltyPointsNotification(companyId, customer, points, currentPoints, reason) {
  const phone = customer?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId,
    recipientPhone: phone,
    recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
    recipientType: 'CUSTOMER',
    category: 'MARKETING',
    eventType: 'LOYALTY_POINTS_AWARDED',
    variables: {
      customerName: customer.firstName || 'عميلنا العزيز',
      points: points.toString(),
      currentPoints: currentPoints.toLocaleString(),
      reason: reason || 'شكراً لتعاملك معنا'
    },
    customerId: customer.id,
    priority: 3
  });
}

/**
 * إرسال إشعار السلفة
 */
async function sendLoanNotification(loanRequest, employee, status) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: loanRequest.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  let eventType;
  let variables = {
    employeeName: employee.firstName || employee.name,
    amount: loanRequest.amount?.toString(),
    currency: 'EGP',
    reason: loanRequest.reason || ''
  };

  if (status === 'CREATED') {
    eventType = 'LOAN_REQUEST_CREATED';
  } else if (status === 'APPROVED') {
    eventType = 'LOAN_APPROVED';
    variables.installmentsCount = loanRequest.installmentsCount?.toString() || '1';
  } else if (status === 'REJECTED') {
    eventType = 'LOAN_REJECTED';
    variables.reason = loanRequest.rejectedReason || 'غير محدد';
  }

  if (!eventType) return { success: false, reason: 'invalid_status' };

  return sendNotification({
    companyId: loanRequest.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType,
    variables,
    employeeId: employee.id,
    priority: 2
  });
}

/**
 * إرسال إشعار المكافأة
 */
async function sendRewardNotification(reward, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: reward.companyId }
  });

  if (!settings?.hrNotificationsEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: reward.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'BONUS_ISSUED',
    variables: {
      employeeName: employee.firstName || employee.name,
      amount: reward.calculatedValue?.toString(),
      currency: 'EGP',
      reason: reward.reason || reward.rewardName || 'مكافأة تميز',
      date: new Date().toLocaleDateString('ar-EG')
    },
    employeeId: employee.id,
    priority: 1
  });
}

/**
 * إرسال إشعار التحذير/الإنذار
 */
async function sendWarningNotification(warning, employee) {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId: warning.companyId }
  });

  if (!settings?.hrNotificationsEnabled || !settings.warningNotificationEnabled) {
    return { success: false, reason: 'disabled' };
  }

  const phone = employee?.phone;
  if (!phone) return { success: false, reason: 'no_phone' };

  return sendNotification({
    companyId: warning.companyId,
    recipientPhone: phone,
    recipientName: employee.firstName || employee.name,
    recipientType: 'EMPLOYEE',
    category: 'HR',
    eventType: 'WARNING_ISSUED',
    variables: {
      employeeName: employee.firstName || employee.name,
      date: warning.incidentDate ? new Date(warning.incidentDate).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG'),
      reason: warning.title || warning.description || 'مخالفة إدارية',
      warningType: warning.severity === 'major' ? 'سلوك جسيم' : warning.severity === 'critical' ? 'خطير' : 'تنبيه'
    },
    employeeId: employee.id,
    priority: 1
  });
}

async function sendNewSignupWelcomeNotification({
  companyId,
  recipientPhone,
  recipientName,
  email = '',
  customerId = null,
  signupType = 'platform_signup',
  companyName = '',
  deliveryStrategy = 'company'
}) {
  if (!recipientPhone) {
    return { success: false, reason: 'no_phone' };
  }

  const company = companyName ? null : await resolveCompanyContext(companyId);
  const resolvedCompanyName = companyName || company?.name || 'المنصة';
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  return sendNotification({
    companyId,
    deliveryCompanyId,
    recipientPhone,
    recipientName: recipientName || 'عميل جديد',
    recipientType: 'CUSTOMER',
    category: 'CUSTOMER',
    eventType: 'NEW_SIGNUP_WELCOME',
    variables: {
      customerName: recipientName || 'عميلنا العزيز',
      customerPhone: recipientPhone || '',
      email: email || '',
      companyName: resolvedCompanyName,
      signupTypeLabel: formatSignupTypeLabel(signupType),
      createdAt: formatNotificationDate(new Date()),
      supportLine: company?.phone || ''
    },
    customerId,
    priority: 2
  });
}

async function sendNewSignupAdminAlertNotification({
  companyId,
  recipientName,
  recipientPhone = '',
  email = '',
  signupType = 'platform_signup',
  companyName = '',
  audience = 'company-leadership',
  deliveryStrategy = 'platform-fallback'
}) {
  const { company, recipients } = await resolveAudienceRecipients(companyId, audience);
  const resolvedCompanyName = companyName || company?.name || 'المنصة';
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const variables = {
    customerName: recipientName || 'مسجل جديد',
    customerPhone: recipientPhone || '',
    email: email || '',
    companyName: resolvedCompanyName,
    signupTypeLabel: formatSignupTypeLabel(signupType),
    createdAt: formatNotificationDate(new Date())
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'NEW_SIGNUP_ADMIN_ALERT',
    variables: {
      ...variables,
      adminName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionCreatedNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  monthlyFee = 0,
  currency = 'EGP',
  billingCycle = 'monthly',
  nextBillingDate = null,
  trialDays = 0
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName: formatPlanLabel(planName),
    billingCycleLabel: formatBillingCycleLabel(billingCycle),
    monthlyFee: String(monthlyFee ?? 0),
    currency,
    nextBillingDate: formatNotificationDate(nextBillingDate),
    trialDays: String(trialDays ?? 0)
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_CREATED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_CREATED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionRenewedNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  monthlyFee = 0,
  currency = 'EGP',
  billingCycle = 'monthly',
  nextBillingDate = null
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName: formatPlanLabel(planName),
    billingCycleLabel: formatBillingCycleLabel(billingCycle),
    monthlyFee: String(monthlyFee ?? 0),
    currency,
    nextBillingDate: formatNotificationDate(nextBillingDate)
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_RENEWED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_RENEWED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendSubscriptionCancelledNotification({
  companyId,
  recipientPhone = '',
  recipientName = '',
  companyName = '',
  planName = '',
  reason = '',
  endDate = null
}) {
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, 'platform-only');
  const baseVariables = {
    customerName: recipientName || 'عميلنا العزيز',
    companyName,
    planName: formatPlanLabel(planName),
    reason: reason || 'غير محدد',
    endDate: formatNotificationDate(endDate || new Date())
  };

  if (recipientPhone) {
    return sendNotification({
      companyId,
      deliveryCompanyId,
      recipientPhone,
      recipientName: recipientName || 'إدارة الاشتراك',
      recipientType: 'ADMIN',
      category: 'SYSTEM',
      eventType: 'SUBSCRIPTION_CANCELLED',
      variables: baseVariables,
      priority: 2
    });
  }

  const { company, recipients } = await resolveCompanyOwnerRecipients(companyId);
  if (!recipients.length) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const resolvedVariables = {
    ...baseVariables,
    companyName: companyName || company?.name || 'المنصة'
  };

  return fanOutNotification(recipients, (recipient) => ({
    companyId,
    deliveryCompanyId,
    recipientPhone: recipient.phone,
    recipientName: recipient.name,
    recipientType: 'ADMIN',
    category: 'SYSTEM',
    eventType: 'SUBSCRIPTION_CANCELLED',
    variables: {
      ...resolvedVariables,
      customerName: recipient.name
    },
    priority: 2
  }));
}

async function sendNewsletterSubscribedNotification({
  companyId,
  email,
  recipientPhone = '',
  recipientName = '',
  customerId = null,
  companyName = '',
  sourceLabel = 'newsletter',
  notifyAdmins = true,
  adminDeliveryStrategy = 'platform-fallback'
}) {
  const company = companyName ? null : await resolveCompanyContext(companyId);
  const resolvedCompanyName = companyName || company?.name || 'المتجر';
  const subscribedAt = formatNotificationDate(new Date());
  const tasks = [];

  if (recipientPhone) {
    tasks.push(
      sendNotification({
        companyId,
        recipientPhone,
        recipientName: recipientName || 'مشترك جديد',
        recipientType: 'CUSTOMER',
        category: 'MARKETING',
        eventType: 'NEWSLETTER_SUBSCRIBED',
        variables: {
          customerName: recipientName || 'مشتركنا العزيز',
          customerPhone: recipientPhone || '',
          email: email || '',
          companyName: resolvedCompanyName,
          sourceLabel,
          subscribedAt
        },
        customerId,
        priority: 4
      })
    );
  }

  if (notifyAdmins) {
    const { recipients } = await resolveAudienceRecipients(companyId, 'company-admins');
    const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, adminDeliveryStrategy);
    if (recipients.length) {
      const variables = {
        customerName: recipientName || 'مشترك جديد',
        customerPhone: recipientPhone || '',
        email: email || '',
        companyName: resolvedCompanyName,
        sourceLabel,
        subscribedAt
      };

        tasks.push(
          fanOutNotification(recipients, (recipient) => ({
            companyId,
            deliveryCompanyId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name,
            recipientType: 'ADMIN',
          category: 'MARKETING',
          eventType: 'NEWSLETTER_SUBSCRIBED',
          variables: {
            ...variables,
            adminName: recipient.name
          },
          contentOverride: buildNewsletterAdminAlertContent(),
          priority: 4
        }))
      );
    }
  }

  if (!tasks.length) {
    return { success: false, reason: 'no_recipients' };
  }

  const results = await Promise.allSettled(tasks);
  return summarizeNotificationResults(
    results,
    tasks.map(() => ({ phone: recipientPhone || '', name: recipientName || email || 'newsletter' }))
  );
}

async function sendBenefitGrantedNotification({
  companyId,
  recipientPhone,
  recipientName,
  companyName = '',
  benefitTitle = 'ميزة جديدة',
  benefitSummary = '',
  couponCode = '',
  deliveryStrategy = 'company'
}) {
  if (!recipientPhone) {
    return { success: false, reason: 'no_phone' };
  }

  const company = companyName ? null : await resolveCompanyContext(companyId);
  const deliveryCompanyId = await resolveDeliveryCompanyId(companyId, deliveryStrategy);

  return sendNotification({
    companyId,
    deliveryCompanyId,
    recipientPhone,
    recipientName: recipientName || 'عميلنا العزيز',
    recipientType: 'CUSTOMER',
    category: 'MARKETING',
    eventType: 'BENEFIT_GRANTED',
    variables: {
      customerName: recipientName || 'عميلنا العزيز',
      companyName: companyName || company?.name || 'المنصة',
      benefitTitle,
      benefitSummary: benefitSummary || 'تمت إضافة ميزة جديدة إلى حسابك',
      couponCode: couponCode || 'لا يوجد'
    },
    priority: 3
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 التصدير
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // القوالب الافتراضية
  DEFAULT_TEMPLATES,

  // الدوال المساعدة
  replaceVariables,
  formatPhoneNumber,
  isQuietHours,
  resolveDeliveryCompanyId,

  // الإرسال
  sendNotification,
  scheduleNotification,
  sendNewSignupWelcomeNotification,
  sendNewSignupAdminAlertNotification,
  sendSubscriptionCreatedNotification,
  sendSubscriptionRenewedNotification,
  sendSubscriptionCancelledNotification,
  sendNewsletterSubscribedNotification,
  sendBenefitGrantedNotification,

  // إشعارات الطلبات
  sendOrderCreatedNotification,
  sendOrderStatusNotification,

  // إشعارات العربة المتروكة
  sendAbandonedCartNotification,

  // إشعارات المنتجات
  sendBackInStockNotification,

  // إشعارات الموارد البشرية
  sendAttendanceReminderNotification,
  sendAttendanceConfirmedNotification,
  sendAttendanceLateNotification,
  sendAttendanceLateWithDeductionNotification,
  sendCheckoutConfirmedNotification,
  sendLeaveApprovalNotification,
  sendPayrollNotification,
  sendManualDeductionNotification,
  sendAssetRequestNotification,
  sendLoanNotification,
  sendRewardNotification,
  sendWarningNotification,
  sendBirthdayNotification,
  sendResignationNotification,

  // إشعارات الولاء
  sendLoyaltyPointsNotification,

  // معالج الطابور
  processNotificationQueue,

  // الإحصائيات
  getNotificationStats
};

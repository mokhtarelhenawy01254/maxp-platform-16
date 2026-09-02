/**
 * 🔔 DEFAULT_TEMPLATES — القوالب الافتراضية للإشعارات.
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.1): مستخرجة من WhatsAppNotificationService.js
 * لتقليل حجم الملف (صيانة). بيانات نقية بلا دوال.
 */
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
    // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.2): لا هاردكود اسم شركة —
    // قوالب الطلبات تُدار من DB (صفحة /orders/status-templates)؛ الـ footer
    // يُحل ديناميكياً من company.name عند الإرسال.
    footer: ""
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

  INCOMPLETE_CART_FIRST_APPEARANCE: {
    name: 'رسالة أول ظهور - طلب غير مكتمل',
    content: `مرحباً {customerName} 👋

لاحظنا أنك بدأت طلباً ولم تُكمله بعد!

🛒 لديك {itemCount} منتج بقيمة {total} {currency}

نحن هنا لمساعدتك — أكمل طلبك الآن!`,
    variables: ['customerName', 'itemCount', 'total', 'currency']
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

  LOYALTY_TIER_UPGRADED: {
    name: 'إشعار الترقية لمستوى أعلى',
    content: `مبروك {customerName}! 🏆

تم ترقيتك إلى مستوى {tierName}!

بفضل ولائك المستمر أصبحت تتمتع بمزايا خاصة:
- خصم على طلباتك القادمة
- شحن مجاني (حسب الإعدادات)

شكراً لأنك عميل مميز عندنا! 💎`,
    variables: ['customerName', 'tierName']
  },

  LOYALTY_TIER_DOWNGRADED: {
    name: 'إشعار انخفاض المستوى',
    content: `مرحباً {customerName} 🙏

نود إعلامك أن مستواك في برنامج الولاء أصبح {tierName}.

لا تقلق! يمكنك العودة لمستواك السابق من خلال مزيد من الطلبات.
نقدّر وجودك معنا دائماً 💙`,
    variables: ['customerName', 'tierName']
  },

  LOYALTY_POINTS_EXPIRY_WARNING: {
    name: 'تنبيه قرب انتهاء النقاط',
    content: `عزيزنا {customerName} ⏰

نذكّرك أن لديك {points} نقطة ولاء تنتهي بتاريخ {expiryDate}.

استخدم نقاطك قبل انتهاء صلاحيتها حتى لا تضيع!
شكراً لولائك لنا 💙`,
    variables: ['customerName', 'points', 'expiryDate', 'programName']
  },

  LOYALTY_POINTS_EXPIRED: {
    name: 'إشعار انتهاء صلاحية النقاط',
    content: `عزيزنا {customerName} 💔

نأسف لإعلامك بانتهاء صلاحية {points} نقطة من نقاط الولاء الخاصة بك في برنامج {programName}.

لا تحزن! يمكنك كسب نقاط جديدة مع كل طلب 🛒
تابع شكراً لولائك لنا 💙`,
    variables: ['customerName', 'points', 'programName']
  },

  LOYALTY_POINTS_REDEEMED: {
    name: 'تأكيد استبدال النقاط',
    content: `عزيزنا {customerName} ✅

تم استبدال نقاط الولاء الخاصة بك بنجاح!

🏷️ عدد النقاط: {points}
💰 القيمة: {cashAmount} {currency}

سيتم خصم القيمة من طلبك القادم.
شكراً لاختيارك لنا! 💙`,
    variables: ['customerName', 'points', 'cashAmount', 'currency', 'programName']
  },

  CASHBACK_CREDITED: {
    name: 'إشعار ايداع كاش باك',
    content: `مبروك {customerName}! 🎉

تم ايداع {amount} {currency} كاش باك في محفظتك!

📦 الطلب: #{orderNumber}
💰 رصيدك الحالي: {balance} {currency}

يمكنك استخدام رصيدك في طلبك القادم 💙`,
    variables: ['customerName', 'amount', 'currency', 'orderNumber', 'balance']
  },

  CASHBACK_REVERSED: {
    name: 'إشعار خصم كاش باك',
    content: `عزيزنا {customerName} ℹ️

تم خصم مبلغ {amount} {currency} من رصيد الكاش باك الخاص بك.

📦 الطلب: #{orderNumber}

لأي استفسار تواصل معنا 💙`,
    variables: ['customerName', 'amount', 'currency', 'orderNumber', 'balance']
  },

  CUSTOMER_QUALITY_UPGRADED: {
    name: 'إشعار ارتفاع تصنيف الجودة',
    content: `مبروك {customerName}! 🌟

تم رفع تصنيف جودتك إلى {qualityTier} بتقييم {score} من 100!

أنت من عملائنا المميزين ونقدّر ثقتك 💎`,
    variables: ['customerName', 'qualityTier', 'score']
  },

  CUSTOMER_QUALITY_DOWNGRADED: {
    name: 'إشعار انخفاض تصنيف الجودة',
    content: `عزيزنا {customerName} 🙏

تم تحديث تصنيف جودتك إلى {qualityTier}.

نحاول دائماً تحسين تجربتك معنا،
تواصل معنا لأي استفسار 💙`,
    variables: ['customerName', 'qualityTier']
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
  },

  TASK_SUBTASK_CREATED: {
    name: 'مهمة فرعية جديدة',
    content: `مرحباً {userName} 👋
    
تم إنشاء مهمة فرعية ضمن المهمة: {parentTaskTitle}
📌 العنوان: {subtaskTitle}
📅 تاريخ الاستحقاق: {dueDate}

يرجى مراجعة التفاصيل في لوحة التحكم.`,
    variables: ['userName', 'parentTaskTitle', 'subtaskTitle', 'dueDate']
  },

  TASK_TIME_ENTRY_ADDED: {
    name: 'تسجيل وقت على مهمة',
    content: `مرحباً {userName} ⏱️

تم تسجيل وقت على المهمة: {taskTitle}
⏱️ المدة: {duration}
📝 النوع: {entryType}

تم تحديث إجمالي الوقت المسجل للمهمة.`,
    variables: ['userName', 'taskTitle', 'duration', 'entryType']
  },

  TASK_CHECKLIST_ITEM_COMPLETED: {
    name: 'إتمام عنصر في قائمة التحقق',
    content: `مرحباً {userName} ✅

{itemContent}
في المهمة: {taskTitle}
من إنجاز: {completedBy}

تم تسجيل الإنجاز في سجل المهمة.`,
    variables: ['userName', 'itemContent', 'taskTitle', 'completedBy']
  },

  // الخصم التلقائي
  AUTO_DISCOUNT_COUPON_GRANTED: {
    name: 'منح كوبون الخصم التلقائي',
    content: `مبروك {customerName}! 🎁

شكراً لتسوقك معنا! هديتنا لك: كوبون خصم {discountPercent}% على طلبك القادم!

💰 قيمة الكوبون: {voucherAmount} {currency}
📅 صالح حتى: {expiryDate}

استخدم الكوبون في طلبك القادم قبل انتهاء صلاحيته!
شكراً لثقتك بنا 💙`,
    variables: ['customerName', 'discountPercent', 'voucherAmount', 'currency', 'expiryDate']
  },

  AUTO_DISCOUNT_COUPON_EXPIRING: {
    name: 'تنبيه قرب انتهاء كوبون الخصم',
    content: `عزيزنا {customerName} ⏰

نذكّرك أن كوبون الخصم التلقائي الخاص بك (خصم {discountPercent}%) ينتهي بتاريخ {expiryDate}.

استخدمه في طلبك القادم قبل انتهاء صلاحيته حتى لا يضيع!
شكراً لثقتك بنا 💙`,
    variables: ['customerName', 'discountPercent', 'expiryDate']
  },

  AUTO_DISCOUNT_CASHBACK_CONVERTED: {
    name: 'تحويل الكوبون المنتهي إلى كاش باك',
    content: `عزيزنا {customerName} 💰

انتهت صلاحية كوبون الخصم التلقائي الخاص بك، لذلك حوّلنا قيمته إلى كاش باك!

💵 تم إيداع: {voucherAmount} {currency} في محفظتك

يمكنك استخدام رصيدك في طلبك القادم 💙`,
    variables: ['customerName', 'voucherAmount', 'currency']
  },

  SERVICE_ORDER_CREATED: {
    name: 'تأكيد طلب خدمة',
    content: `مرحباً بك {customerName} ✨

شكراً لطلبك من خلالنا! لقد استلمنا طلبك لخدمة: *{serviceName}* بنجاح.

📋 تفاصيل الطلب:
🆔 رقم الطلب: #{orderId}
🛠️ الخدمة: {serviceName}
{priceInfo}
📝 وصف الطلب:
{description}

فريقنا يقوم حالياً بمراجعة التفاصيل والمرفقات، وسيتم التواصل معك ومتابعة التنفيذ في أقرب وقت بإذن الله 🙏✨`,
    variables: ['customerName', 'serviceName', 'orderId', 'priceInfo', 'description']
  },

  SERVICE_ORDER_IN_PROGRESS: {
    name: 'بدء تنفيذ طلب الخدمة',
    content: `مرحباً {customerName} 🚀

يسعدنا إبلاغك بأنه تم البدء في تنفيذ طلبك لخدمة: *{serviceName}* (رقم #{orderId}).

سنوافيك بالتحديثات والنتيجة فور الانتهاء بإذن الله ✨`,
    variables: ['customerName', 'serviceName', 'orderId']
  },

  SERVICE_ORDER_COMPLETED: {
    name: 'اكتمال طلب الخدمة',
    content: `مرحباً {customerName} 🎉

تم إنجاز طلبك لخدمة: *{serviceName}* (رقم #{orderId}) بنجاح وهو الآن جاهز للتسليم!

نشكرك على ثقتك بنا، ويسعدنا دائماً خدمتك 🙏✨`,
    variables: ['customerName', 'serviceName', 'orderId']
  },

  SERVICE_ORDER_CANCELLED: {
    name: 'إلغاء طلب الخدمة',
    content: `مرحباً {customerName} ⚠️

نود إبلاغك بأنه تم إلغاء طلب الخدمة: *{serviceName}* (رقم #{orderId}).

إذا كان لديك أي استفسار أو ترغب في تعديل الطلب، لا تتردد بالتواصل معنا مباشرة 🙏`,
    variables: ['customerName', 'serviceName', 'orderId']
  },

  SERVICE_ORDER_ADMIN_ALERT: {
    name: 'تنبيه طلب خدمة جديد للإدارة',
    content: `🔔 *طلب خدمة جديد وارد!*

👤 العميل: {customerName}
📱 الهاتف: {customerPhone}
🛠️ الخدمة: {serviceName}
{priceInfo}
📎 المرفقات: {filesCount} ملف
📝 الوصف:
{description}

يمكنك مراجعة الطلب والمرفقات عبر لوحة التحكم 🚀`,
    variables: ['customerName', 'customerPhone', 'serviceName', 'priceInfo', 'filesCount', 'description']
  }
}

module.exports = DEFAULT_TEMPLATES;

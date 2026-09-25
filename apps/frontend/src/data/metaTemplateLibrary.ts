export interface LibraryTemplate {
  id: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  description: string;
  languages: { code: string; headerText: string; bodyText: string; footerText: string }[];
  buttonText?: string;
  buttonUrl?: string;
  headerFormat?: string;
  defaultLanguage?: string;
  tags: string[];
}

/**
 * 🌟 مكتبة قوالب ميتا المعتمدة إنتاجياً (Production-Proven Meta Templates)
 * مستخرجة ومبنية مباشرةً من القوالب المعتمدة رسمياً بحسابات الإنتاج الحقيقية لشركة Swan،
 * بعد تنظيفها وتعميمها لتكون متوافقة 100% مع شروط Meta وتعمل لجميع المتاجر والشركات.
 *
 * معايير الامتثال الصارمة المطبقة:
 * 1. التذييل (Footer) خالي تماماً من أي متغيرات (نص ثابت فقط ≤ 60 حرفاً).
 * 2. ترقيم المتغيرات في الرسالة يبدأ دائماً بـ {{1}} ويتسلسل تصاعدياً بلا أي عكس للترتيب.
 * 3. رأس الرسالة (Header) نص ثابت أنيق بدون متغيرات تسبب أخطاء عدم تطابق.
 * 4. نصوص واقعية باللهجة التجارية المحببة والمجربة في رفع نسب الاستلام والتفاعل.
 */
export const templateLibrary: LibraryTemplate[] = [
  // ==========================================
  // 📦 باقة دورة حياة الطلبات (Order Lifecycle)
  // ==========================================
  {
    id: "order_created",
    name: "order_created",
    category: "UTILITY",
    description: "إشعار طلب جديد للعميل مستعد للتأكيد مع توضيح تفاصيل الطلب والمبلغ الإجمالي",
    tags: ["order", "created", "confirmation", "ecommerce"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تأكيد الطلب",
    buttonUrl: "https://example.com/order",
    languages: [
      {
        code: "ar",
        headerText: "طلب جديد مستعد للتأكيد 📦",
        bodyText: "أهلًا بحضرتك يا {{1}} 👋\nطلبك رقم {{2}} مستعد للتأكيد:\n\n📦 محتويات الطلب:\n{{3}}\n\n💰 الإجمالي: {{4}} {{5}}\n\nلو كل البيانات مظبوطة اضغط لتأكيد الطلب للبدء في التجهيز فوراً 🙏",
        footerText: "فريق خدمة العملاء",
      },
      {
        code: "en",
        headerText: "New Order Confirmation 📦",
        bodyText: "Hello {{1}} 👋\nYour order #{{2}} is ready for confirmation:\n\n📦 Order items:\n{{3}}\n\n💰 Total: {{4}} {{5}}\n\nPlease confirm your order details to proceed with preparation 🙏",
        footerText: "Customer Support Team",
      },
    ],
  },
  {
    id: "order_confirmed",
    name: "order_confirmed",
    category: "UTILITY",
    description: "تأكيد استلام الطلب وبدء مرحلة التجهيز مع توضيح موعد الشحن المتوقع",
    tags: ["order", "confirmed", "processing", "ecommerce"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تفاصيل الطلب",
    buttonUrl: "https://example.com/order",
    languages: [
      {
        code: "ar",
        headerText: "تم تأكيد طلبك بنجاح ✅",
        bodyText: "أهلًا بحضرتك يا {{1}} ✨\nتم تأكيد طلبك رقم {{2}} بنجاح.\n\n📦 تفاصيل الطلب:\n{{3}}\n\n💰 الإجمالي: {{4}} {{5}}\n\nالطلب هيوصلك خلال 2 إلى 4 أيام عمل، وأول ما يخرج للشحن هنبلغ حضرتك فوراً 🙏",
        footerText: "شكراً لثقتكم بنا",
      },
      {
        code: "en",
        headerText: "Order Confirmed Successfully ✅",
        bodyText: "Hello {{1}} ✨\nYour order #{{2}} has been confirmed.\n\n📦 Items:\n{{3}}\n\n💰 Total: {{4}} {{5}}\n\nYour order will arrive within 2 to 4 business days. We will notify you once shipped 🙏",
        footerText: "Thank you for shopping with us",
      },
    ],
  },
  {
    id: "order_shipped",
    name: "order_shipped",
    category: "UTILITY",
    description: "إشعار خروج الشحنة مع شركة الشحن وتفاصيل التوصيل المتوقعة",
    tags: ["order", "shipped", "delivery", "tracking"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تتبع الشحنة",
    buttonUrl: "https://example.com/track",
    languages: [
      {
        code: "ar",
        headerText: "طلبك في الطريق إليك 🚚",
        bodyText: "أهلًا بحضرتك يا {{1}} 👋\nتم شحن طلبك رقم {{2}} وهو الآن في الطريق إليك 🚚\n\nالشحنة ستصلك خلال يومين عمل.\nإذا احتجت أي استفسار أو متابعة، تواصل معنا فوراً ويسعدنا مساعدتك 🙏",
        footerText: "فريق التوصيل والمتابعة",
      },
      {
        code: "en",
        headerText: "Your Order is on the Way 🚚",
        bodyText: "Hello {{1}} 👋\nYour order #{{2}} has been shipped and is on its way 🚚\n\nExpected delivery within 2 business days.\nIf you have any questions, feel free to contact us anytime 🙏",
        footerText: "Delivery & Tracking Team",
      },
    ],
  },
  {
    id: "order_with_captain",
    name: "order_with_captain",
    category: "UTILITY",
    description: "إشعار العميل بأن الطلب مع مندوب التوصيل للتسليم على مدار اليوم",
    tags: ["order", "delivery", "captain", "today"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "متابعة التوصيل",
    buttonUrl: "https://example.com/track",
    languages: [
      {
        code: "ar",
        headerText: "طلبك مع المندوب اليوم 🛵",
        bodyText: "مساء الخير {{1}} 👋\nطلبك رقم {{2}} مع المندوب ومقرر تسليمه لحضرتك على مدار اليوم 🛵\n\nيرجى التواجد لاستلام الشحنة، ولو عندك أي ملاحظة أو استفسار بلغنا فوراً لمساعدتك 🙏",
        footerText: "فريق خدمة العملاء",
      },
      {
        code: "en",
        headerText: "Out for Delivery Today 🛵",
        bodyText: "Good day {{1}} 👋\nYour order #{{2}} is with the courier and scheduled for delivery today 🛵\n\nPlease be available to receive your package. Contact us if you need any assistance 🙏",
        footerText: "Customer Support Team",
      },
    ],
  },
  {
    id: "order_delivered",
    name: "order_delivered",
    category: "UTILITY",
    description: "تأكيد إتمام تسليم الطلب للعميل واستطلاع رأيه في تجربة الشراء",
    tags: ["order", "delivered", "review", "satisfaction"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تقييم الطلب",
    buttonUrl: "https://example.com/review",
    languages: [
      {
        code: "ar",
        headerText: "تم تسليم الطلب بنجاح 🌷",
        bodyText: "أهلاً بحضرتك يا {{1}} 🌷\nتم تأكيد استلام طلبك رقم {{2}} بنجاح ✅\n💰 قيمة الطلب: {{3}} {{4}}\n\nنتمنى أن ينال المنتج إعجابك، ويسعدنا جداً مشاركتنا رأيك وتقييمك لتجربة الشراء ❤️",
        footerText: "شكراً لاختياركم متجرنا",
      },
      {
        code: "en",
        headerText: "Order Delivered Successfully 🌷",
        bodyText: "Hello {{1}} 🌷\nYour order #{{2}} has been successfully delivered ✅\n💰 Total: {{3}} {{4}}\n\nWe hope you love your purchase! We would love to hear your feedback on your experience ❤️",
        footerText: "Thank you for shopping with us",
      },
    ],
  },
  {
    id: "order_delayed_reschedule",
    name: "order_delayed_reschedule",
    category: "UTILITY",
    description: "متابعة الطلب في حالة تأجيل المندوب وتنسيق موعد تسليم جديد يناسب العميل",
    tags: ["order", "delayed", "reschedule", "support"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تحديد موعد الاستلام",
    buttonUrl: "https://example.com/reschedule",
    languages: [
      {
        code: "ar",
        headerText: "تحديث بخصوص موعد طلبك ⏰",
        bodyText: "مساء الخير {{1}} 👋\nبخصوص طلبك رقم {{2}}، أفاد المندوب بتأجيل موعد التسليم.\n\nهل تفضل تحديد موعد تسليم بديل يناسب حضرتك؟ أرسل لنا الموعد المناسب وسنقوم بترتيبه فوراً 🙏",
        footerText: "فريق المتابعة والدعم",
      },
      {
        code: "en",
        headerText: "Order Delivery Update ⏰",
        bodyText: "Good day {{1}} 👋\nRegarding your order #{{2}}, the courier reported a delivery postponement.\n\nWould you like to reschedule a delivery time that suits you best? Reply with your preferred time 🙏",
        footerText: "Customer Care Team",
      },
    ],
  },
  {
    id: "order_returned",
    name: "order_returned",
    category: "UTILITY",
    description: "متابعة المرتجع والاستفسار المهذب من العميل عن سبب الإرجاع للمساعدة",
    tags: ["order", "returned", "recovery", "support"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تواصل مع الدعم",
    buttonUrl: "https://example.com/support",
    languages: [
      {
        code: "ar",
        headerText: "متابعة بخصوص طلبك 📋",
        bodyText: "مساء الخير {{1}} 👋\nأفادت شركة الشحن بوجود مرتجع لطلبك رقم {{2}}.\n\nحابين نتأكد من حضرتك لو واجهت أي مشكلة أو كان عندك أي ملاحظة لنساعدك ونرتب الاستلام بالشكل الأنسب لك 🙏",
        footerText: "فريق الدعم والاهتمام بالعملاء",
      },
      {
        code: "en",
        headerText: "Regarding Your Return 📋",
        bodyText: "Good day {{1}} 👋\nThe courier reported a return for your order #{{2}}.\n\nWe would love to know if you faced any issue or have any feedback so we can assist and resolve it for you 🙏",
        footerText: "Customer Support Team",
      },
    ],
  },
  {
    id: "order_exchanged",
    name: "order_exchanged",
    category: "UTILITY",
    description: "تأكيد طلب استبدال منتج وتوضيح تفاصيل البديل وفرق السعر",
    tags: ["order", "exchanged", "replacement"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تفاصيل الاستبدال",
    buttonUrl: "https://example.com/order",
    languages: [
      {
        code: "ar",
        headerText: "تأكيد طلب الاستبدال 🔄",
        bodyText: "أهلاً بحضرتك يا {{1}} 👋\nتم تسجيل طلب استبدال جديد لحضرتك برقم: {{2}}\n\n🔄 تفاصيل الاستبدال:\n{{3}}\n\n💰 المبلغ المطلوب تحصيله: {{4}} {{5}}\n\nسيتم تجهيز وشحن الطلب البديل لحضرتك في أقرب وقت 🙏",
        footerText: "خدمة ما بعد البيع",
      },
      {
        code: "en",
        headerText: "Exchange Order Confirmed 🔄",
        bodyText: "Hello {{1}} 👋\nA replacement order #{{2}} has been initiated for you.\n\n🔄 Exchange details:\n{{3}}\n\n💰 Amount due: {{4}} {{5}}\n\nYour replacement will be prepared and dispatched shortly 🙏",
        footerText: "After-Sales Support",
      },
    ],
  },
  {
    id: "order_cancelled",
    name: "order_cancelled",
    category: "UTILITY",
    description: "تأكيد إلغاء الطلب مع خيار استئنافه إذا تم الإلغاء بطريق الخطأ",
    tags: ["order", "cancelled", "support"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "إعادة تفعيل الطلب",
    buttonUrl: "https://example.com/order",
    languages: [
      {
        code: "ar",
        headerText: "تأكيد إلغاء الطلب ⚠️",
        bodyText: "مساء الخير {{1}} 👋\nنود إعلامك بأنه تم إلغاء طلبك رقم {{2}} بناءً على رغبتك.\n\nإذا كان الإلغاء قد تم عن طريق الخطأ أو ترغب في إعادة تفعيل الطلب، تواصل معنا ويسعدنا دائماً خدمتك 🙏",
        footerText: "فريق خدمة العملاء",
      },
      {
        code: "en",
        headerText: "Order Cancellation Confirmed ⚠️",
        bodyText: "Good day {{1}} 👋\nYour order #{{2}} has been cancelled as requested.\n\nIf this was done by mistake or you wish to reinstate your order, please reach out to us anytime 🙏",
        footerText: "Customer Care Team",
      },
    ],
  },

  // ==========================================
  // 💎 باقة برامج الولاء والكاش باك (Loyalty & Retention)
  // ==========================================
  {
    id: "loyalty_points_awarded",
    name: "loyalty_points_awarded",
    category: "UTILITY",
    description: "إشعار كسب نقاط ولاء جديدة بعد الشراء أو التقييم وتحديث رصيد النقاط",
    tags: ["loyalty", "points", "reward"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "عرض رصيد النقاط",
    buttonUrl: "https://example.com/loyalty",
    languages: [
      {
        code: "ar",
        headerText: "مبروك! كسبت نقاط ولاء 💎",
        bodyText: "أهلاً {{1}} 💎\nتمت إضافة {{2}} نقطة ولاء جديدة إلى حسابك بنجاح!\n\nرصيدك الإجمالي الحالي: {{3}} نقطة.\n\nتقدر تستخدم نقاطك للحصول على خصومات حصرية في طلباتك القادمة ✨",
        footerText: "برنامج مكافآت العملاء",
      },
      {
        code: "en",
        headerText: "You Earned Reward Points! 💎",
        bodyText: "Hello {{1}} 💎\n{{2}} loyalty points have been credited to your account!\n\nYour total balance: {{3}} points.\n\nRedeem your points for exclusive discounts on your upcoming orders ✨",
        footerText: "Customer Loyalty Program",
      },
    ],
  },
  {
    id: "loyalty_points_expiry_warning",
    name: "loyalty_points_expiry_warning",
    category: "MARKETING",
    description: "تنبيه العميل بقرب انتهاء صلاحية نقاطه لحثه على استغلالها قبل ضياعها",
    tags: ["loyalty", "points", "expiry", "marketing"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "استخدم نقاطك الآن",
    buttonUrl: "https://example.com/store",
    languages: [
      {
        code: "ar",
        headerText: "تنبيه: نقاطك قاربت على الانتهاء ⏳",
        bodyText: "أهلاً {{1}} ⏳\nنود تذكيرك بأن لديك {{2}} نقطة من رصيد نقاطك ستنتهي صلاحيتها بتاريخ {{3}}.\n\nرصيدك الحالي: {{4}} نقطة.\n\nلا تفوت الفرصة واستفد من رصيدك في طلبك القادم قبل انتهاء الصلاحية ✨",
        footerText: "برنامج مكافآت العملاء",
      },
      {
        code: "en",
        headerText: "Points Expiring Soon! ⏳",
        bodyText: "Hello {{1}} ⏳\nA quick reminder that {{2}} points from your balance will expire on {{3}}.\n\nTotal points balance: {{4}}.\n\nDon't miss out! Use your points on your next purchase before they expire ✨",
        footerText: "Customer Loyalty Program",
      },
    ],
  },
  {
    id: "loyalty_points_redeemed",
    name: "loyalty_points_redeemed",
    category: "UTILITY",
    description: "تأكيد استخدام نقاط الولاء وتطبيق الخصم على الطلب ورصيد النقاط المتبقي",
    tags: ["loyalty", "points", "redeemed"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "رصيد المكافآت",
    buttonUrl: "https://example.com/loyalty",
    languages: [
      {
        code: "ar",
        headerText: "تم استبدال النقاط بنجاح ✨",
        bodyText: "أهلاً {{1}} ✨\nتم بنجاح استخدام {{2}} نقطة من رصيد حسابك.\n\n💰 قيمة الخصم المستفاد: {{3}} {{4}}\nرصيدك المتبقي: {{5}} نقطة.\n\nشكراً لتسوقك معنا ونتمنى لك تجربة ممتعة دائماً 🙏",
        footerText: "برنامج مكافآت العملاء",
      },
      {
        code: "en",
        headerText: "Points Redeemed Successfully ✨",
        bodyText: "Hello {{1}} ✨\n{{2}} loyalty points have been redeemed successfully.\n\n💰 Discount value: {{3}} {{4}}\nRemaining points balance: {{5}}.\n\nThank you for shopping with us 🙏",
        footerText: "Customer Loyalty Program",
      },
    ],
  },
  {
    id: "cashback_credited",
    name: "cashback_credited",
    category: "UTILITY",
    description: "إشعار إيداع رصيد كاش باك في المحفظة الإلكترونية للعميل وتحديث الرصيد",
    tags: ["cashback", "wallet", "money", "loyalty"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "فتح محفظتي",
    buttonUrl: "https://example.com/wallet",
    languages: [
      {
        code: "ar",
        headerText: "تم إيداع كاش باك في محفظتك 💰",
        bodyText: "أهلاً {{1}} 💰\nتمت إضافة مبلغ {{2}} {{3}} كاش باك إلى محفظتك الإلكترونية بنجاح!\n\nرصيد محفظتك المتاح الآن: {{4}} {{3}}.\n\nيمكنك استخدام هذا الرصيد في أي وقت لإتمام مشترياتك القادمة ✨",
        footerText: "محفظة المكافآت",
      },
      {
        code: "en",
        headerText: "Cashback Credited to Your Wallet 💰",
        bodyText: "Hello {{1}} 💰\n{{2}} {{3}} cashback has been added to your electronic wallet!\n\nAvailable wallet balance: {{4}} {{3}}.\n\nUse your wallet balance anytime on your upcoming purchases ✨",
        footerText: "Rewards Wallet",
      },
    ],
  },
  {
    id: "cashback_reversed",
    name: "cashback_reversed",
    category: "UTILITY",
    description: "تعديل رصيد الكاش باك عند إرجاع أو تعديل طلب وتوضيح الرصيد الجديد",
    tags: ["cashback", "wallet", "deduction"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تفاصيل المحفظة",
    buttonUrl: "https://example.com/wallet",
    languages: [
      {
        code: "ar",
        headerText: "تحديث رصيد المحفظة 📋",
        bodyText: "أهلاً {{1}} 📋\nتم تعديل رصيد الكاش باك بخصم {{2}} {{3}} نظراً لإلغاء أو إرجاع طلب.\n\nرصيد محفظتك الحالي: {{4}} {{3}}.\n\nلأي استفسار بخصوص الرصيد، يسعدنا تواصلك مع خدمة العملاء في أي وقت 🙏",
        footerText: "خدمة العملاء",
      },
      {
        code: "en",
        headerText: "Wallet Balance Update 📋",
        bodyText: "Hello {{1}} 📋\nYour cashback balance was adjusted by -{{2}} {{3}} due to an order return or cancellation.\n\nCurrent wallet balance: {{4}} {{3}}.\n\nIf you have any questions, feel free to contact customer support 🙏",
        footerText: "Customer Support",
      },
    ],
  },
  {
    id: "customer_quality_upgraded",
    name: "customer_quality_upgraded",
    category: "MARKETING",
    description: "تهنئة العميل بالترقية لمستوى VIP أعلى وتوضيح المزايا الحصرية",
    tags: ["loyalty", "tier", "vip", "upgrade"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "عرض مميزات العضوية",
    buttonUrl: "https://example.com/vip",
    languages: [
      {
        code: "ar",
        headerText: "تهانينا! تمت ترقية عضويتك 🌟",
        bodyText: "أهلاً {{1}} 🌟\nتهانينا! تم ترقية مستوى حسابك إلى: {{2}} 🎉\n\nاستمتع الآن بمزايا وخصومات استثنائية مخصصة لعملاء هذا المستوى.\nشكراً لثقتك الدائمة ويسعدنا دائماً خدمتك ✨",
        footerText: "نادي كبار العملاء",
      },
      {
        code: "en",
        headerText: "Congratulations! Tier Upgraded 🌟",
        bodyText: "Hello {{1}} 🌟\nCongratulations! Your account tier has been upgraded to: {{2}} 🎉\n\nEnjoy exclusive perks, priority support, and special discounts.\nThank you for being a valued customer ✨",
        footerText: "VIP Customer Club",
      },
    ],
  },
  {
    id: "auto_discount_cashback_converted",
    name: "auto_discount_cashback_converted",
    category: "MARKETING",
    description: "مبادرة ذكية لتحويل قسائم الخصم المنتهية إلى رصيد نقدي في محفظة العميل",
    tags: ["cashback", "coupon", "retention"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تسوق بالرصيد الآن",
    buttonUrl: "https://example.com/store",
    languages: [
      {
        code: "ar",
        headerText: "هدية لك: تحويل الكوبون إلى رصيد 🎁",
        bodyText: "أهلاً {{1}} 🎁\nحرصاً على استفادتك، قمنا بتحويل قيمة الكوبون المنتهي {{2}} إلى رصيد كاش باك في محفظتك بمبلغ {{3}} {{4}}!\n\nرصيدك الحالي: {{5}} {{4}}.\n\nتسوق الآن واستمتع برصيدك ✨",
        footerText: "فريق الاهتمام بالعملاء",
      },
      {
        code: "en",
        headerText: "Special Gift: Coupon to Wallet Credit 🎁",
        bodyText: "Hello {{1}} 🎁\nTo ensure you don't lose value, we converted your expired coupon {{2}} into a {{3}} {{4}} wallet credit!\n\nCurrent wallet balance: {{5}} {{4}}.\n\nShop now and enjoy your credit ✨",
        footerText: "Customer Care Team",
      },
    ],
  },

  // ==========================================
  // 🛒 باقة السلة المتروكة (Abandoned Cart)
  // ==========================================
  {
    id: "abandoned_cart_reminder",
    name: "abandoned_cart_reminder",
    category: "MARKETING",
    description: "تذكير العميل بالسلة المتروكة مع دعوة لحجز المنتجات وإتمام الطلب",
    tags: ["cart", "abandoned", "recovery"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "إتمام الشراء الآن",
    buttonUrl: "https://example.com/cart",
    languages: [
      {
        code: "ar",
        headerText: "سلة تسوقك في انتظارك 🛒",
        bodyText: "أهلاً {{1}} 👋\nلاحظنا أنك تركت بعض المنتجات المميزة في سلة التسوق 🛍️\n\nإجمالي السلة: {{2}} {{3}}\n\nالمنتجات لا تزال محجوزة لك لفترة محدودة، اضغط أدناه لإتمام طلبك قبل نفاد الكمية! ✨",
        footerText: "فريق المبيعات",
      },
      {
        code: "en",
        headerText: "Your Cart is Waiting for You 🛒",
        bodyText: "Hello {{1}} 👋\nYou left some great items waiting in your shopping cart 🛍️\n\nCart total: {{2}} {{3}}\n\nItems are reserved for a limited time. Tap below to complete your order before stocks run out! ✨",
        footerText: "Sales Team",
      },
    ],
  },
];

export interface LibraryTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  languages: { code: string; headerText: string; bodyText: string; footerText: string }[];
  buttonText?: string;
  buttonUrl?: string;
  headerFormat?: string;
  defaultLanguage?: string;
  tags: string[];
}

export const templateLibrary: LibraryTemplate[] = [
  {
    id: "otp_verification",
    name: "otp_verification",
    category: "AUTHENTICATION",
    description: "رمز التحقق لمرة واحدة (OTP) — يُستخدم لتأكيد هوية المستخدم عند تسجيل الدخول أو تنفيذ معاملات حساسة",
    tags: ["OTP", "auth", "verification", "login"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تأكيد الرمز",
    buttonUrl: "https://example.com/verify",
    languages: [
      { code: "ar", headerText: "رمز التحقق", bodyText: "مرحباً {{1}}\n\nرمز التحقق الخاص بك هو:\n{{2}}\n\nهذا الرمز صالح لمدة 5 دقائق. إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.", footerText: "فريق الدعم الفني" },
      { code: "en", headerText: "Verification Code", bodyText: "Hi {{1}},\n\nYour verification code is:\n{{2}}\n\nThis code is valid for 5 minutes. If you didn't request this code, please ignore this message.", footerText: "Support Team" },
      { code: "fr", headerText: "Code de vérification", bodyText: "Bonjour {{1}},\n\nVotre code de vérification est :\n{{2}}\n\nCe code est valable 5 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.", footerText: "Équipe d'assistance" },
      { code: "tr", headerText: "Doğrulama Kodu", bodyText: "Merhaba {{1}},\n\nDoğrulama kodunuz:\n{{2}}\n\nBu kod 5 dakika geçerlidir. Bu kodu siz istemediyseniz, bu mesajı dikkate almayın.", footerText: "Destek Ekibi" },
    ],
  },
  {
    id: "welcome_message",
    name: "welcome_message",
    category: "MARKETING",
    description: "رسالة ترحيب للعملاء الجدد — تُرسل فور اشتراك العميل أو إنشاء حسابه",
    tags: ["welcome", "onboarding", "new customer"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    languages: [
      { code: "ar", headerText: "أهلاً بك في {{1}} 🎉", bodyText: "مرحباً {{2}}،\n\nنحن سعداء بانضمامك إلينا! 🎊\n\nفي {{1}}، نقدم لك:\n✅ أفضل المنتجات والخدمات\n✅ عروض حصرية للأعضاء الجدد\n✅ دعم فني على مدار الساعة\n\nاستكشف متجرنا الآن واستفد من خصم 10% على أول طلب لك!\n\nرابط المتجر: {{3}}", footerText: "فريق {{1}}" },
      { code: "en", headerText: "Welcome to {{1}} 🎉", bodyText: "Hi {{2}},\n\nWe're thrilled to have you with us! 🎊\n\nAt {{1}}, we offer:\n✅ Top-quality products & services\n✅ Exclusive members-only deals\n✅ 24/7 customer support\n\nExplore our store now and get 10% off your first order!\n\nStore link: {{3}}", footerText: "The {{1}} Team" },
      { code: "fr", headerText: "Bienvenue chez {{1}} 🎉", bodyText: "Bonjour {{2}},\n\nNous sommes ravis de vous accueillir ! 🎊\n\nChez {{1}}, nous proposons :\n✅ Produits et services de qualité\n✅ Offres exclusives membres\n✅ Support client 24h/24\n\nExplorez notre boutique et obtenez 10% de réduction sur votre première commande !\n\nLien : {{3}}", footerText: "L'équipe {{1}}" },
    ],
  },
  {
    id: "order_confirmation",
    name: "order_confirmation",
    category: "UTILITY",
    description: "تأكيد الطلب — يُرسل بعد تقديم العميل طلباً جديداً لتأكيد استلامه وتفاصيله",
    tags: ["order", "confirmation", "ecommerce"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تتبع الطلب",
    buttonUrl: "https://example.com/track",
    languages: [
      { code: "ar", headerText: "تم استلام طلبك ✅", bodyText: "مرحباً {{1}}\n\nشكراً لطلبك! 🎉\n\nرقم الطلب: #{{2}}\nالمبلغ الإجمالي: {{3}}\nحالة الدفع: {{4}}\n\nسنقوم بتجهيز طلبك وتوصيله في أقرب وقت. يمكنك تتبع حالة الطلب من خلال الزر أدناه.", footerText: "شكراً لاختيارك {{5}}" },
      { code: "en", headerText: "Order Confirmed ✅", bodyText: "Hi {{1}},\n\nThank you for your order! 🎉\n\nOrder #: {{2}}\nTotal: {{3}}\nPayment: {{4}}\n\nWe'll prepare your order and ship it soon. Track your order status using the button below.", footerText: "Thank you for choosing {{5}}" },
      { code: "fr", headerText: "Commande confirmée ✅", bodyText: "Bonjour {{1}},\n\nMerci pour votre commande ! 🎉\n\nCommande #: {{2}}\nTotal: {{3}}\nPaiement: {{4}}\n\nNous préparons votre commande. Suivez son statut via le bouton ci-dessous.", footerText: "Merci d'avoir choisi {{5}}" },
    ],
  },
  {
    id: "order_shipped",
    name: "order_shipped",
    category: "UTILITY",
    description: "تم شحن الطلب — يُرسل للعميل عند شحن طلبه مع تفاصيل التتبع",
    tags: ["order", "shipping", "delivery", "ecommerce"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تتبع الشحنة",
    buttonUrl: "https://example.com/track",
    languages: [
      { code: "ar", headerText: "طلبك في الطريق 🚚", bodyText: "مرحباً {{1}}\n\nتم شحن طلبك رقم #{{2}}! 🚚🎉\n\nشركة الشحن: {{3}}\nرقم التتبع: {{4}}\nالوقت المتوقع: {{5}}\n\nيمكنك تتبع شحنتك في أي وقت من خلال الرابط أدناه.", footerText: "فريق التوصيل — {{6}}" },
      { code: "en", headerText: "Your Order is on the Way 🚚", bodyText: "Hi {{1}},\n\nYour order #{{2}} has been shipped! 🚚🎉\n\nCarrier: {{3}}\nTracking #: {{4}}\nETA: {{5}}\n\nTrack your package anytime using the link below.", footerText: "Delivery Team — {{6}}" },
    ],
  },
  {
    id: "payment_receipt",
    name: "payment_receipt",
    category: "UTILITY",
    description: "إيصال الدفع — يُرسل للعميل بعد إتمام عملية الدفع بنجاح",
    tags: ["payment", "receipt", "invoice"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    languages: [
      { code: "ar", headerText: "تم تأكيد الدفع ✅", bodyText: "مرحباً {{1}}\n\nتم استلام دفعتك بنجاح ✅💳\n\nالمبلغ: {{2}}\nرقم العملية: {{3}}\nالتاريخ: {{4}}\nطريقة الدفع: {{5}}\n\nشكراً لثقتك بنا! 🙏", footerText: "للتواصل: {{6}}" },
      { code: "en", headerText: "Payment Confirmed ✅", bodyText: "Hi {{1}},\n\nYour payment has been confirmed successfully ✅💳\n\nAmount: {{2}}\nTransaction #: {{3}}\nDate: {{4}}\nPayment method: {{5}}\n\nThank you for your trust! 🙏", footerText: "Contact us: {{6}}" },
    ],
  },
  {
    id: "abandoned_cart",
    name: "abandoned_cart",
    category: "MARKETING",
    description: "تذكير بسلة التسوق المتروكة — يُرسل للعميل الذي ترك منتجات في السلة دون إتمام الشراء",
    tags: ["cart", "abandoned", "recovery", "ecommerce"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "إتمام الشراء",
    buttonUrl: "https://example.com/cart",
    languages: [
      { code: "ar", headerText: "سلة تسوقك في انتظارك 🛒", bodyText: "مرحباً {{1}}\n\nلاحظنا أنك تركت بعض المنتجات في سلة التسوق 🛍️\n\nإجمالي السلة: {{2}}\nعدد المنتجات: {{3}}\n\nلا تفوت الفرصة! 🎁\nأكمل طلبك الآن واستفد من الشحن المجاني.", footerText: "فريق {{4}}" },
      { code: "en", headerText: "Your Cart is Waiting 🛒", bodyText: "Hi {{1}},\n\nWe noticed you left some items in your cart 🛍️\n\nCart total: {{2}}\nItems: {{3}}\n\nDon't miss out! 🎁\nComplete your order now and enjoy free shipping.", footerText: "The {{4}} Team" },
      { code: "fr", headerText: "Votre panier vous attend 🛒", bodyText: "Bonjour {{1}},\n\nNous avons remarqué que vous avez laissé des articles dans votre panier 🛍️\n\nTotal du panier : {{2}}\nArticles : {{3}}\n\nNe manquez pas cette chance ! 🎁\nFinalisez votre commande maintenant avec livraison gratuite.", footerText: "L'équipe {{4}}" },
    ],
  },
  {
    id: "appointment_reminder",
    name: "appointment_reminder",
    category: "UTILITY",
    description: "تذكير بالموعد — يُرسل قبل الموعد المحدد لتذكير العميل بموعد الخدمة أو الزيارة",
    tags: ["appointment", "reminder", "booking"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    languages: [
      { code: "ar", headerText: "تذكير بموعدك 📅", bodyText: "مرحباً {{1}}\n\nنذكرك بموعدك معنا:\n📅 التاريخ: {{2}}\n⏰ الوقت: {{3}}\n📍 المكان: {{4}}\n\nيرجى الحضور قبل الموعد بـ 10 دقائق.\nلتأكيد الحضور أو إلغاء الموعد، يرجى الرد على هذه الرسالة.", footerText: "للاستفسار: {{5}}" },
      { code: "en", headerText: "Appointment Reminder 📅", bodyText: "Hi {{1}},\n\nThis is a reminder for your upcoming appointment:\n📅 Date: {{2}}\n⏰ Time: {{3}}\n📍 Location: {{4}}\n\nPlease arrive 10 minutes before your appointment.\nTo confirm or cancel, please reply to this message.", footerText: "Contact: {{5}}" },
    ],
  },
  {
    id: "feedback_survey",
    name: "feedback_survey",
    category: "MARKETING",
    description: "طلب تقييم — يُرسل بعد تقديم الخدمة لقياس رضا العميل وجمع الملاحظات",
    tags: ["feedback", "survey", "csat", "nps"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "تقييم الخدمة",
    buttonUrl: "https://example.com/survey",
    languages: [
      { code: "ar", headerText: "قيّم تجربتك ⭐", bodyText: "مرحباً {{1}}\n\nنأمل أن تكون راضياً عن الخدمة التي تلقيتها! 🙏\n\nنود معرفة رأيك لمساعدتنا على التحسين.\n\nمن 1 إلى 5، ما مدى رضاك عن تجربتك؟\n\nاضغط على الزر أدناه لتقييم الخدمة (يستغرق دقيقة واحدة فقط).", footerText: "شكراً لوقتك — {{2}}" },
      { code: "en", headerText: "Rate Your Experience ⭐", bodyText: "Hi {{1}},\n\nWe hope you're satisfied with the service you received! 🙏\n\nWe'd love your feedback to help us improve.\n\nOn a scale of 1 to 5, how satisfied are you with your experience?\n\nClick the button below to rate (takes just 1 minute).", footerText: "Thank you for your time — {{2}}" },
    ],
  },
  {
    id: "invoice_reminder",
    name: "invoice_reminder",
    category: "UTILITY",
    description: "تذكير بالفاتورة — يُرسل للعميل لتذكيره بدفع فاتورة مستحقة",
    tags: ["invoice", "payment", "reminder", "billing"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "دفع الفاتورة",
    buttonUrl: "https://example.com/pay",
    languages: [
      { code: "ar", headerText: "تذكير بالفاتورة 💳", bodyText: "مرحباً {{1}}\n\nنذكرك بأن الفاتورة رقم #{{2}} مستحقة الدفع.\n\nالمبلغ المستحق: {{3}}\nتاريخ الاستحقاق: {{4}}\n\nيرجى الدفع في أقرب وقت لتجنب تعليق الخدمة.\n\nللدفع، يمكنك استخدام الرابط أدناه.", footerText: "شكراً لتعاونك — {{5}}" },
      { code: "en", headerText: "Invoice Reminder 💳", bodyText: "Hi {{1}},\n\nThis is a reminder that invoice #{{2}} is due for payment.\n\nAmount due: {{3}}\nDue date: {{4}}\n\nPlease pay promptly to avoid service interruption.\n\nClick the button below to pay.", footerText: "Thank you — {{5}}" },
    ],
  },
  {
    id: "promotional_offer",
    name: "promotional_offer",
    category: "MARKETING",
    description: "عرض ترويجي — يُرسل للعملاء لإعلامهم بعرض خاص أو خصم لفترة محدودة",
    tags: ["promo", "offer", "discount", "marketing"],
    headerFormat: "TEXT",
    defaultLanguage: "ar",
    buttonText: "استفد من العرض",
    buttonUrl: "https://example.com/offer",
    languages: [
      { code: "ar", headerText: "عرض خاص لك 🎁", bodyText: "مرحباً {{1}}\n\nيسعدنا أن نقدم لك عرضاً حصرياً! 🎉\n\n🔥 خصم {{2}}% على جميع المنتجات\n📆 العرض صالح حتى: {{3}}\n🔑 كود الخصم: {{4}}\n\nلا تفوت الفرصة! الطلب متاح لفترة محدودة.", footerText: "فريق {{5}}" },
      { code: "en", headerText: "Special Offer Just for You 🎁", bodyText: "Hi {{1}},\n\nWe're excited to offer you an exclusive deal! 🎉\n\n🔥 {{2}}% off all products\n📆 Offer valid until: {{3}}\n🔑 Promo code: {{4}}\n\nDon't miss out! Limited time offer.", footerText: "The {{5}} Team" },
    ],
  },
];

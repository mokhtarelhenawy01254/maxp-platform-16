const { body, param, validationResult } = require("express-validator");


const upsertSignupCouponRules = () => {
  return [
    body("name").trim().notEmpty().withMessage("اسم الكوبون مطلوب"),
    body("code").trim().notEmpty().withMessage("كود الكوبون مطلوب"),
    body("validFrom")
      .notEmpty()
      .withMessage("تاريخ البداية مطلوب")
      .bail()
      .isISO8601()
      .withMessage("تاريخ البداية غير صالح"),
    body("validTo")
      .notEmpty()
      .withMessage("تاريخ النهاية مطلوب")
      .bail()
      .isISO8601()
      .withMessage("تاريخ النهاية غير صالح"),
    body("trialDays")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("أيام التجربة يجب أن تكون صفر أو رقمًا موجبًا"),
    body("bonusUsers")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("عدد المستخدمين الإضافيين يجب أن يكون صفر أو رقمًا موجبًا"),
    body("bonusProducts")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("عدد المنتجات الإضافية يجب أن يكون صفر أو رقمًا موجبًا"),
    body("bonusOrdersPerMonth")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("عدد الطلبات الإضافية يجب أن يكون صفر أو رقمًا موجبًا"),
    body("bonusCustomers")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("عدد العملاء الإضافيين يجب أن يكون صفر أو رقمًا موجبًا"),
    body("usageLimit")
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage("حد الاستخدام يجب أن يكون رقمًا موجبًا"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("حالة التفعيل يجب أن تكون true أو false"),
  ];
};

const updateSignupCouponRules = () => {
  return [
    param("id").trim().notEmpty().withMessage("معرف الكوبون غير صالح"),
    ...upsertSignupCouponRules(),
  ];
};

const deleteSignupCouponRules = () => {
  return [
    param("id").trim().notEmpty().withMessage("معرف الكوبون غير صالح"),
  ];
};

const upsertBusinessSpecialtyRules = () => {
  return [
    body("slug")
      .optional()
      .trim()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage("رابط التخصص يجب أن يكون حروفًا إنجليزية صغيرة وأرقامًا وشرطات"),
    body("nameAr").trim().notEmpty().withMessage("اسم التخصص بالعربي مطلوب"),
    body("nameEn").trim().notEmpty().withMessage("اسم التخصص بالإنجليزي مطلوب"),
    body("descriptionAr").optional({ nullable: true }).isString(),
    body("descriptionEn").optional({ nullable: true }).isString(),
    body("icon").optional({ nullable: true }).isString(),
    body("appSlugs")
      .optional()
      .isArray()
      .withMessage("قائمة التطبيقات يجب أن تكون مصفوفة"),
    body("appSlugs.*")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("رابط التطبيق غير صالح"),
    body("sortOrder")
      .optional()
      .isInt()
      .withMessage("ترتيب التخصص يجب أن يكون رقمًا صحيحًا"),
    body("autoInstallOnSignup")
      .optional()
      .isBoolean()
      .withMessage("تثبيت التطبيقات تلقائيًا يجب أن يكون true أو false"),
    body("themeId")
      .optional({ nullable: true })
      .isString()
      .withMessage("معرف الثيم يجب أن يكون نصًا"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("حالة التخصص يجب أن تكون true أو false"),
  ];
};

const updateBusinessSpecialtyRules = () => {
  return [
    param("id").trim().notEmpty().withMessage("معرف التخصص غير صالح"),
    ...upsertBusinessSpecialtyRules(),
  ];
};

const deleteBusinessSpecialtyRules = () => {
  return [
    param("id").trim().notEmpty().withMessage("معرف التخصص غير صالح"),
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push(err.msg));

  return res.status(422).json({
    success: false,
    message: "خطأ في التحقق من البيانات",
    errors: extractedErrors,
  });
};

module.exports = {
  upsertSignupCouponRules,
  updateSignupCouponRules,
  deleteSignupCouponRules,
  upsertBusinessSpecialtyRules,
  updateBusinessSpecialtyRules,
  deleteBusinessSpecialtyRules,
  validate,
};


const { z } = require('zod');

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const appSchema = z.object({
  name: z.string().min(1, 'اسم التطبيق مطلوب').max(200),
  slug: z.string().regex(slugRegex, 'Slug غير صالح').max(200).optional(),
  description: z.string().max(2000).optional(),
  monthlyPrice: z.number().min(0).optional(),
  yearlyPrice: z.number().min(0).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isAutoInstall: z.boolean().optional(),
  logo: z.string().max(500).optional(),
  icon: z.string().max(200).optional(),
  coverImage: z.string().max(500).optional(),
  mainRoute: z.string().max(200).optional(),
  adminRoute: z.string().max(200).optional(),
  pricingModel: z.enum(['FREE', 'SUBSCRIPTION', 'PAY_PER_USE']).optional(),
  unitPrice: z.number().min(0).optional(),
  unitName: z.string().max(100).optional(),
  features: z.union([z.string(), z.array(z.string())]).optional(),
  requiredApps: z.array(z.string()).optional(),
}).strict();

const bundleSchema = z.object({
  name: z.string().min(1, 'اسم الباقة مطلوب').max(200),
  slug: z.string().regex(slugRegex, 'Slug غير صالح').max(200).optional(),
  description: z.string().max(2000).optional(),
  monthlyPrice: z.number().min(0).optional(),
  yearlyPrice: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  appIds: z.array(z.string()).optional(),
});

const pricingRuleSchema = z.object({
  feature: z.string().min(1, 'اسم الميزة مطلوب').max(200),
  price: z.number().min(0).optional(),
  unit: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
}).strict();

const enterprisePlanSchema = z.object({
  companyId: z.string().min(1, 'معرف الشركة مطلوب'),
  name: z.string().min(1, 'اسم الخطة مطلوب').max(200),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  features: z.union([z.string(), z.array(z.string())]).optional(),
}).strict();

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'بيانات غير صالحة';
      return res.status(400).json({
        success: false,
        message: firstError,
        errors,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  validateCreateApp: validate(appSchema),
  validateUpdateApp: validate(appSchema.partial()),
  validateCreateBundle: validate(bundleSchema),
  validateUpdateBundle: validate(bundleSchema.partial()),
  validateCreatePricingRule: validate(pricingRuleSchema),
  validateUpdatePricingRule: validate(pricingRuleSchema.partial()),
  validateCreateEnterprisePlan: validate(enterprisePlanSchema),
  validateUpdateEnterprisePlan: validate(enterprisePlanSchema.partial()),
};

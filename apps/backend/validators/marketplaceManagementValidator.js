const { z } = require('zod');

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const appSchema = z.object({
  name: z.string().min(1, 'App name is required').max(200),
  slug: z.string().regex(slugRegex, 'Invalid slug format').max(200).nullish(),
  description: z.string().max(2000).nullish(),
  monthlyPrice: z.number().min(0).nullish(),
  yearlyPrice: z.number().min(0).nullish(),
  trialDays: z.number().int().min(0).max(365).nullish(),
  category: z.string().max(100).nullish(),
  isActive: z.boolean().nullish(),
  isPublic: z.boolean().nullish(),
  isFeatured: z.boolean().nullish(),
  isPopular: z.boolean().nullish(),
  isAutoInstall: z.boolean().nullish(),
  logo: z.string().max(500).nullish(),
  icon: z.string().max(200).nullish(),
  coverImage: z.string().max(500).nullish(),
  mainRoute: z.string().max(200).nullish(),
  adminRoute: z.string().max(200).nullish(),
  pricingModel: z.enum(['FREE', 'SUBSCRIPTION', 'PAY_PER_USE']).nullish(),
  unitPrice: z.number().min(0).nullish(),
  unitName: z.string().max(100).nullish(),
  features: z.union([z.string(), z.array(z.string())]).nullish(),
  requiredApps: z.array(z.string()).nullish(),
});

const bundleSchema = z.object({
  name: z.string().min(1, 'Bundle name is required').max(200),
  slug: z.string().regex(slugRegex, 'Invalid slug format').max(200).nullish(),
  description: z.string().max(2000).nullish(),
  monthlyPrice: z.number().min(0).nullish(),
  yearlyPrice: z.number().min(0).nullish(),
  discount: z.number().min(0).max(100).nullish(),
  isActive: z.boolean().nullish(),
  isFeatured: z.boolean().nullish(),
  appIds: z.array(z.string()).nullish(),
});

const pricingRuleSchema = z.object({
  feature: z.string().min(1, 'Feature name is required').max(200),
  price: z.number().min(0).nullish(),
  unit: z.string().max(100).nullish(),
  description: z.string().max(1000).nullish(),
  isActive: z.boolean().nullish(),
});

const enterprisePlanSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  name: z.string().min(1, 'Plan name is required').max(200),
  description: z.string().max(2000).nullish(),
  price: z.number().min(0).nullish(),
  isActive: z.boolean().nullish(),
  features: z.union([z.string(), z.array(z.string())]).nullish(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'Invalid data';
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

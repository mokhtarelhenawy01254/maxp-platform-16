const Joi = require('joi');

const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors: error.details.map((d) => d.message)
    });
  }
  next();
};

const walletNumberSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'اسم المحفظة مطلوب',
    'any.required': 'اسم المحفظة مطلوب'
  }),
  number: Joi.string().required().pattern(/^[0-9+]+$/).messages({
    'string.empty': 'رقم المحفظة مطلوب',
    'string.pattern.base': 'رقم المحفظة يجب أن يحتوي على أرقام فقط',
    'any.required': 'رقم المحفظة مطلوب'
  }),
  icon: Joi.string().optional().allow(''),
  color: Joi.string().optional().allow('').pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).messages({
    'string.pattern.base': 'لون غير صالح'
  }),
  isActive: Joi.boolean().optional()
});

exports.validateCreateWalletNumber = validateRequest(walletNumberSchema);
exports.validateUpdateWalletNumber = validateRequest(walletNumberSchema.keys({
  isActive: Joi.boolean().required()
}));

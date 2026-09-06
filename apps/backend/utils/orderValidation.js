/**
 * Validation utilities for order management (Backend)
 */

/**
 * Validate Egyptian phone number (supporting local, international, Arabic digits, & hidden formatting characters)
 */
const validateEgyptianPhone = (phone) => {
    if (!phone || String(phone).trim() === '') {
        return { isValid: false, error: 'رقم الهاتف مطلوب' };
    }

    // Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits to ASCII (0-9)
    const ascii = String(phone)
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .trim();

    // Strip non-digits except optional leading '+'
    const hasPlus = ascii.startsWith('+');
    const digits = ascii.replace(/\D/g, '');
    if (!digits) {
        return { isValid: false, error: 'رقم الهاتف غير صحيح' };
    }

    // Normalize Egyptian formats (+20, 0020, 20 prefix to 01...)
    let normalized = digits;
    if (normalized.startsWith('0020')) {
        normalized = '0' + normalized.slice(4);
    } else if (normalized.startsWith('2001') && normalized.length === 13) {
        normalized = '0' + normalized.slice(3);
    } else if (normalized.startsWith('201') && normalized.length === 12) {
        normalized = '0' + normalized.slice(2);
    }

    // Check Egyptian mobile pattern: 01 followed by 9 digits (11 digits total)
    const isEgyptian = /^01[0-9]{9}$/.test(normalized);
    if (isEgyptian) {
        return { isValid: true };
    }

    // General E.164 international phone format (+ or 00 followed by 8-15 digits)
    if (hasPlus && /^\+[1-9]\d{7,14}$/.test(`+${digits}`)) {
        return { isValid: true };
    }
    if (digits.startsWith('00') && /^00[1-9]\d{7,14}$/.test(digits)) {
        return { isValid: true };
    }

    return {
        isValid: false,
        error: 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 01 ويتكون من 11 رقمًا'
    };
};

/**
 * Validate price (must be positive number)
 */
const validatePrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numPrice)) {
        return { isValid: false, error: 'السعر يجب أن يكون رقماً' };
    }

    if (numPrice <= 0) {
        return { isValid: false, error: 'السعر يجب أن يكون أكبر من صفر' };
    }

    if (numPrice > 1000000) {
        return { isValid: false, error: 'السعر كبير جداً' };
    }

    return { isValid: true };
};

/**
 * Validate quantity (must be positive integer)
 */
const validateQuantity = (quantity) => {
    const numQuantity = typeof quantity === 'string' ? parseInt(quantity) : quantity;

    if (isNaN(numQuantity)) {
        return { isValid: false, error: 'الكمية يجب أن تكون رقماً' };
    }

    if (numQuantity <= 0) {
        return { isValid: false, error: 'الكمية يجب أن تكون أكبر من صفر' };
    }

    if (numQuantity > 9999) {
        return { isValid: false, error: 'الكمية كبيرة جداً (الحد الأقصى 9999)' };
    }

    if (!Number.isInteger(numQuantity)) {
        return { isValid: false, error: 'الكمية يجب أن تكون رقماً صحيحاً' };
    }

    return { isValid: true };
};

/**
 * Validate order items array
 */
const validateOrderItems = (items) => {
    if (!items || items.length === 0) {
        return { isValid: false, error: 'يجب إضافة منتج واحد على الأقل للطلب' };
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate product name
        if (!item.productName || item.productName.trim() === '') {
            return { isValid: false, error: `المنتج ${i + 1}: اسم المنتج مطلوب` };
        }

        // Validate price
        const priceValidation = validatePrice(item.price);
        if (!priceValidation.isValid) {
            return { isValid: false, error: `المنتج ${i + 1}: ${priceValidation.error}` };
        }

        // Validate quantity
        const quantityValidation = validateQuantity(item.quantity);
        if (!quantityValidation.isValid) {
            return { isValid: false, error: `المنتج ${i + 1}: ${quantityValidation.error}` };
        }
    }

    return { isValid: true };
};

module.exports = {
    validateEgyptianPhone,
    validatePrice,
    validateQuantity,
    validateOrderItems
};

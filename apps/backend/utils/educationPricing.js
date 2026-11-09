/**
 * تسعير وحدة التعليم — خصم الأخوات.
 *
 * سياسة العميل: أي أخ/أخت إضافي لنفس ولي الأمر بياخد خصم 10% على الباقة.
 * الخصم بيتحسب على سعر الباقة وقت الشراء، ويُخزَّن المبلغ المدفوع فعليًا
 * في التسجيل (amountPaid) — السعر الأصلي في الباقة لا يتغير أبدًا.
 */

const SIBLING_DISCOUNT_RATE = 0.1; // 10%

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * @param {object} params
 * @param {number} params.basePrice سعر الباقة الأصلي
 * @param {number} params.siblingCount عدد أبناء ولي الأمر (بما فيهم الطالب الحالي)
 * @returns {{ basePrice:number, discountRate:number, discountAmount:number, finalPrice:number, reason:string|null }}
 */
const computePackagePrice = ({ basePrice, siblingCount }) => {
  const base = Number(basePrice) || 0;
  const count = Number(siblingCount) || 0;
  const applies = count > 1;
  const discountRate = applies ? SIBLING_DISCOUNT_RATE : 0;
  const discountAmount = round2(base * discountRate);
  return {
    basePrice: round2(base),
    discountRate,
    discountAmount,
    finalPrice: round2(base - discountAmount),
    reason: applies ? 'خصم الأخوات 10%' : null,
  };
};

module.exports = { SIBLING_DISCOUNT_RATE, computePackagePrice, round2 };

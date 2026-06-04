const ORDER_PAYMENT_METHOD_VALUES = new Set([
  'CASH',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'STRIPE',
  'WALLET',
  'INSTAPAY',
  'VISA',
  'MASTERCARD',
  'VODAFONE_CASH',
]);

const ORDER_PAYMENT_METHOD_ALIASES = new Map([
  ['COD', 'CASH'],
  ['CASH_ON_DELIVERY', 'CASH'],
  ['CASHONDELIVERY', 'CASH'],
  ['CARD', 'CREDIT_CARD'],
  ['CREDIT', 'CREDIT_CARD'],
  ['CREDITCARD', 'CREDIT_CARD'],
  ['BANK', 'BANK_TRANSFER'],
  ['BANKTRANSFER', 'BANK_TRANSFER'],
]);

function normalizeOrderPaymentMethod(paymentMethod, fallback = 'CASH') {
  const normalizedFallback = ORDER_PAYMENT_METHOD_VALUES.has(String(fallback || '').trim().toUpperCase())
    ? String(fallback).trim().toUpperCase()
    : 'CASH';

  const normalized = String(paymentMethod || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) {
    return normalizedFallback;
  }

  const compact = normalized.replace(/_/g, '');
  const alias = ORDER_PAYMENT_METHOD_ALIASES.get(normalized)
    || ORDER_PAYMENT_METHOD_ALIASES.get(compact);

  if (alias) {
    return alias;
  }

  if (ORDER_PAYMENT_METHOD_VALUES.has(normalized)) {
    return normalized;
  }

  return normalizedFallback;
}

module.exports = {
  ORDER_PAYMENT_METHOD_VALUES,
  normalizeOrderPaymentMethod,
};

'use strict';

/**
 * حسابات مكونات العينة (Task 83791d03) — دوال خالصة بدون أي اعتماد على Prisma
 * عشان تتست لوحدها.
 */

function computeComponentTotal(quantity, unitPrice) {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return Math.round(qty * price * 100) / 100;
}

function normalizeQuantity(value) {
  if (value === undefined || value === null || value === '') return null;
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return Math.round(qty * 1000) / 1000;
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === '') return 0;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return null;
  return Math.round(price * 100) / 100;
}

function sumTotals(components) {
  const total = (Array.isArray(components) ? components : []).reduce((acc, item) => {
    const value = Number(item && item.totalCost);
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);
  return Math.round(total * 100) / 100;
}

module.exports = {
  computeComponentTotal,
  normalizeQuantity,
  normalizePrice,
  sumTotals,
};

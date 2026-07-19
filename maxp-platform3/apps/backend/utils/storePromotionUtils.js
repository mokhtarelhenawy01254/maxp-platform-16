const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTier = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const minQuantity = Math.max(1, Math.floor(toFiniteNumber(raw.minQuantity, 0)));
  if (minQuantity < 1) return null;
  const type = String(raw.type || '').trim();
  if (!['cheapest_percentage', 'all_percentage'].includes(type)) return null;
  const value = Math.min(100, Math.max(0, toFiniteNumber(raw.value, 0)));
  if (value <= 0) return null;
  const items = type === 'cheapest_percentage'
    ? Math.max(1, Math.floor(toFiniteNumber(raw.items, 1)))
    : 0;
  return {
    minQuantity,
    type,
    value,
    items,
    label: typeof raw.label === 'string' ? raw.label.trim() : '',
    isActive: raw.isActive !== false,
  };
};

const parseTiers = (raw) => {
  if (!raw) return [];
  let arr;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }
  return arr.map(t => parseTier(t)).filter(Boolean).sort((a, b) => a.minQuantity - b.minQuantity);
};

const getApplicableTier = (tiers, cartQuantity) => {
  const candidates = tiers.filter(t =>
    t.isActive && cartQuantity >= t.minQuantity
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.minQuantity - a.minQuantity)[0];
};

const isItemOnSale = (item) => {
  const comparePrice = toFiniteNumber(item.comparePrice, 0);
  const price = toFiniteNumber(item.price, 0);
  return comparePrice > price && comparePrice > 0;
};

const calculateDiscount = ({ cartItems, tiers, disableOtherDiscounts = false }) => {
  const parsedTiers = parseTiers(tiers);
  if (parsedTiers.length === 0) return { discount: 0, items: [], tier: null };

  const totalQuantity = cartItems.reduce((sum, item) => sum + Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1))), 0);
  const tier = getApplicableTier(parsedTiers, totalQuantity);
  if (!tier) return { discount: 0, items: [], tier: null };

  const allUnitPrices = [];
  for (const item of cartItems) {
    if (disableOtherDiscounts && isItemOnSale(item)) continue;
    const qty = Math.max(1, Math.floor(toFiniteNumber(item.quantity, 1)));
    const price = Math.max(0, toFiniteNumber(item.price, 0));
    for (let i = 0; i < qty; i++) {
      allUnitPrices.push({ productId: item.productId || item.id, price });
    }
  }

  allUnitPrices.sort((a, b) => a.price - b.price);

  let totalDiscount = 0;
  const discountedItems = [];

  if (tier.type === 'cheapest_percentage') {
    const count = Math.min(tier.items, allUnitPrices.length);
    for (let i = 0; i < count; i++) {
      const itemDiscount = Number((allUnitPrices[i].price * tier.value / 100).toFixed(2));
      totalDiscount += itemDiscount;
      discountedItems.push({ productId: allUnitPrices[i].productId, discount: itemDiscount });
    }
  } else if (tier.type === 'all_percentage') {
    for (const unit of allUnitPrices) {
      const itemDiscount = Number((unit.price * tier.value / 100).toFixed(2));
      totalDiscount += itemDiscount;
      discountedItems.push({ productId: unit.productId, discount: itemDiscount });
    }
  }

  return {
    discount: Number(totalDiscount.toFixed(2)),
    discountDetails: discountedItems,
    tier,
    totalQuantity,
  };
};

module.exports = { calculateDiscount, parseTiers, getApplicableTier, isItemOnSale };

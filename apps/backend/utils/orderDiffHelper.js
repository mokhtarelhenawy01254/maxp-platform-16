function parseJsonObject(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (typeof value === 'object' && !Array.isArray(value)) return { ...fallback, ...value };
  if (typeof value !== 'string') return { ...fallback };
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...fallback, ...parsed }
      : { ...fallback };
  } catch (_e) {
    return { ...fallback };
  }
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

/**
 * Computes human-readable Arabic diff lines for customer and shipping modifications.
 */
function computeCustomerDetailsDiff(oldData = {}, input = {}) {
  const diffs = [];

  const oldName = oldData.customerName || (oldData.customer ? `${oldData.customer.firstName || ''} ${oldData.customer.lastName || ''}`.trim() : (oldData.guestName || ''));
  const oldPhone = oldData.customerPhone || oldData.customer?.phone || oldData.guestPhone || '';
  const oldMetadata = parseJsonObject(oldData.metadata, {});
  const oldAltPhone = oldMetadata.alternativePhone || '';
  const oldShipping = parseJsonObject(oldData.shippingAddress, {});
  const oldGov = oldData.governorate || oldShipping.governorate || '';
  const oldCity = oldData.city || oldShipping.city || '';
  const oldAddress = oldData.customerAddress || oldShipping.address || (typeof oldData.shippingAddress === 'string' && !oldData.shippingAddress.startsWith('{') ? oldData.shippingAddress : '');
  const oldNotes = oldData.notes || '';

  if (hasOwn(input, 'customerName') && input.customerName !== undefined && String(input.customerName).trim() !== String(oldName).trim()) {
    diffs.push(`تعديل اسم العميل: من "${oldName || 'بدون اسم'}" إلى "${String(input.customerName).trim()}"`);
  }

  if (hasOwn(input, 'customerPhone') && input.customerPhone !== undefined && String(input.customerPhone).trim() !== String(oldPhone).trim()) {
    diffs.push(`تعديل رقم الهاتف: من "${oldPhone || 'لا يوجد'}" إلى "${String(input.customerPhone).trim()}"`);
  }

  if (hasOwn(input, 'alternativePhone') && input.alternativePhone !== undefined && String(input.alternativePhone).trim() !== String(oldAltPhone).trim()) {
    diffs.push(`تعديل الرقم البديل: من "${oldAltPhone || 'لا يوجد'}" إلى "${String(input.alternativePhone).trim()}"`);
  }

  if (hasOwn(input, 'governorate') && input.governorate !== undefined && String(input.governorate).trim() !== String(oldGov).trim()) {
    diffs.push(`تعديل المحافظة: من "${oldGov || 'غير محددة'}" إلى "${String(input.governorate).trim()}"`);
  }

  if (hasOwn(input, 'city') && input.city !== undefined && String(input.city).trim() !== String(oldCity).trim()) {
    diffs.push(`تعديل المدينة / المنطقة: من "${oldCity || 'غير محددة'}" إلى "${String(input.city).trim()}"`);
  }

  const newAddress = (input.shippingAddress && input.shippingAddress.address) || (hasOwn(input, 'customerAddress') ? input.customerAddress : undefined);
  if (newAddress !== undefined && String(newAddress).trim() !== String(oldAddress).trim()) {
    diffs.push(`تعديل العنوان: من "${oldAddress || 'بدون عنوان'}" إلى "${String(newAddress).trim()}"`);
  }

  if (hasOwn(input, 'notes') && input.notes !== undefined && String(input.notes).trim() !== String(oldNotes).trim()) {
    diffs.push(`تعديل الملاحظات: "${String(input.notes).trim()}"`);
  }

  return diffs;
}

/**
 * Normalizes item properties for comparison and description.
 */
function getItemMeta(item = {}) {
  const id = item.productId || item.id || '';
  const name = String(item.productName || item.name || '').trim();
  const color = String(item.productColor || item.color || '').trim();
  const size = item.productSize != null ? String(item.productSize).trim() : (item.size != null ? String(item.size).trim() : '');
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;

  const specs = [];
  if (color) specs.push(`اللون: ${color}`);
  if (size) specs.push(`المقاس: ${size}`);
  const specStr = specs.length > 0 ? ` (${specs.join(' - ')})` : '';
  const displayName = `"${name || 'منتج'}"${specStr}`;

  return { id, name, color, size, price, quantity, displayName };
}

/**
 * Computes human-readable Arabic diff lines for order items modifications.
 */
function computeOrderItemsDiff(oldItems = [], newItems = [], oldTotals = {}, newTotals = {}) {
  const diffs = [];
  const safeOld = Array.isArray(oldItems) ? oldItems : [];
  const safeNew = Array.isArray(newItems) ? newItems : [];

  const matchedOld = new Set();
  const matchedNew = new Set();

  const oldMetas = safeOld.map(getItemMeta);
  const newMetas = safeNew.map(getItemMeta);

  // 1. Match identical or updated items by id + specs, then by id alone, then by name + specs
  for (let nIdx = 0; nIdx < newMetas.length; nIdx++) {
    const n = newMetas[nIdx];
    let foundIdx = -1;

    // A. Match by ID and identical variant (color & size)
    if (n.id) {
      foundIdx = oldMetas.findIndex((o, idx) => !matchedOld.has(idx) && o.id === n.id && o.color === n.color && o.size === n.size);
    }

    // B. Match by ID alone if no exact variant match
    if (foundIdx === -1 && n.id) {
      foundIdx = oldMetas.findIndex((o, idx) => !matchedOld.has(idx) && o.id === n.id);
    }

    // C. Match by name and variant
    if (foundIdx === -1 && n.name) {
      foundIdx = oldMetas.findIndex((o, idx) => !matchedOld.has(idx) && o.name.toLowerCase() === n.name.toLowerCase() && o.color === n.color && o.size === n.size);
    }

    // D. Match by name alone
    if (foundIdx === -1 && n.name) {
      foundIdx = oldMetas.findIndex((o, idx) => !matchedOld.has(idx) && o.name.toLowerCase() === n.name.toLowerCase());
    }

    if (foundIdx !== -1) {
      matchedOld.add(foundIdx);
      matchedNew.add(nIdx);
      const o = oldMetas[foundIdx];

      const itemChanges = [];
      if (o.quantity !== n.quantity) {
        itemChanges.push(`الكمية: من ${o.quantity} إلى ${n.quantity}`);
      }
      if (o.price !== n.price) {
        itemChanges.push(`السعر: من ${o.price} إلى ${n.price} ج.م`);
      }
      if ((o.color !== n.color || o.size !== n.size) && (n.color || n.size || o.color || o.size)) {
        itemChanges.push(`المواصفات: من (${[o.color && `اللون: ${o.color}`, o.size && `المقاس: ${o.size}`].filter(Boolean).join(' - ') || 'بدون'}) إلى (${[n.color && `اللون: ${n.color}`, n.size && `المقاس: ${n.size}`].filter(Boolean).join(' - ') || 'بدون'})`);
      }

      if (itemChanges.length > 0) {
        diffs.push(`تعديل ${n.displayName}: ${itemChanges.join('، ')}`);
      }
    }
  }

  // 2. Newly added items
  for (let nIdx = 0; nIdx < newMetas.length; nIdx++) {
    if (!matchedNew.has(nIdx)) {
      const n = newMetas[nIdx];
      diffs.push(`إضافة منتج: ${n.displayName} (الكمية: ${n.quantity} - السعر: ${n.price} ج.م)`);
    }
  }

  // 3. Removed items
  for (let oIdx = 0; oIdx < oldMetas.length; oIdx++) {
    if (!matchedOld.has(oIdx)) {
      const o = oldMetas[oIdx];
      diffs.push(`حذف منتج: ${o.displayName} (الكمية السابقة: ${o.quantity})`);
    }
  }

  // 4. Totals & Shipping
  if (oldTotals.total !== undefined && newTotals.total !== undefined) {
    const oTot = Math.round(Number(oldTotals.total) * 100) / 100;
    const nTot = Math.round(Number(newTotals.total) * 100) / 100;
    if (oTot !== nTot) {
      diffs.push(`تعديل إجمالي الطلب: من ${oTot} ج.م إلى ${nTot} ج.م`);
    }
  }

  if (oldTotals.shipping !== undefined && newTotals.shipping !== undefined) {
    const oShip = Math.round(Number(oldTotals.shipping) * 100) / 100;
    const nShip = Math.round(Number(newTotals.shipping) * 100) / 100;
    if (oShip !== nShip) {
      diffs.push(`تعديل مصاريف الشحن: من ${oShip} ج.م إلى ${nShip} ج.م`);
    }
  }

  return diffs;
}

module.exports = {
  computeCustomerDetailsDiff,
  computeOrderItemsDiff,
  parseJsonObject,
};

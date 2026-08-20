// الطلب المسبق: هل يُسمح بالطلب حتى لو المخزون غير كافٍ؟
// الشرط: المنتج pre-order وتاريخ التوفر غير محدد أو في المستقبل.
const isPreOrderEligible = (product) => {
  if (!product || product.isPreOrder !== true) {
    return false;
  }

  if (!product.preOrderDate) {
    return true;
  }

  const parsedDate = new Date(product.preOrderDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return true;
  }

  return parsedDate.getTime() >= Date.now();
};

module.exports = {
  isPreOrderEligible,
};

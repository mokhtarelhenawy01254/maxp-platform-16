import { WorkspaceOrder } from './types';

/** تحويل سلة متروكة خام من /orders-new/incomplete إلى صف ورك-سبيس موحد */
export function mapIncompleteCart(cart: any, isArabic: boolean): WorkspaceOrder {
  const cartId = String(cart.cartId || cart.id);
  const rawItems = Array.isArray(cart.items) ? cart.items : [];

  let cleanAbandonReason = isArabic ? 'سلة متروكة في صفحة الشراء' : 'Abandoned checkout';
  if (typeof cart.abandonReason === 'string') {
    cleanAbandonReason = cart.abandonReason;
  } else if (cart.abandonReason && typeof cart.abandonReason === 'object') {
    const code = cart.abandonReason.code;
    if (code === 'partial_shipping') {
      cleanAbandonReason = isArabic ? 'توقف عند بيانات الشحن (العنوان)' : 'Stopped at shipping address';
    } else if (code === 'partial_payment') {
      cleanAbandonReason = isArabic ? 'توقف عند طريقة الدفع' : 'Stopped at payment method';
    } else if (code) {
      cleanAbandonReason = `${isArabic ? 'سلة متروكة:' : 'Abandoned:'} ${code}`;
    }
  }

  const custName =
    cart.checkoutData?.customerName ||
    cart.checkoutData?.guestName ||
    cart.checkoutData?.name ||
    (isArabic ? 'عميل محتمل' : 'Lead');

  const custPhone =
    cart.checkoutData?.customerPhone ||
    cart.checkoutData?.phone ||
    '';

  const secPhone =
    cart.checkoutData?.phone2 ||
    cart.checkoutData?.alternatePhone ||
    null;

  return {
    id: cartId,
    cartId,
    orderNumber: `CART-${cartId.slice(-6).toUpperCase()}`,
    type: 'GUEST',
    isIncomplete: true,
    abandonReason: cleanAbandonReason,
    customerName: custName,
    customerPhone: custPhone,
    secondaryPhone: secPhone,
    governorate: cart.checkoutData?.governorate || '',
    city: cart.checkoutData?.city || '',
    shippingAddress: cart.checkoutData?.address || cart.checkoutData?.shippingAddress || '',
    total: Number(cart.total || 0),
    subtotal: Number(cart.total || 0),
    shipping: Number(cart.checkoutData?.shippingCost || 0),
    discount: Number(cart.checkoutData?.discountAmount || 0),
    status: 'INCOMPLETE',
    callAttempts: 0,
    lastCallAt: null,
    followUpDate: null,
    createdAt: cart.checkoutStartedAt || cart.updatedAt || new Date().toISOString(),
    notes: cart.checkoutData?.notes || '',
    items: rawItems.map((it: any) => ({
      productName: it.productName || it.name || (isArabic ? 'منتج' : 'Product'),
      quantity: Number(it.quantity) || 1,
      price: Number(it.price || it.basePrice || 0),
      total: (Number(it.price || it.basePrice || 0)) * (Number(it.quantity) || 1),
      productColor: it.color || it.productColor || it.attributes?.Color || it.attributes?.color || null,
      productSize: it.size || it.productSize || it.attributes?.Size || it.attributes?.size || null,
      productImage: it.image || it.productImage || it.attributes?.image || null,
    })),
    attribution: cart.attribution || null,
  };
}

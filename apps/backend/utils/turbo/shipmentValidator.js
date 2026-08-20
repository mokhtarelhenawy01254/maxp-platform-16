/**
 * Turbo Shipment Validator Utilities
 * ╪»┘ê╪º┘ä ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪╡╪¡╪⌐ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪¡┘å╪⌐ ┘é╪¿┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä┘Ç Turbo
 */

function validateOrderForTurbo(order, orderData) {
  const missingFields = [];
  const suggestions = [];

  const cleanName = (orderData.customerName || order.customerName || '').trim();
  if (!cleanName || cleanName === 'Unknown' || cleanName.length < 2) {
    missingFields.push('╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä ┘å╪º┘é╪╡ ╪ú┘ê ╪║┘è╪▒ ┘à┘â╪¬┘à┘ä');
    suggestions.push('┘è╪▒╪¼┘ë ┘â╪¬╪º╪¿╪⌐ ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä ┘â╪º┘à┘ä╪º┘ï ┘ü┘è ╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä╪╖┘ä╪¿');
  }

  const cleanPhone = (orderData.customerPhone || order.customerPhone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    missingFields.push('╪▒┘é┘à ╪¬┘ä┘è┘ü┘ê┘å ╪º┘ä╪╣┘à┘è┘ä ┘å╪º┘é╪╡ ╪ú┘ê ╪║┘è╪▒ ╪╡╪¡┘è╪¡ (┘è┘ä╪▓┘à 10-11 ╪▒┘é┘à)');
    suggestions.push('┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪▒┘é┘à ╪¬┘ä┘è┘ü┘ê┘å ╪╡╪¡┘è╪¡ ┘ê┘à┘â╪¬┘à┘ä ┘ä┘ä╪╣┘à┘è┘ä');
  }

  const rawAddress = (orderData.shippingAddress || orderData.customerAddress || order.shippingAddress || order.customerAddress || '').toString().trim();
  if (!rawAddress || rawAddress.length < 4 || rawAddress.toLowerCase().includes('undefined')) {
    missingFields.push('╪╣┘å┘ê╪º┘å ╪º┘ä╪┤╪¡┘å ┘å╪º┘é╪╡ ╪ú┘ê ╪║┘è╪▒ ╪¬┘ü╪╡┘è┘ä┘è');
    suggestions.push('┘è╪▒╪¼┘ë ┘â╪¬╪º╪¿╪⌐ ╪º┘ä╪┤╪º╪▒╪╣ ┘ê╪º┘ä┘à┘å╪╖┘é╪⌐ ┘ê╪º╪│┘à ╪º┘ä┘à╪¿┘å┘ë ╪¬┘ü╪╡┘è┘ä┘è╪º┘ï');
  }

  const gov = (orderData.governorate || orderData.city || order.city || '').toString().trim();
  if (!gov || gov.length < 2) {
    missingFields.push('╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ╪ú┘ê ╪º┘ä┘à╪»┘è┘å╪⌐ ╪║┘è╪▒ ┘à╪¡╪»╪»╪⌐');
    suggestions.push('┘è╪▒╪¼┘ë ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ┘ê╪º┘ä┘à╪»┘è┘å╪⌐ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ ┘ä╪┤╪¡┘å ╪¬╪▒╪¿┘ê');
  }

  const items = orderData.items || order.orderItems || order.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    missingFields.push('┘é╪º╪ª┘à╪⌐ ╪ú╪╡┘å╪º┘ü ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ┘ü╪º╪▒╪║╪⌐');
    suggestions.push('╪ú╪╢┘ü ┘à┘å╪¬╪¼╪º┘ï ┘ê╪º╪¡╪»╪º┘ï ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä┘ä╪╖┘ä╪¿ ┘é╪¿┘ä ╪Ñ╪▒╪│╪º┘ä┘ç ┘ä┘ä╪┤╪¡┘å');
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      suggestions,
      message: `╪╣┘ü┘ê╪º┘ï╪î ┘ä╪º ┘è┘à┘â┘å ╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪┤╪¡┘å╪⌐ ┘ä╪¬╪▒╪¿┘ê ┘ä╪ú┘å ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘â╪¬┘à┘ä╪⌐ (${missingFields.length} ╪ú╪«╪╖╪º╪í).`
    };
  }

  return { isValid: true };
}

module.exports = {
  validateOrderForTurbo
};

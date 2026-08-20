/**
 * Turbo Error Handler Utilities
 * ╪»┘ê╪º┘ä ┘à╪╣╪º┘ä╪¼╪⌐ ┘ê╪¬╪▒╪¼┘à╪⌐ ╪ú╪«╪╖╪º╪í Turbo API
 */

function isTurboConfigurationError(error) {
  const message = error?.message || '';
  return message.includes('Turbo is not enabled')
    || message.includes('Turbo API key is not configured')
    || message.includes('Company ID is required to fetch API key');
}

function translateTurboErrorToArabic(errorMsg) {
  if (!errorMsg) return '╪¡╪»╪½ ╪«╪╖╪ú ╪║┘è╪▒ ┘à╪¬┘ê┘é╪╣ ╪ú╪½┘å╪º╪í ╪º┘ä╪¬┘ê╪º╪╡┘ä ┘à╪╣ ╪¬╪▒╪¿┘ê';
  const str = String(errorMsg).trim();

  if (/Company ID is required/i.test(str)) return '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à╪╖┘ä┘ê╪¿';
  if (/Order IDs array is required/i.test(str)) return '┘è╪▒╪¼┘ë ╪º╪«╪¬┘è╪º╪▒ ╪╖┘ä╪¿ ┘ê╪º╪¡╪» ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä╪Ñ╪▒╪│╪º┘ä┘ç ┘ä╪¬╪▒╪¿┘ê';
  if (/Turbo is not enabled/i.test(str)) return '╪«╪»┘à╪⌐ ╪┤╪¡┘å ╪¬╪▒╪¿┘ê ╪║┘è╪▒ ┘à┘ü╪╣┘æ┘ä╪⌐ ┘ü┘è ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪ú┘ê ┘ä┘à ┘è╪¬┘à ╪Ñ╪»╪«╪º┘ä ┘à┘ü╪¬╪º╪¡ API';
  if (/No orders found or all orders already have shipments/i.test(str)) return '┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪╖┘ä╪¿╪º╪¬ ╪║┘è╪▒ ┘à╪┤╪¡┘ê┘å╪⌐ (┘é╪» ╪¬┘â┘ê┘å ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¬╪¡╪¬┘ê┘è ╪╣┘ä┘ë ╪┤╪¡┘å╪º╪¬ ╪¬╪▒╪¿┘ê ╪¿╪º┘ä┘ü╪╣┘ä)';
  if (/Shipment already exists/i.test(str)) return '┘è┘ê╪¼╪» ╪┤╪¡┘å╪⌐ ╪│╪º╪¿┘é╪⌐ ┘ä┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿ ╪¿╪º┘ä┘ü╪╣┘ä';
  if (/No response from Turbo API/i.test(str)) return '╪¬╪╣╪░╪▒ ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪│┘è╪▒┘ü╪▒ ╪¬╪▒╪¿┘ê╪î ┘è╪▒╪¼┘ë ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º╪¬╪╡╪º┘ä ╪º┘ä╪Ñ┘å╪¬╪▒┘å╪¬';
  if (/missing code or bar_code/i.test(str)) return '┘ä┘à ┘è╪▒╪¼╪╣ ╪│┘è╪▒┘ü╪▒ ╪¬╪▒╪¿┘ê ╪▒┘é┘à ╪¬╪¬╪¿╪╣ ╪º┘ä╪┤╪¡┘å╪⌐';
  if (/authentication_key|unauthorized|invalid key/i.test(str)) return '┘à┘ü╪¬╪º╪¡ ╪º┘ä┘Ç API ╪º┘ä╪«╪º╪╡ ╪¿╪┤╪▒┘â╪⌐ ╪¬╪▒╪¿┘ê ╪║┘è╪▒ ╪╡╪¡┘è╪¡ ╪ú┘ê ┘à┘å╪¬┘ç┘è ╪º┘ä╪╡┘ä╪º╪¡┘è╪⌐';
  if (/governorate|government/i.test(str)) return '╪¬╪╣╪░╪▒ ╪¬╪¡╪»┘è╪» ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ╪¿╪┤┘â┘ä ╪╡╪¡┘è╪¡ ┘ä┘ä╪╖┘ä╪¿';
  if (/phone/i.test(str)) return '╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘è┘ä ╪║┘è╪▒ ╪╡╪¡┘è╪¡ ╪ú┘ê ┘à┘ü┘é┘ê╪»';

  if (/[\u0600-\u06FF]/.test(str)) {
    return str.replace(/^Turbo API error:\s*/i, '');
  }

  return `╪«╪╖╪ú ┘ü┘è ╪º┘ä╪┤╪¡┘å: ${str}`;
}

function getTurboErrorMessage(error) {
  return (
    error?.response?.data?.error_msg ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    ''
  );
}

function isShipmentNotFoundError(message = '') {
  return /shipments?\s+not\s+found/i.test(String(message || ''));
}

function handleError(error, operation) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const rawError = data?.error_msg || data?.message || data?.error || `Turbo API error: ${status}`;
    const translatedError = translateTurboErrorToArabic(rawError);
    console.error(`Γ¥î [TURBO] ${operation} failed:`, { status, data, error_msg: rawError });
    throw new Error(translatedError);
  } else if (error.request) {
    console.error(`Γ¥î [TURBO] ${operation} failed: No response from Turbo API`);
    throw new Error('┘ä┘à ┘è╪¬┘à ╪¬┘ä┘é┘è ╪º╪│╪¬╪¼╪º╪¿╪⌐ ┘à┘å ╪│┘è╪▒┘ü╪▒ ╪¬╪▒╪¿┘ê. ┘è╪▒╪¼┘ë ╪º┘ä╪¬╪ú┘â╪» ┘à┘å ╪º╪¬╪╡╪º┘ä ╪º┘ä╪Ñ┘å╪¬╪▒┘å╪¬.');
  } else {
    console.error(`Γ¥î [TURBO] ${operation} failed:`, error.message);
    const translatedError = translateTurboErrorToArabic(error.message);
    throw new Error(translatedError);
  }
}

module.exports = {
  isTurboConfigurationError,
  translateTurboErrorToArabic,
  getTurboErrorMessage,
  isShipmentNotFoundError,
  handleError
};

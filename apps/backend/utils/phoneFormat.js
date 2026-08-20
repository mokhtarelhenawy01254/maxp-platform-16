/**
 * formatPhoneNumber - normalize phone number (extracted in 5.1).
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = '20' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('2')) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}

module.exports = { formatPhoneNumber };

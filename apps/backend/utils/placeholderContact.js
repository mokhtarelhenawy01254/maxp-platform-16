/**
 * Shared placeholder / fake contact detection.
 * Used by footer settings, store settings and WhatsApp session validation
 * so placeholder data ("+20 100 000 0000", "hello@example.com" ...) is
 * rejected before it reaches the storefront.
 */

function isPlaceholderPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return false;

  // all zeros / all ones / a single digit repeated 6+ times (0000000, 1111111)
  if (/^(\d)\1{5,}$/.test(digits)) return true;

  // any run of 6+ identical consecutive digits (real Egyptian numbers
  // rarely contain such runs; this catches 01000000000, 01111111111,
  // +20 100 000 0000 ΓåÆ digits 201000000000 ΓåÆ run of 9 zeros)
  if (/(\d)\1{5,}/.test(digits)) return true;

  return false;
}

function isPlaceholderEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return false;

  if (!email.includes('@')) return true;
  const domain = email.split('@')[1] || '';

  const fakeDomains = [
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'testmail.com',
    'domain.com',
    'yourdomain.com',
    'user.com',
    'email.com',
    'mailinator.com',
    'yopmail.com',
    'sharklasers.com',
  ];

  if (fakeDomains.includes(domain)) return true;
  if (/^test\d*@/.test(email)) return true;
  if (/^user\d*@/.test(email)) return true;
  if (/^admin\d*@/.test(email)) return true;
  if (/^[a-z]+\.example@/.test(email)) return true;

  return false;
}

module.exports = {
  isPlaceholderPhone,
  isPlaceholderEmail,
};

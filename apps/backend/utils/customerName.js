function cleanNameToken(token) {
  return String(token || '').replace(/^[~*_.\-ΓÇôΓÇö\s]+|[~*_.\-ΓÇôΓÇö\s]+$/g, '').trim();
}

function splitCustomerName(fullName) {
  const raw = String(fullName || '').trim();
  if (!raw) {
    return { firstName: 'WhatsApp User', lastName: '' };
  }

  const tokens = raw.split(/\s+/).map(cleanNameToken).filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: 'WhatsApp User', lastName: '' };
  }

  return {
    firstName: tokens[0],
    lastName: tokens.slice(1).join(' '),
  };
}

module.exports = { splitCustomerName, cleanNameToken };

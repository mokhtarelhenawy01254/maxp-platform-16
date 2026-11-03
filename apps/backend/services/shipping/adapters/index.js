/**
 * Shipping Adapters Index
 * Central registry for shipping carrier adapters
 */

const maxpNetworkAdapter = require('./maxpNetworkAdapter');
const turboTicketAdapter = require('./turboTicketAdapter');
const manualTicketAdapter = require('./manualTicketAdapter');
const demoTicketAdapter = require('./demoTicketAdapter');

const ADAPTERS = {
  MAXP_NETWORK: maxpNetworkAdapter,
  TURBO: turboTicketAdapter,
  MANUAL: manualTicketAdapter,
  DEMO: demoTicketAdapter,
};

function getShippingAdapter(providerKey) {
  const key = String(providerKey || '').trim().toUpperCase();
  return ADAPTERS[key] || null;
}

module.exports = {
  maxpNetworkAdapter,
  turboTicketAdapter,
  manualTicketAdapter,
  demoTicketAdapter,
  ADAPTERS,
  getShippingAdapter,
};

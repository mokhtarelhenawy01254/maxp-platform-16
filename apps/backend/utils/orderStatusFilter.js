// Shared status-filter parsing for the orders list.
// The /orders-new/simple route accepts `status` as a single code OR a
// comma-separated list (e.g. "CONFIRMED,SHIPPED"). Statuses live in different
// places depending on their kind, so this module partitions the selected codes
// into the groups the route needs to build the query.

const PRISMA_ORDER_STATUS_ENUM = new Set([
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED', 'RETURNED',
  'PARTIALLY_RETURNED', 'EXCHANGED', 'PARTIALLY_REFUNDED', 'WOO_TAGHEZ', 'DRAFT',
  'TRASH', 'READY_TO_SHIP', 'ON_HOLD', 'NOT_SHIPPED', 'OUT_FOR_DELIVERY', 'LOST',
  'PENDING_PREPARATION', 'PREPARING', 'READY', 'QUALITY_CHECK', 'PACKAGED',
  'ON_HOLD_PREP', 'PARTIALLY_DELIVERED', 'STOCK_SHORTAGE'
]);

// Statuses that are stored in order.status under a mapped value (e.g. PREPARING
// is persisted as PROCESSING) while the real stage lives in
// metadata.preparationStatus. When filtering /orders by one of these, the query
// must match COALESCE(metadata.preparationStatus, status).
const PREP_FILTER_STATUSES = new Set([
  'PENDING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING',
  'PENDING_PREPARATION', 'PREPARING', 'PROCESSING', 'QUALITY_CHECK', 'PACKAGED',
  'READY', 'READY_TO_SHIP', 'STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK',
  'PENDING_CANCELLATION', 'ON_HOLD_PREP'
]);

// Turbo shipping status aliases (Turbo uses numeric codes + readable names).
const TURBO_STATUS_ALIASES = {
  'active': ['turbo_saved', 'turbo_sent', 'processing', 'out_for_delivery', 'delayed', 'status_1', 'status_2', 'status_3', 'status_4', 'status_13', '1', '2', '3', '4', '13'],
  'merchant_preparing': ['turbo_saved', 'turbo_sent', 'status_1', 'status_2', '1', '2'],
  'preparing': ['turbo_saved', 'turbo_sent', 'processing', 'status_1', 'status_2', 'status_3', 'created', '1', '2', '3'],
  'turbo_saved': ['turbo_saved', 'status_1', '1'],
  'turbo_sent': ['turbo_sent', 'status_2', '2'],
  'processing': ['processing', 'status_3', 'created', '3'],
  'out_for_delivery': ['out_for_delivery', 'status_4', '4'],
  'returned_to_company': ['returned_to_company', 'status_5', 'status_14', '5', '14'],
  'cancelled': ['cancelled', 'status_6', '6'],
  'delivered': ['delivered', 'status_7', '7'],
  'remitted': ['remitted', 'status_8', 'status_19', '8', '19'],
  'archived': ['archived', 'status_9', '9'],
  'returned_resent': ['returned_resent', 'status_10', 'status_15', '10', '15'],
  'returned_missing': ['returned_missing', 'status_11', 'status_16', '11', '16'],
  'returned_destroyed': ['returned_destroyed', 'status_12', 'status_17', '12', '17'],
  'delayed': ['delayed', 'status_13', '13']
};

const isTurboStatusCode = (lowerStatus) =>
  Boolean(
    TURBO_STATUS_ALIASES[lowerStatus] ||
    lowerStatus.startsWith('turbo_') ||
    lowerStatus.startsWith('returned_') ||
    lowerStatus === 'remitted' ||
    lowerStatus === 'merchant_preparing'
  );

/**
 * Parses the `status` query value into the groups needed to build the order
 * where-clause.
 *
 * @param {string | undefined | null} statusValue raw `status` query value
 * @param {Set<string>} knownCodes all known status codes (enum + custom DB codes)
 * @returns {{
 *   statusList: string[],
 *   incompleteFilterStatus: string | null,
 *   realStatusList: string[],
 *   plainEnumStatuses: string[],
 *   customStatuses: string[],
 *   turboAliasValues: string[],
 *   guestStatusValues: string[],
 *   ignored: string[]
 * }}
 */
const parseStatusFilter = (statusValue, knownCodes) => {
  const rawStatusValue = String(statusValue || '').trim();
  const statusList =
    rawStatusValue && rawStatusValue !== 'all'
      ? rawStatusValue.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const incompleteFilterStatus =
    statusList.length === 1 &&
    ['incomplete', 'lost'].includes(statusList[0].toLowerCase())
      ? statusList[0].toLowerCase()
      : null;

  const realStatusList = statusList.filter(
    (s) => !['incomplete', 'lost'].includes(s.toLowerCase())
  );

  const plainEnumStatuses = [];
  const customStatuses = [];
  const turboAliasValues = [];
  const guestStatusValues = [];
  const ignored = [];

  for (const raw of realStatusList) {
    const upperStatus = raw.toUpperCase();
    const lowerStatus = raw.toLowerCase();

    if (knownCodes.has(upperStatus)) {
      if (PRISMA_ORDER_STATUS_ENUM.has(upperStatus) && !PREP_FILTER_STATUSES.has(upperStatus)) {
        plainEnumStatuses.push(upperStatus);
      } else {
        customStatuses.push(upperStatus);
      }
      guestStatusValues.push(upperStatus, lowerStatus);
    } else if (isTurboStatusCode(lowerStatus)) {
      const aliases = TURBO_STATUS_ALIASES[lowerStatus] || [lowerStatus, upperStatus];
      turboAliasValues.push(...aliases);
      guestStatusValues.push(upperStatus, lowerStatus);
    } else {
      ignored.push(raw);
    }
  }

  return {
    statusList,
    incompleteFilterStatus,
    realStatusList,
    plainEnumStatuses,
    customStatuses,
    turboAliasValues,
    guestStatusValues,
    ignored
  };
};

module.exports = {
  PRISMA_ORDER_STATUS_ENUM,
  PREP_FILTER_STATUSES,
  TURBO_STATUS_ALIASES,
  isTurboStatusCode,
  parseStatusFilter
};

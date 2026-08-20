/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.1-pre/┬º3.1) ΓÇö regression tests:
 * getPersistedNotificationEventType must map raw order status codes to valid
 * enum values so whatsAppNotificationLog/whatsAppNotificationQueue inserts
 * never throw an invalid-enum error (the ┬º1.1-pre duplicate-send virus).
 */
const { getPersistedNotificationEventType, isOrderCategory } = require('../../../services/whatsapp/notificationTypes');

// ┘é┘è┘à WhatsAppNotificationLogsEventType ╪º┘ä╪╡╪º┘ä╪¡╪⌐ (schema.prisma:3669) ΓÇö ┘å╪│╪«╪⌐ ┘ü╪▒╪╣┘è╪⌐
const VALID_LOG_EVENT_TYPES = new Set([
  'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_SHIPPED',
  'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'ORDER_REFUNDED',
  'ORDER_RETURNED', 'PARTIAL_REFUND', 'RETURNED_TO_SENDER', 'REFUND_PROCESSING',
  'PAYMENT_REMINDER', 'PAYMENT_RECEIVED', 'BACK_IN_STOCK', 'PROMOTIONAL',
  'PRICE_DROP', 'NEW_PRODUCT', 'LOW_STOCK_ALERT', 'CART_ABANDONED_1H',
  'CART_ABANDONED_24H', 'CART_ABANDONED_72H', 'CART_ABANDONED_WITH_DISCOUNT',
  'COUPON_SENT', 'BIRTHDAY_WISH', 'LOYALTY_POINTS', 'LOYALTY_POINTS_AWARDED',
  'LOYALTY_REWARD', 'REVIEW_REQUEST', 'ATTENDANCE_REMINDER', 'ATTENDANCE_CONFIRMED',
  'ATTENDANCE_LATE', 'ATTENDANCE_LATE_WITH_DEDUCTION', 'CHECKOUT_CONFIRMED',
  'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PAYROLL_READY', 'BIRTHDAY_EMPLOYEE',
  'WARNING_ISSUED', 'CONTRACT_EXPIRY', 'TRAINING_REMINDER', 'ANNOUNCEMENT', 'OTP',
  'ASSET_REQUEST_APPROVED', 'ASSET_REQUEST_REJECTED', 'ASSET_REQUEST_FULFILLED',
  'MANUAL_DEDUCTION', 'NEW_SIGNUP_WELCOME', 'NEW_SIGNUP_ADMIN_ALERT',
  'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELLED',
  'NEWSLETTER_SUBSCRIBED', 'BENEFIT_GRANTED', 'PICKING', 'PACKED', 'QUALITY_CHECK',
  'READY_TO_SHIP', 'AWAITING_STOCK', 'COD_CONFIRMED', 'PAYMENT_CONFIRMED',
  'PAYMENT_FAILED', 'PAYMENT_PROCESSING', 'WELCOME_MESSAGE', 'ABANDONED_CART',
  'PRODUCT_REVIEW_REQUEST', 'BIRTHDAY_GREETING', 'DRAFT', 'PENDING',
]);

describe('getPersistedNotificationEventType ΓÇö raw order status mapping (┬º2.1-pre + ┬º3.1)', () => {
  test.each([
    ['RETURNED', 'ORDER_RETURNED'],
    ['PARTIALLY_RETURNED', 'ORDER_RETURNED'],
    ['EXCHANGED', 'ORDER_RETURNED'],
    ['REFUNDED', 'ORDER_REFUNDED'],
    ['PARTIALLY_REFUNDED', 'PARTIAL_REFUND'],
  ])('%s ΓåÆ %s', (input, expected) => {
    expect(getPersistedNotificationEventType(input)).toBe(expected);
  });

  test.each([
    ['CONFIRMED', 'ORDER_CONFIRMED'],
    ['PROCESSING', 'ORDER_PROCESSING'],
    ['SHIPPED', 'ORDER_SHIPPED'],
    ['OUT_FOR_DELIVERY', 'ORDER_OUT_FOR_DELIVERY'],
    ['DELIVERED', 'ORDER_DELIVERED'],
    ['CANCELLED', 'ORDER_CANCELLED'],
  ])('standard status %s ΓåÆ %s', (input, expected) => {
    expect(getPersistedNotificationEventType(input)).toBe(expected);
  });

  test.each([
    ['PREPARING', 'PREPARING'],
    ['PICKING', 'PICKING'],
    ['PACKAGED', 'PACKAGED'],
    ['PACKED', 'PACKED'],
  ])('preparation alias %s stays as-is (no ORDER_ prefix)', (input, expected) => {
    expect(getPersistedNotificationEventType(input)).toBe(expected);
  });

  test.each([
    ['TASK_CREATED', 'ANNOUNCEMENT'],
    ['TASK_COMMENTED', 'ANNOUNCEMENT'],
    ['TASK_STATUS_CHANGED', 'ANNOUNCEMENT'],
    ['TASK_DEADLINE_REMINDER', 'ANNOUNCEMENT'],
  ])('%s ΓåÆ ANNOUNCEMENT', (input, expected) => {
    expect(getPersistedNotificationEventType(input)).toBe(expected);
  });

  test('is case-insensitive', () => {
    expect(getPersistedNotificationEventType('returned')).toBe('ORDER_RETURNED');
    expect(getPersistedNotificationEventType('CONFIRMED')).toBe('ORDER_CONFIRMED');
  });

  test('empty/null/undefined does not throw and returns input as-is', () => {
    expect(() => getPersistedNotificationEventType('')).not.toThrow();
    expect(getPersistedNotificationEventType('')).toBe('');
    expect(getPersistedNotificationEventType(null)).toBe(null);
    expect(getPersistedNotificationEventType(undefined)).toBe(undefined);
  });

  test('unmapped events pass through unchanged', () => {
    expect(getPersistedNotificationEventType('CUSTOM_EVENT')).toBe('CUSTOM_EVENT');
  });

  // ≡ƒö┤ regression: every mapped output must be a valid enum value ΓÇö
  // otherwise the log/queue insert throws an invalid-enum error (duplicate-send virus).
  // ┘à┘ä╪º╪¡╪╕╪⌐: PREPARING/PACKAGED ┘à╪│╪¬╪¿╪╣╪»╪⌐ ΓÇö ╪¬┘Å╪╖╪¿┘Ä┘æ╪╣ ╪Ñ┘ä┘ë PICKING/PACKED ┘é╪¿┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä
  // (normalizeWhatsAppOrderStatus ┘ü┘è orderService)╪î ┘ä╪░╪º ┘ä╪º ╪¬╪╡┘ä ┘ä┘ä┘Ç enum ╪ú╪¿╪»╪º┘ï ┘ü┘è ╪º┘ä┘à╪│╪º╪▒ ╪º┘ä╪¡╪º┘ä┘è.
  test('≡ƒö┤ regression: mapped output is always a valid WhatsAppNotificationLogsEventType value', () => {
    const inputs = [
      'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'REFUNDED', 'PARTIALLY_REFUNDED',
      'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
      'PICKING', 'PACKED', 'TASK_CREATED', 'TASK_COMMENTED',
      'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'PAYMENT_REMINDER', 'OTP',
    ];
    for (const input of inputs) {
      const output = getPersistedNotificationEventType(input);
      expect(VALID_LOG_EVENT_TYPES.has(output)).toBe(true);
      // if it ever fails, print which input caused it:
      if (!VALID_LOG_EVENT_TYPES.has(output)) {
        // eslint-disable-next-line no-console
        console.error(`INVALID ENUM OUTPUT: ${input} ΓåÆ ${output}`);
      }
    }
  });
});

describe('isOrderCategory', () => {
  test('recognizes order categories/events', () => {
    expect(isOrderCategory('ORDER', 'ORDER_CONFIRMED')).toBe(true);
    expect(isOrderCategory('ORDERS', 'X')).toBe(true);
    expect(isOrderCategory('HR', 'ORDER_CONFIRMED')).toBe(true);
    expect(isOrderCategory('HR', 'PAYMENT_REMINDER')).toBe(true);
    expect(isOrderCategory('HR', 'PAYMENT_RECEIVED')).toBe(true);
  });

  test('rejects non-order categories', () => {
    expect(isOrderCategory('HR', 'ATTENDANCE_REMINDER')).toBe(false);
    expect(isOrderCategory('LOYALTY', 'LOYALTY_POINTS')).toBe(false);
  });

  test('≡ƒö┤ regression: recognizes RAW order status codes as order events', () => {
    expect(isOrderCategory('MARKETING', 'delivered')).toBe(true);
    expect(isOrderCategory('MARKETING', 'DELIVERED')).toBe(true);
    expect(isOrderCategory('MARKETING', 'confirmed')).toBe(true);
    expect(isOrderCategory('MARKETING', 'CONFIRMED')).toBe(true);
    expect(isOrderCategory('MARKETING', 'RETURNED')).toBe(true);
    expect(isOrderCategory('MARKETING', 'out_for_delivery')).toBe(true);
    expect(isOrderCategory('MARKETING', 'cancelled')).toBe(true);
  });

  test('≡ƒö┤ regression: raw NON-order statuses stay non-order', () => {
    expect(isOrderCategory('MARKETING', 'NEWSLETTER_SUBSCRIBED')).toBe(false);
    expect(isOrderCategory('MARKETING', 'LOYALTY_POINTS')).toBe(false);
    expect(isOrderCategory('MARKETING', 'LEAVE_APPROVED')).toBe(false);
  });
});

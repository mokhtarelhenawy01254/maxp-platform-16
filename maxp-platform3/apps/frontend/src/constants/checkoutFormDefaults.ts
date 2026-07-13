import type { CheckoutFormSettingsUpdate } from "../services/checkoutFormSettingsService";

export const DEFAULT_CHECKOUT_FORM_SETTINGS: Required<CheckoutFormSettingsUpdate> = {
  showGuestName: true,
  requireGuestName: true,
  showGuestPhone: true,
  requireGuestPhone: true,
  showGuestEmail: true,
  requireGuestEmail: false,
  showCity: true,
  requireCity: true,
  showShippingAddress: true,
  requireShippingAddress: true,
  showPaymentMethod: true,
  showNotes: true,
};

export const normalizeCheckoutFormSettings = (
  input?: Partial<CheckoutFormSettingsUpdate> | null,
): Required<CheckoutFormSettingsUpdate> => ({
  ...DEFAULT_CHECKOUT_FORM_SETTINGS,
  ...(input || {}),
});

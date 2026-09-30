export interface InvoicePrintSettings {
  showCompanyLogo: boolean;
  showTaxBreakdown: boolean;
  showPaymentMethod: boolean;
  showOrderItems: boolean;
  showCustomFields?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showBarcodeOrderCode?: boolean;
  showBarcodeShippingCode?: boolean;
}

export const DEFAULT_INVOICE_SETTINGS: InvoicePrintSettings = {
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  showCustomFields: false,
  primaryColor: "#0f766e",
  secondaryColor: "#6b7280",
  fontFamily: 'Cairo, "Segoe UI", Tahoma, Arial, sans-serif',
  showBarcodeOrderCode: true,
  showBarcodeShippingCode: true,
};

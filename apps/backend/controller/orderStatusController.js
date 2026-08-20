const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // Γ¥î Removed to prevent early loading issues
const axios = require('axios');
// ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.3): ╪º┘ä╪¿╪░╪▒ ┘à╪│╪¬╪«╪▒╪¼ ╪Ñ┘ä┘ë ╪«╪»┘à╪⌐ ┘à╪┤╪¬╪▒┘â╪⌐
const { seedDefaultOrderTemplates } = require('../services/orderTemplateSeeding');
const { isNonNotifiableStatus } = require('../utils/orderStatusMeta');

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒ¢í∩╕Å Validation Helpers
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

const MAX_NAME_LENGTH = 100;
const CODE_REGEX = /^[A-Z0-9_]{1,50}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validate a single status field set and return an error message or null if valid.
 */
const validateStatusFields = ({ code, name, color }) => {
  if (!code || !name) {
    return '╪º┘ä┘â┘ê╪» ┘ê╪º┘ä╪º╪│┘à ┘à╪╖┘ä┘ê╪¿╪º┘å';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ┘ä╪º ┘è┘à┘â┘å ╪ú┘å ┘è╪¬╪¼╪º┘ê╪▓ ${MAX_NAME_LENGTH} ╪¡╪▒┘ü┘ï╪º`;
  }
  if (!CODE_REGEX.test(code.toUpperCase())) {
    return '╪º┘ä┘â┘ê╪» ┘è╪¼╪¿ ╪ú┘å ┘è╪¡╪¬┘ê┘è ┘ü┘é╪╖ ╪╣┘ä┘ë ╪ú╪¡╪▒┘ü ╪Ñ┘å╪¼┘ä┘è╪▓┘è╪⌐ ┘â╪¿┘è╪▒╪⌐╪î ╪ú╪▒┘é╪º┘à╪î ┘ê╪┤╪▒╪╖╪⌐ ╪│┘ü┘ä┘è╪⌐ (┘à╪½╪º┘ä: CONFIRMED ╪ú┘ê SHIPPED_V2)';
  }
  if (color && !HEX_COLOR_REGEX.test(color)) {
    return '┘ä┘ê┘å ╪º┘ä╪¡╪º┘ä╪⌐ ┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ┘â┘ê╪» hex ╪╡╪º┘ä╪¡ (┘à╪½╪º┘ä: #3B82F6)';
  }
  return null;
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒÄ¿ Default System Statuses
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

const DEFAULT_ORDER_STATUSES = [
  { code: 'PENDING', name: '┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒', nameEn: 'Pending', color: '#F59E0B', icon: 'Clock', sortOrder: 1, wooCommerceStatus: 'pending' },
  { code: 'DRAFT', name: '┘à╪│┘ê╪»╪⌐', nameEn: 'Draft', color: '#9CA3AF', icon: 'Tag', sortOrder: 2, wooCommerceStatus: 'checkout-draft' },
  { code: 'SCHEDULED', name: '╪╖┘ä╪¿ ┘à╪¼╪»┘ê┘ä', nameEn: 'Scheduled', color: '#FFA500', icon: 'Calendar', sortOrder: 3, wooCommerceStatus: 'pending' },
  { code: 'CONFIRMED', name: '┘à╪ñ┘â╪»', nameEn: 'Confirmed', color: '#3B82F6', icon: 'CheckCircle', sortOrder: 4, wooCommerceStatus: 'processing' },
  { code: 'ON_HOLD', name: '┘à╪╣┘ä┘é', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 5, wooCommerceStatus: 'on-hold' },
  { code: 'PROCESSING', name: '┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░', nameEn: 'Processing', color: '#8B5CF6', icon: 'Package', sortOrder: 6, wooCommerceStatus: 'processing' },
  { code: 'SHIPPED', name: '╪¬┘à ╪º┘ä╪┤╪¡┘å', nameEn: 'Shipped', color: '#06B6D4', icon: 'Truck', sortOrder: 7, wooCommerceStatus: 'completed' },
  { code: 'DELIVERED', name: '╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à', nameEn: 'Delivered', color: '#10B981', icon: 'CheckCircle2', sortOrder: 8, wooCommerceStatus: 'completed' },
  { code: 'CANCELLED', name: '┘à┘ä╪║┘è', nameEn: 'Cancelled', color: '#EF4444', icon: 'XCircle', sortOrder: 9, wooCommerceStatus: 'cancelled' },
  { code: 'REFUNDED', name: '┘à╪│╪¬╪▒╪»', nameEn: 'Refunded', color: '#6B7280', icon: 'RotateCcw', sortOrder: 10, wooCommerceStatus: 'refunded' },
  { code: 'PARTIALLY_REFUNDED', name: '┘à╪│╪¬╪▒╪» ╪¼╪▓╪ª┘è╪º┘ï', nameEn: 'Partially Refunded', color: '#9CA3AF', icon: 'RotateCcw', sortOrder: 11, wooCommerceStatus: 'refunded' },
  { code: 'DUPLICATE_ORDER', name: '╪╖┘ä╪¿ ┘à┘â╪▒╪▒', nameEn: 'Duplicate Order', color: '#FBBF24', icon: 'AlertTriangle', sortOrder: 12, wooCommerceStatus: null },
  { code: 'RETURNED', name: '┘à╪▒╪¬╪¼╪╣', nameEn: 'Returned', color: '#DC2626', icon: 'RotateCcw', sortOrder: 13, wooCommerceStatus: null },
  { code: 'PARTIALLY_RETURNED', name: '┘à╪▒╪¬╪¼╪╣ ╪¼╪▓╪ª┘è', nameEn: 'Partially Returned', color: '#F87171', icon: 'RotateCcw', sortOrder: 14, wooCommerceStatus: null },
  { code: 'PARTIALLY_DELIVERED', name: '╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è', nameEn: 'Partially Delivered', color: '#FBBF24', icon: 'Package', sortOrder: 15, wooCommerceStatus: null },
  { code: 'EXCHANGED', name: '╪º╪│╪¬╪¿╪»╪º┘ä', nameEn: 'Exchanged', color: '#7C3AED', icon: 'ArrowLeftRight', sortOrder: 16, wooCommerceStatus: null },
  { code: 'TRASH', name: '╪│┘ä╪⌐ ╪º┘ä┘à╪¡╪░┘ê┘ü╪º╪¬', nameEn: 'Trash', color: '#6B7280', icon: 'Trash2', sortOrder: 17, wooCommerceStatus: 'trash' },
  { code: 'PENDING_CANCELLATION', name: '╪Ñ┘ä╪║╪º╪í ┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░', nameEn: 'Pending Cancellation', color: '#F43F5E', icon: 'AlertOctagon', sortOrder: 18, wooCommerceStatus: null }
];

const DEFAULT_PAYMENT_STATUSES = [
  { code: 'PAYMENT_PENDING', name: '┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪»┘ü╪╣', nameEn: 'Pending', color: '#F59E0B', icon: 'Clock', sortOrder: 1 },
  { code: 'COMPLETED', name: '┘à╪»┘ü┘ê╪╣', nameEn: 'Completed', color: '#10B981', icon: 'CheckCircle', sortOrder: 2 },
  { code: 'PARTIALLY_PAID', name: '┘à╪»┘ü┘ê╪╣ ╪¼╪▓╪ª┘è╪º┘ï', nameEn: 'Partially Paid', color: '#3B82F6', icon: 'CreditCard', sortOrder: 3 },
  { code: 'FAILED', name: '┘ü╪┤┘ä ╪º┘ä╪»┘ü╪╣', nameEn: 'Failed', color: '#EF4444', icon: 'XCircle', sortOrder: 4 },
  { code: 'ON_HOLD', name: '┘à╪╣┘ä┘é', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 5 },
  { code: 'REFUNDED', name: '┘à╪│╪¬╪▒╪»', nameEn: 'Refunded', color: '#6B7280', icon: 'RotateCcw', sortOrder: 6 },
  { code: 'PARTIALLY_REFUNDED', name: '┘à╪│╪¬╪▒╪» ╪¼╪▓╪ª┘è╪º┘ï', nameEn: 'Partially Refunded', color: '#9CA3AF', icon: 'RotateCcw', sortOrder: 7 }
];

const DEFAULT_SHIPPING_STATUSES = [
  { code: 'NOT_SHIPPED', name: '┘ä┘à ┘è╪¬┘à ╪º┘ä╪┤╪¡┘å', nameEn: 'Not Shipped', color: '#6B7280', icon: 'Package', sortOrder: 1 },
  { code: 'READY_TO_SHIP', name: '╪¼╪º┘ç╪▓ ┘ä┘ä╪┤╪¡┘å', nameEn: 'Ready to Ship', color: '#F59E0B', icon: 'Package', sortOrder: 2 },
  { code: 'SHIPPED', name: '╪¬┘à ╪º┘ä╪┤╪¡┘å', nameEn: 'Shipped', color: '#3B82F6', icon: 'Truck', sortOrder: 3 },
  { code: 'OUT_FOR_DELIVERY', name: '┘é┘è╪» ╪º┘ä╪¬┘ê╪╡┘è┘ä', nameEn: 'Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 4 },
  { code: 'DELIVERED', name: '╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à', nameEn: 'Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 5 },
  { code: 'RETURNED', name: '╪¬┘à ╪º┘ä╪Ñ╪▒╪¼╪º╪╣', nameEn: 'Returned', color: '#EF4444', icon: 'RotateCcw', sortOrder: 6 },
  { code: 'LOST', name: '┘à┘ü┘é┘ê╪»', nameEn: 'Lost', color: '#DC2626', icon: 'AlertCircle', sortOrder: 7 },
  // ≡ƒÜÇ ╪¡╪º┘ä╪º╪¬ ╪┤╪¡┘å ╪¬╪▒╪¿┘ê ╪º┘ä╪¬┘ä┘é╪º╪ª┘è╪⌐ ╪º┘ä┘à╪¡╪»╪½╪⌐ (Official Turbo Shipping Statuses 1..13)
  { code: 'turbo_saved', name: '╪¬╪▒╪¿┘ê: ┘à╪¡┘ü┘ê╪╕╪⌐ ┘é╪¿┘ä ╪º┘ä╪┤╪¡┘å', nameEn: 'Turbo: Saved', color: '#6366F1', icon: 'Clock', sortOrder: 8 },
  { code: 'turbo_sent', name: '╪¬╪▒╪¿┘ê: ┘à╪▒╪│┘ä╪⌐ ┘ä╪┤╪▒┘â╪⌐ ╪¬╪▒╪¿┘ê', nameEn: 'Turbo: Sent', color: '#3B82F6', icon: 'CheckCircle', sortOrder: 9 },
  { code: 'processing', name: '╪¬╪▒╪¿┘ê: ┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░ ╪¿╪º┘ä┘ü╪▒╪╣', nameEn: 'Turbo: Processing', color: '#8B5CF6', icon: 'Package', sortOrder: 10 },
  { code: 'out_for_delivery', name: '╪¬╪▒╪¿┘ê: ┘à╪╣ ╪º┘ä┘â╪º╪¿╪¬┘å / ┘à╪│┘ä┘à╪⌐ ┘ä┘ä┘à┘å╪»┘ê╪¿', nameEn: 'Turbo: Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 11, mapsToSystem: 'SHIPPED' },
  { code: 'returned_to_company', name: '╪¬╪▒╪¿┘ê: ┘à╪▒╪¬╪¼╪╣╪⌐ ┘à╪╣ ╪º┘ä╪┤╪▒┘â╪⌐', nameEn: 'Turbo: Returned With Company', color: '#991B1B', icon: 'RotateCcw', sortOrder: 12, mapsToSystem: 'RETURNED' },
  { code: 'cancelled', name: '╪¬╪▒╪¿┘ê: ┘à┘ä╪║┘è ┘à┘å ╪º┘ä╪┤╪¡┘å', nameEn: 'Turbo: Cancelled', color: '#DC2626', icon: 'XCircle', sortOrder: 13, mapsToSystem: 'CANCELLED' },
  { code: 'delivered', name: '╪¬╪▒╪¿┘ê: ╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à', nameEn: 'Turbo: Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 14, mapsToSystem: 'DELIVERED' },
  { code: 'remitted', name: '╪¬╪▒╪¿┘ê: ╪¬┘à ╪º┘ä╪¬┘ê╪▒┘è╪» ┘ê╪¬╪¡╪╡┘è┘ä ╪º┘ä┘à╪¿┘ä╪║', nameEn: 'Turbo: Remitted', color: '#047857', icon: 'CheckCircle', sortOrder: 15, mapsToSystem: 'DELIVERED' },
  { code: 'archived', name: '╪¬╪▒╪¿┘ê: ╪┤╪¡┘å╪⌐ ┘à╪¡╪░┘ê┘ü╪⌐ ┘ü┘è ╪¬╪▒╪¿┘ê', nameEn: 'Turbo: Archived', color: '#78716C', icon: 'Trash2', sortOrder: 16 },
  { code: 'returned_resent', name: '╪¬╪▒╪¿┘ê: ┘à╪╣╪º╪» ╪Ñ╪▒╪│╪º┘ä┘ç╪º', nameEn: 'Turbo: Resent', color: '#2563EB', icon: 'RotateCcw', sortOrder: 17, mapsToSystem: 'PROCESSING' },
  { code: 'returned_missing', name: '╪¬╪▒╪¿┘ê: ┘à╪▒╪¬╪¼╪╣ ┘à┘ü┘é┘ê╪»', nameEn: 'Turbo: Missing', color: '#7F1D1D', icon: 'AlertCircle', sortOrder: 18, mapsToSystem: 'RETURNED' },
  { code: 'returned_destroyed', name: '╪¬╪▒╪¿┘ê: ┘à╪▒╪¬╪¼╪╣ ┘à╪╣╪»┘ê┘à', nameEn: 'Turbo: Destroyed', color: '#451A03', icon: 'XCircle', sortOrder: 19, mapsToSystem: 'RETURNED' },
  { code: 'delayed', name: '╪¬╪▒╪¿┘ê: ┘à╪ñ╪¼┘ä╪⌐ ┘à╪╣ ╪º┘ä┘à┘å╪»┘ê╪¿', nameEn: 'Turbo: Delayed', color: '#F97316', icon: 'Clock', sortOrder: 20, mapsToSystem: 'ON_HOLD' }
];

const DEFAULT_PREPARATION_STATUSES = [
  { code: 'PENDING_PREPARATION', name: '┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪¬╪¼┘ç┘è╪▓', nameEn: 'Pending Preparation', color: '#F59E0B', icon: 'Clock', sortOrder: 1 },
  { code: 'PREPARING', name: '┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓', nameEn: 'Preparing', color: '#8B5CF6', icon: 'Package', sortOrder: 2 },
  { code: 'READY', name: '╪¼╪º┘ç╪▓', nameEn: 'Ready', color: '#10B981', icon: 'CheckCircle', sortOrder: 3 },
  { code: 'QUALITY_CHECK', name: '┘ü╪¡╪╡ ╪º┘ä╪¼┘ê╪»╪⌐', nameEn: 'Quality Check', color: '#06B6D4', icon: 'CheckCircle', sortOrder: 4 },
  { code: 'PACKAGED', name: '╪¬┘à ╪º┘ä╪¬╪║┘ä┘è┘ü', nameEn: 'Packaged', color: '#3B82F6', icon: 'Package', sortOrder: 5 },
  { code: 'ON_HOLD_PREP', name: '┘à╪╣┘ä┘é', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 6 },
  { code: 'STOCK_SHORTAGE', name: '╪╣╪¼╪▓ ┘à╪«╪▓┘ê┘å', nameEn: 'Stock Shortage', color: '#E11D48', icon: 'AlertTriangle', sortOrder: 7 },
  { code: 'SHORTAGE_FAILED', name: '┘ü╪┤┘ä ╪¿╪│╪¿╪¿ ╪º┘ä╪╣╪¼╪▓', nameEn: 'Shortage Failed', color: '#7C3AED', icon: 'XCircle', sortOrder: 8 }
];

// WooCommerce default statuses mapping
const WOOCOMMERCE_STATUSES = {
  'pending': { name: '┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪»┘ü╪╣', nameEn: 'Pending payment', color: '#F59E0B', mapsToSystem: 'PENDING' },
  'processing': { name: '┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓', nameEn: 'Processing', color: '#3B82F6', mapsToSystem: 'PROCESSING' },
  'on-hold': { name: '┘à╪╣┘ä┘é', nameEn: 'On hold', color: '#F97316', mapsToSystem: 'PENDING' },
  'completed': { name: '┘à┘â╪¬┘à┘ä', nameEn: 'Completed', color: '#10B981', mapsToSystem: 'DELIVERED' },
  'cancelled': { name: '┘à┘ä╪║┘è', nameEn: 'Cancelled', color: '#EF4444', mapsToSystem: 'CANCELLED' },
  'refunded': { name: '┘à╪│╪¬╪▒╪»', nameEn: 'Refunded', color: '#6B7280', mapsToSystem: 'REFUNDED' },
  'failed': { name: '┘ü╪┤┘ä', nameEn: 'Failed', color: '#DC2626', mapsToSystem: 'CANCELLED' },
  'checkout-draft': { name: '┘à╪│┘ê╪»╪⌐', nameEn: 'Draft', color: '#9CA3AF', mapsToSystem: 'PENDING' }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒôï Get All Status Configurations
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

const getRequestCompanyId = (req) =>
  req.user?.effectiveCompanyId || req.user?.companyId;

/**
 * GET /api/v1/order-status
 * ╪¼┘ä╪¿ ╪¼┘à┘è╪╣ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä┘ä╪┤╪▒┘â╪⌐
 */
const getAllStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    console.log('≡ƒÅ╖∩╕Å [ORDER-STATUS] Getting statuses for company:', companyId);

    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    const { statusType } = req.query;

    // ╪º┘ä╪¬╪¡┘é┘é ╪ú┘ê┘ä╪º┘ï ┘à┘å ┘ê╪¼┘ê╪» ╪¡╪º┘ä╪º╪¬ ┘ä┘â┘ä ┘å┘ê╪╣ (╪¿╪»┘ê┘å ┘ü┘ä╪¬╪▒ statusType)
    const allStatuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where: { companyId, isActive: true },
      select: { statusType: true }
    });

    const statusTypes = ['order', 'payment', 'shipping', 'preparation'];
    const existingTypes = new Set(allStatuses.map(s => s.statusType));
    let needsInitialization = false;

    for (const type of statusTypes) {
      if (!existingTypes.has(type)) {
        console.log(`≡ƒÅ╖∩╕Å [ORDER-STATUS] No ${type} statuses found, will initialize...`);
        needsInitialization = true;
      }
    }

    // ╪Ñ╪░╪º ┘â╪º┘å╪¬ ┘ç┘å╪º┘â ╪ú┘å┘ê╪º╪╣ ┘å╪º┘é╪╡╪⌐╪î ╪ú┘å╪┤╪ª ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐
    if (needsInitialization || allStatuses.length === 0) {
      try {
        console.log('≡ƒÅ╖∩╕Å [ORDER-STATUS] Initializing default statuses...');
        await initializeDefaultStatuses(companyId);
      } catch (initError) {
        console.error('Γ¥î [ORDER-STATUS] Error during initialization, continuing with existing statuses:', initError.message);
        // ┘ä╪º ┘å┘ê┘é┘ü ╪º┘ä╪╣┘à┘ä┘è╪⌐ - ┘å┘â┘à┘ä ╪¿╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à┘ê╪¼┘ê╪»╪⌐
      }
    }

    // ╪º┘ä╪ó┘å ╪º╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ (┘à╪╣ ┘ü┘ä╪¬╪▒ statusType ╪Ñ╪░╪º ┘â╪º┘å ┘à┘ê╪¼┘ê╪»╪º┘ï)
    const where = { companyId, isActive: true };
    if (statusType) where.statusType = statusType;

    let statuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    console.log('≡ƒÅ╖∩╕Å [ORDER-STATUS] Found statuses:', statuses.length);

    res.json({
      success: true,
      data: statuses
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error getting statuses:', error);
    res.status(500).json({
      success: false,
      message: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/order-status/:id
 * ╪¼┘ä╪¿ ╪¡╪º┘ä╪⌐ ┘à╪¡╪»╪»╪⌐
 */
const getStatusById = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const status = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!status) {
      return res.status(404).json({ success: false, message: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    }

    res.json({ success: true, data: status });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error getting status:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪⌐', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöä Sync Helper: Mirror status to OrderStatusDefinition (workflow)
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * Sync a status from orderStatusConfig into orderStatusDefinition (workflow table).
 * This ensures any status added/edited from settings/orders automatically appears
 * in the TransitionRules on settings/order-workflow.
 */
const syncStatusToWorkflow = async (prisma, companyId, statusConfig) => {
  try {
    await prisma.orderStatusDefinition.upsert({
      where: { companyId_code: { companyId, code: statusConfig.code } },
      update: {
        name: statusConfig.name,
        color: statusConfig.color || '#6B7280',
        sortOrder: statusConfig.sortOrder || 0,
        description: statusConfig.description || null,
        notifyCustomer: statusConfig.notifyCustomer || false,
        isTerminal: false,
        lockAfterEntry: statusConfig.allowStatusEdit === false,
        requiresApprovalToExit: false,
      },
      create: {
        companyId,
        name: statusConfig.name,
        code: statusConfig.code,
        color: statusConfig.color || '#6B7280',
        sortOrder: statusConfig.sortOrder || 0,
        description: statusConfig.description || null,
        notifyCustomer: statusConfig.notifyCustomer || false,
        isTerminal: false,
        lockAfterEntry: statusConfig.allowStatusEdit === false,
        requiresApprovalToExit: false,
      }
    });
    console.log(`Γ£à [ORDER-STATUS-SYNC] Synced status "${statusConfig.code}" to workflow definitions for company ${companyId}`);
  } catch (syncErr) {
    // Non-fatal: log but don't fail the main request
    console.warn(`ΓÜá∩╕Å [ORDER-STATUS-SYNC] Could not sync status "${statusConfig.code}" to workflow:`, syncErr.message);
  }
};

/**
 * Remove a status from orderStatusDefinition when it is deactivated/deleted from orderStatusConfig.
 * Only removes if no active workflow transitions reference it.
 */
const removeStatusFromWorkflow = async (prisma, companyId, code) => {
  try {
    const wfStatus = await prisma.orderStatusDefinition.findUnique({
      where: { companyId_code: { companyId, code } },
      include: { fromTransitions: true, toTransitions: true }
    });
    if (!wfStatus) return; // Already gone
    if (wfStatus.fromTransitions.length > 0 || wfStatus.toTransitions.length > 0) {
      // Has linked transition rules ΓÇö keep it in workflow so existing rules still work
      console.log(`Γä╣∩╕Å [ORDER-STATUS-SYNC] Skipped removing "${code}" from workflow ΓÇö has active transition rules.`);
      return;
    }
    await prisma.orderStatusDefinition.delete({
      where: { companyId_code: { companyId, code } }
    });
    console.log(`≡ƒùæ∩╕Å [ORDER-STATUS-SYNC] Removed status "${code}" from workflow definitions for company ${companyId}`);
  } catch (syncErr) {
    console.warn(`ΓÜá∩╕Å [ORDER-STATUS-SYNC] Could not remove status "${code}" from workflow:`, syncErr.message);
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// Γ₧ò Create Status
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * POST /api/v1/order-status
 * ╪Ñ┘å╪┤╪º╪í ╪¡╪º┘ä╪⌐ ╪¼╪»┘è╪»╪⌐
 */
const createStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    const {
      code,
      name,
      nameEn,
      description,
      color,
      icon,
      sortOrder,
      statusType,
      mapsToSystem,
      wooCommerceStatus,
      allowedNextStatuses,
      autoActions,
      notifyCustomer,
      notifyAdmin,
      emailTemplate,
      smsTemplate,
      allowStatusEdit
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '╪º┘ä┘â┘ê╪» ┘ê╪º┘ä╪º╪│┘à ┘à╪╖┘ä┘ê╪¿╪º┘å' });
    }

    // ≡ƒ¢í∩╕Å Validate name length, code format, and color hex
    const validationError = validateStatusFields({ code, name, color });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪╣╪»┘à ╪¬┘â╪▒╪º╪▒ ╪º┘ä┘â┘ê╪»
    const finalCode = code.toUpperCase().replace(/\s+/g, '_');
    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { companyId, code: finalCode }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '┘ç╪░╪º ╪º┘ä┘â┘ê╪» ┘à┘ê╪¼┘ê╪» ╪¿╪º┘ä┘ü╪╣┘ä' });
    }
    const status = await getSharedPrismaClient().orderStatusConfig.create({
      data: {
        companyId,
        code: finalCode,
        name,
        nameEn,
        description,
        color: color || '#6B7280',
        icon,
        sortOrder: sortOrder || 0,
        statusType: statusType || 'order',
        source: 'custom',
        isSystemStatus: false,
        mapsToSystem,
        wooCommerceStatus,
        allowedNextStatuses: allowedNextStatuses ? JSON.stringify(allowedNextStatuses) : null,
        autoActions: autoActions ? JSON.stringify(autoActions) : null,
        notifyCustomer: notifyCustomer || false,
        notifyAdmin: notifyAdmin || false,
        emailTemplate,
        smsTemplate,
        allowStatusEdit: allowStatusEdit !== undefined ? allowStatusEdit : true
      }
    });

    // ≡ƒöä Auto-sync to workflow statuses so it appears in TransitionRules immediately
    await syncStatusToWorkflow(getSharedPrismaClient(), companyId, status);

    res.status(201).json({
      success: true,
      message: '╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪¡╪º┘ä╪⌐ ╪¿┘å╪¼╪º╪¡',
      data: status
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error creating status:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪¡╪º┘ä╪⌐', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// Γ£Å∩╕Å Update Status
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * PUT /api/v1/order-status/:id
 * ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐
 */
const updateStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    }

    const {
      name,
      nameEn,
      description,
      color,
      icon,
      sortOrder,
      mapsToSystem,
      wooCommerceStatus,
      allowedNextStatuses,
      autoActions,
      notifyCustomer,
      notifyAdmin,
      emailTemplate,
      smsTemplate,
      isActive,
      allowStatusEdit
    } = req.body;

    // ≡ƒ¢í∩╕Å Validate optional fields if provided
    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ success: false, message: `╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ┘ä╪º ┘è┘à┘â┘å ╪ú┘å ┘è╪¬╪¼╪º┘ê╪▓ ${MAX_NAME_LENGTH} ╪¡╪▒┘ü┘ï╪º` });
    }
    if (color !== undefined && !HEX_COLOR_REGEX.test(color)) {
      return res.status(400).json({ success: false, message: '┘ä┘ê┘å ╪º┘ä╪¡╪º┘ä╪⌐ ┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ┘â┘ê╪» hex ╪╡╪º┘ä╪¡ (┘à╪½╪º┘ä: #3B82F6)' });
    }

    const status = await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: {
        name: name || existing.name,
        nameEn,
        description,
        color: color || existing.color,
        icon,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        mapsToSystem,
        wooCommerceStatus,
        allowedNextStatuses: allowedNextStatuses ? JSON.stringify(allowedNextStatuses) : existing.allowedNextStatuses,
        autoActions: autoActions ? JSON.stringify(autoActions) : existing.autoActions,
        notifyCustomer: notifyCustomer !== undefined ? notifyCustomer : existing.notifyCustomer,
        notifyAdmin: notifyAdmin !== undefined ? notifyAdmin : existing.notifyAdmin,
        emailTemplate,
        smsTemplate,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        allowStatusEdit: allowStatusEdit !== undefined ? allowStatusEdit : existing.allowStatusEdit
      }
    });

    // ≡ƒöä Auto-sync name/color/description to workflow so TransitionRules stay in sync
    if (status.isActive !== false) {
      await syncStatusToWorkflow(getSharedPrismaClient(), companyId, status);
    } else {
      // Status deactivated ΓÇö try to remove from workflow if no transitions use it
      await removeStatusFromWorkflow(getSharedPrismaClient(), companyId, status.code);
    }

    res.json({
      success: true,
      message: '╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä╪¡╪º┘ä╪⌐ ╪¿┘å╪¼╪º╪¡',
      data: status
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error updating status:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪¡╪º┘ä╪⌐', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒùæ∩╕Å Delete Status
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * DELETE /api/v1/order-status/:id
 * ╪¡╪░┘ü ╪¡╪º┘ä╪⌐ (soft delete)
 */
const deleteStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    }

    await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: { isActive: false }
    });

    // ≡ƒöä Remove from workflow definitions if no transitions reference it
    await removeStatusFromWorkflow(getSharedPrismaClient(), companyId, existing.code);

    res.json({
      success: true,
      message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä╪¡╪º┘ä╪⌐ ╪¿┘å╪¼╪º╪¡'
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error deleting status:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¡╪░┘ü ╪º┘ä╪¡╪º┘ä╪⌐', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöä Sync with WooCommerce
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * POST /api/v1/order-status/sync-woocommerce
 * ┘à╪▓╪º┘à┘å╪⌐ ┘ê╪º┘â╪¬╪┤╪º┘ü ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à┘å WooCommerce
 */
const syncWooCommerceStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    // ╪¼┘ä╪¿ ╪Ñ╪╣╪»╪º╪»╪º╪¬ WooCommerce
    const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
      where: { companyId }
    });

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: '╪Ñ╪╣╪»╪º╪»╪º╪¬ WooCommerce ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐. ┘è╪▒╪¼┘ë ╪▒╪¿╪╖ ╪º┘ä┘à╪¬╪¼╪▒ ╪ú┘ê┘ä╪º┘ï.'
      });
    }

    const baseURL = settings.storeUrl.replace(/\/$/, '');

    // ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à┘å WooCommerce
    let wooStatuses = [];

    try {
      // ┘à╪¡╪º┘ê┘ä╪⌐ ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à┘å WooCommerce API
      const response = await axios.get(`${baseURL}/wp-json/wc/v3/orders`, {
        auth: {
          username: settings.consumerKey,
          password: settings.consumerSecret
        },
        params: { per_page: 100 },
        timeout: 30000
      });

      // ╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘ü╪▒┘è╪»╪⌐ ┘à┘å ╪º┘ä╪╖┘ä╪¿╪º╪¬
      const uniqueStatuses = new Set();
      response.data.forEach(order => {
        if (order.status) {
          uniqueStatuses.add(order.status);
        }
      });

      wooStatuses = Array.from(uniqueStatuses);

    } catch (apiError) {
      console.log('ΓÜá∩╕Å [ORDER-STATUS] Could not fetch orders, using default WooCommerce statuses');
      wooStatuses = Object.keys(WOOCOMMERCE_STATUSES);
    }

    // ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘ä┘Ç WooCommerce
    Object.keys(WOOCOMMERCE_STATUSES).forEach(status => {
      if (!wooStatuses.includes(status)) {
        wooStatuses.push(status);
      }
    });

    const results = {
      discovered: [],
      existing: [],
      created: []
    };

    // ┘à╪╣╪º┘ä╪¼╪⌐ ┘â┘ä ╪¡╪º┘ä╪⌐
    for (const wooStatus of wooStatuses) {
      const statusCode = `WOO_${wooStatus.toUpperCase().replace(/-/g, '_')}`;

      // ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ┘ê╪¼┘ê╪» ╪º┘ä╪¡╪º┘ä╪⌐
      const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
        where: {
          companyId,
          OR: [
            { code: statusCode },
            { wooCommerceStatus: wooStatus }
          ]
        }
      });

      if (existing) {
        results.existing.push({ code: wooStatus, localCode: existing.code });
        continue;
      }

      // ╪Ñ┘å╪┤╪º╪í ╪¡╪º┘ä╪⌐ ╪¼╪»┘è╪»╪⌐
      const defaultInfo = WOOCOMMERCE_STATUSES[wooStatus] || {
        name: wooStatus,
        nameEn: wooStatus,
        color: '#6B7280',
        mapsToSystem: 'PENDING'
      };

      const newStatus = await getSharedPrismaClient().orderStatusConfig.create({
        data: {
          companyId,
          code: statusCode,
          name: defaultInfo.name,
          nameEn: defaultInfo.nameEn,
          color: defaultInfo.color,
          icon: 'Tag',
          sortOrder: 100 + results.created.length,
          statusType: 'order',
          source: 'woocommerce',
          isSystemStatus: false,
          mapsToSystem: defaultInfo.mapsToSystem,
          wooCommerceStatus: wooStatus
        }
      });

      results.discovered.push(wooStatus);
      results.created.push(newStatus);
    }

    res.json({
      success: true,
      message: `╪¬┘à ╪º┘â╪¬╪┤╪º┘ü ${results.discovered.length} ╪¡╪º┘ä╪⌐ ╪¼╪»┘è╪»╪⌐ ┘à┘å WooCommerce`,
      data: {
        discovered: results.discovered,
        existing: results.existing.length,
        created: results.created.length,
        statuses: results.created
      }
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error syncing WooCommerce statuses:', error);
    res.status(500).json({
      success: false,
      message: '╪«╪╖╪ú ┘ü┘è ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬',
      error: error.message
    });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöº Update Status Mapping
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * PUT /api/v1/order-status/:id/mapping
 * ╪¬╪¡╪»┘è╪½ ╪▒╪¿╪╖ ╪º┘ä╪¡╪º┘ä╪⌐
 */
const updateStatusMapping = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;
    const { mapsToSystem, wooCommerceStatus } = req.body;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    }

    const status = await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: { mapsToSystem, wooCommerceStatus }
    });

    res.json({
      success: true,
      message: '╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä╪▒╪¿╪╖ ╪¿┘å╪¼╪º╪¡',
      data: status
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error updating mapping:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä╪▒╪¿╪╖', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöä Reorder Statuses
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * PUT /api/v1/order-status/reorder
 * ╪Ñ╪╣╪º╪»╪⌐ ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬
 */
const reorderStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { statusIds } = req.body; // Array of status IDs in new order

    if (!statusIds || !Array.isArray(statusIds)) {
      return res.status(400).json({ success: false, message: '┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à╪╖┘ä┘ê╪¿╪⌐' });
    }

    // ╪¬╪¡╪»┘è╪½ ╪º┘ä╪¬╪▒╪¬┘è╪¿
    for (let i = 0; i < statusIds.length; i++) {
      await getSharedPrismaClient().orderStatusConfig.updateMany({
        where: { id: statusIds[i], companyId },
        data: { sortOrder: i + 1 }
      });
    }

    res.json({
      success: true,
      message: '╪¬┘à ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪¿┘å╪¼╪º╪¡'
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error reordering:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪¬╪▒╪¬┘è╪¿', error: error.message });
  }
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒöº Initialize Default Statuses
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * POST /api/v1/order-status/initialize
 * ╪¬┘ç┘è╪ª╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐
 */
const initializeStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    await initializeDefaultStatuses(companyId);

    // ≡ƒöä Sync all order statuses to workflow definitions (backfill)
    const prisma = getSharedPrismaClient();
    const orderStatuses = await prisma.orderStatusConfig.findMany({
      where: { companyId, isActive: true, statusType: 'order' },
      orderBy: { sortOrder: 'asc' }
    });
    for (const s of orderStatuses) {
      await syncStatusToWorkflow(prisma, companyId, s);
    }

    const statuses = await prisma.orderStatusConfig.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      message: '╪¬┘à ╪¬┘ç┘è╪ª╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐',
      data: statuses
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error initializing:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪º┘ä╪¬┘ç┘è╪ª╪⌐', error: error.message });
  }
};

/**
 * Helper: ╪¬┘ç┘è╪ª╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐
 */
/**
 * ΓÜí Refactored: one read + parallel upserts in a transaction.
 * Previously: 4 loops ├ù (N ├ù findFirst + N ├ù create/update) = O(8N) sequential queries.
 * Now: 1 read + 1 transaction with N parallel upserts = O(1) round-trips.
 */
const initializeDefaultStatuses = async (companyId) => {
  const prisma = getSharedPrismaClient();

  // Single read: get all existing statuses for this company
  const existingStatuses = await prisma.orderStatusConfig.findMany({
    where: { companyId },
    select: { code: true, statusType: true, isSystemStatus: true }
  });
  const existingMap = new Map(existingStatuses.map(s => [s.code, s]));

  const makeUpsertData = (status, statusType, source) => ({
    companyId,
    ...status,
    statusType,
    source,
    isSystemStatus: true,
    isActive: true
  });

  const upsertOps = [
    ...DEFAULT_ORDER_STATUSES.map(s => ({
      code: s.code,
      statusType: 'order',
      source: 'system',
      data: makeUpsertData(s, 'order', 'system')
    })),
    ...DEFAULT_PAYMENT_STATUSES.map(s => ({
      code: s.code,
      statusType: 'payment',
      source: 'system',
      data: makeUpsertData(s, 'payment', 'system')
    })),
    ...DEFAULT_SHIPPING_STATUSES.map(s => ({
      code: s.code,
      statusType: 'shipping',
      source: s.code.startsWith('TURBO_') ? 'turbo' : 'system',
      data: makeUpsertData(s, 'shipping', s.code.startsWith('TURBO_') ? 'turbo' : 'system')
    })),
    ...DEFAULT_PREPARATION_STATUSES.map(s => ({
      code: s.code,
      statusType: 'preparation',
      source: 'system',
      data: makeUpsertData(s, 'preparation', 'system')
    }))
  ];

  // Upsert only if missing or stale (not system / wrong type)
  const needsUpdate = upsertOps.filter(op => {
    const existing = existingMap.get(op.code);
    return !existing || existing.statusType !== op.statusType || !existing.isSystemStatus;
  });

  if (needsUpdate.length === 0) {
    return;
  }

  // Single transaction for all writes ΓÇö parallel via Promise.all
  await prisma.$transaction(async (tx) => {
    await Promise.all(needsUpdate.map(op =>
      tx.orderStatusConfig.upsert({
        where: { companyId_code: { companyId, code: op.code } },
        update: op.data,
        create: op.data
      })
    ));
  });

  console.log(`≡ƒÅ╖∩╕Å [ORDER-STATUS] Initialized ${needsUpdate.length} default status(s) for company ${companyId}`);
};

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ≡ƒôè Get Status Statistics
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ

/**
 * GET /api/v1/order-status/stats
 * ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪º┘ä╪¡╪º┘ä╪º╪¬
 */
const getStatusStats = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    // ╪╣╪»╪» ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪¡╪│╪¿ ╪º┘ä┘å┘ê╪╣
    const statusCounts = await getSharedPrismaClient().orderStatusConfig.groupBy({
      by: ['statusType', 'source'],
      where: { companyId, isActive: true },
      _count: true
    });

    // ╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ä┘â┘ä ╪¡╪º┘ä╪⌐
    const ordersByStatus = await getSharedPrismaClient().order.groupBy({
      by: ['status'],
      where: { companyId },
      _count: true
    });

    res.json({
      success: true,
      data: {
        statusCounts,
        ordersByStatus
      }
    });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error getting stats:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬', error: error.message });
  }
};

/**
 * GET /api/v1/order-status/with-templates
 * ╪¼┘ä╪¿ ╪¼┘à┘è╪╣ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘à╪╣ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘â┘ä ╪¡╪º┘ä╪⌐
 */
/**
 * ╪¬╪ú┘â╪» ╪ú┘å ┘â┘ä ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿ ┘å╪┤╪╖╪⌐ ┘ä┘ç╪º ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿ ╪º┘ü╪¬╪▒╪º╪╢┘è ┘ü┘è ╪º┘ä╪»╪º╪¬╪º╪¿┘è╪▓.
 * ┘à╪╡╪»╪▒ ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ê╪¡┘è╪» ┘ç┘ê ╪╡┘ü╪¡╪⌐ /orders/status-templates╪î ┘ä╪░╪º ┘å┘å╪┤╪ª
 * ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘â╪╡┘ü┘ê┘ü DB ┘é╪º╪¿┘ä╪⌐ ┘ä┘ä╪¬╪╣╪»┘è┘ä ┘à┘å ╪º┘ä╪╡┘ü╪¡╪⌐ (┘ê┘ä┘è╪│ ┘ü┘è ╪º┘ä┘â┘ê╪»).
 * ≡ƒÜ¿ PRODUCTION-FIX (┬º2.3): seedDefaultOrderTemplates ┘à╪│╪¬┘ê╪▒╪»╪⌐ ┘à┘å services/orderTemplateSeeding.
 */

const getStatusesWithTemplates = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä' });
    }

    // Seed default order templates into DB (editable from this page)
    await seedDefaultOrderTemplates(companyId, getSharedPrismaClient());

    const EXTRA_ORDER_EVENTS = [
      { code: 'ORDER_CREATED', name: '╪╖┘ä╪¿ ╪¼╪»┘è╪»' },
      { code: 'ORDER_CANCELLED', name: '╪Ñ┘ä╪║╪º╪í ╪º┘ä╪╖┘ä╪¿' },
      { code: 'PAYMENT_REMINDER', name: '╪¬╪░┘â┘è╪▒ ╪¿╪º┘ä╪»┘ü╪╣' }
    ];

    const INCOMPLETE_CART_EVENT = {
      code: 'INCOMPLETE_CART_FIRST_APPEARANCE',
      name: '╪▒╪│╪º┘ä╪⌐ ╪ú┘ê┘ä ╪╕┘ç┘ê╪▒ - ╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘â╪¬┘à┘ä'
    };

    const incompleteSettings = await getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId },
      select: { incompleteCartImmediateMessage: true }
    });

    const statuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where: {
        companyId,
        isActive: true,
        statusType: { in: ['order', 'preparation', 'shipping', 'payment'] }
      },
      orderBy: [{ statusType: 'asc' }, { sortOrder: 'asc' }]
    });

    const allEventCodes = [
      ...statuses.map(s => s.code),
      ...EXTRA_ORDER_EVENTS.map(e => e.code),
      INCOMPLETE_CART_EVENT.code
    ];

    const templates = await getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where: {
        companyId,
        eventType: { in: allEventCodes },
        isActive: true
      }
    });

    // ┘â┘ä ╪¡╪º┘ä╪⌐ ┘ä┘è┘ç ┘é╪º┘ä╪¿╪º┘å ┘à╪│╪¬┘é┘ä╪º┘å: template (┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è/╪¬┘ä┘é╪º╪ª┘è) + metaTemplate (┘é┘å╪º╪⌐ META_CLOUD).
    // ╪º┘ä╪¬╪╡┘å┘è┘ü ╪¿╪º┘ä┘Ç channel ΓÇö ┘å┘ü╪│ ┘à┘å╪╖┘é ╪╡┘ü╪¡╪⌐ /customers/customer-notifications.
    const regularMap = {};
    const metaMap = {};
    for (const t of templates) {
      const isMeta = String(t.channel || '').toUpperCase() === 'META_CLOUD';
      const map = isMeta ? metaMap : regularMap;
      if (!map[t.eventType]) map[t.eventType] = t;
    }

    const buildStatus = (base, code) => {
      const regular = regularMap[code] || null;
      const meta = metaMap[code] || null;
      return {
        ...base,
        template: regular,
        metaTemplate: meta,
        hasTemplate: !!regular || !!meta,
        hasMetaTemplate: !!meta,
        isNonNotifiable: isNonNotifiableStatus(code)
      };
    };

    const result = [
      ...statuses.map(s => buildStatus(s, s.code)),
      // ╪ú╪¡╪»╪º╪½ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣╪º┘à╪⌐ (╪║┘è╪▒ ┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿╪¡╪º┘ä╪⌐ orderStatusConfig) ╪¬╪╕┘ç╪▒ ┘ç┘å╪º
      // ╪¡╪¬┘ë ┘è┘à┘â┘å ╪Ñ╪»╪º╪▒╪¬┘ç╪º ┘à┘å ╪╡┘ü╪¡╪⌐ ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¿╪»┘ä╪º┘ï ┘à┘å ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪½╪¿╪¬╪⌐ ┘ü┘è ╪º┘ä┘â┘ê╪».
      ...EXTRA_ORDER_EVENTS.map(e => buildStatus({
        id: `extra-${e.code}`,
        code: e.code,
        name: e.name,
        color: '#6B7280',
        sortOrder: 999,
        statusType: 'order',
        notifyCustomer: true,
        isSystemStatus: true
      }, e.code)),
      buildStatus({
        id: `extra-${INCOMPLETE_CART_EVENT.code}`,
        code: INCOMPLETE_CART_EVENT.code,
        name: INCOMPLETE_CART_EVENT.name,
        color: '#7C3AED',
        sortOrder: 999,
        statusType: 'incomplete',
        notifyCustomer: incompleteSettings?.incompleteCartImmediateMessage === true,
        isSystemStatus: true
      }, INCOMPLETE_CART_EVENT.code)
    ];

    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Γ¥î [ORDER-STATUS] Error getting statuses with templates:', error);
    res.status(500).json({ success: false, message: '╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¿┘è╪º┘å╪º╪¬', error: error.message });
  }
};

module.exports = {
  getAllStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  syncWooCommerceStatuses,
  updateStatusMapping,
  reorderStatuses,
  initializeStatuses,
  getStatusStats,
  initializeDefaultStatuses,
  DEFAULT_ORDER_STATUSES,
  getStatusesWithTemplates
};


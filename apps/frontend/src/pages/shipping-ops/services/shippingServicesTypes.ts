export type ServicePricingMode = 'FIXED' | 'PERCENT';
export type ServiceAppliesTo = 'SHIPMENT' | 'ORDER';

export interface ShippingServiceItem {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  description?: string | null;
  pricingMode: ServicePricingMode;
  amount: number;
  appliesTo: ServiceAppliesTo;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PackageOpenStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PackageRequestedByType = 'CLIENT' | 'COURIER' | 'ADMIN';

export interface PackageOpenRequestItem {
  id: string;
  companyId?: string;
  shipmentId: string;
  requestedBy: string;
  requestedByType?: PackageRequestedByType;
  reason?: string | null;
  status: PackageOpenStatus;
  fee?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  shipment?: {
    id: string;
    barcode?: string;
    trackingNumber?: string;
    recipientName?: string;
    destinationGovernorate?: string;
    destinationCity?: string;
    status?: string;
  };
}

export type OrderChangeType = 'ADDRESS' | 'AMOUNT' | 'RECIPIENT';
export type OrderChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OrderChangeRequestItem {
  id: string;
  companyId?: string;
  shipmentId: string;
  type: OrderChangeType;
  oldValue?: string | null;
  newValue?: string | null;
  requestedBy: string;
  requestedByType?: PackageRequestedByType;
  reason?: string | null;
  status: OrderChangeStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  shipment?: {
    id: string;
    barcode?: string;
    trackingNumber?: string;
    recipientName?: string;
    destinationGovernorate?: string;
    destinationCity?: string;
    status?: string;
  };
}

export function formatServiceAmount(mode: ServicePricingMode, amount: number | string | undefined | null): string {
  const num = Number(amount || 0);
  if (mode === 'PERCENT') {
    return `${num}%`;
  }
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

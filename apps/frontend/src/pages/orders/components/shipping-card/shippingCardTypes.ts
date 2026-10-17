/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  providerKey?: string;
  integrationMode?: string;
  isActive: boolean;
  settings?: any;
}

export interface ShippingAutoError {
  category: "DATA_ERROR" | "SYSTEM_ERROR";
  code: string;
  message: string;
  actionHint?: string;
  provider: string;
}

export type CourierMode = "turbo" | "qp" | "bosta" | "custom" | "manual";

export interface UnifiedShippingCardProps {
  order: any;
  onOrderUpdated?: () => void;
  canManageShipments?: boolean;
  onOpenTicket?: () => void;
}

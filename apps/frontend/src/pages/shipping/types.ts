export interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  website?: string;
  apiKey?: string;
  apiUrl?: string;
  providerKey?: string;
  integrationMode?: string;
  linkedCompanyId?: string;
  settings?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ShippingCompanyFormData {
  name: string;
  slug: string;
  phone: string;
  email: string;
  website: string;
  apiKey: string;
  apiUrl: string;
  providerKey: string;
  integrationMode: string;
  linkedCompanyId?: string;
  autoCreateShipments: boolean;
  shipmentCreateTrigger?: string;
  logoUrl?: string;
  isActive: boolean;
  username: string;
  password: string;
  customerId: string;
  defaultNotes: string;
  pickupAddress: string;
  mainClientCode: string;
  senderNumber: string;
}

export interface TestedProfile {
  customerId?: number | string;
  customerName?: string;
  address?: string;
}

export const parseSettings = (value?: string | null): Record<string, any> => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

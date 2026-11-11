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

export const BUILTIN_SHIPPING_PROVIDER_KEYS = new Set([
  'TURBO',
  'BOSTA',
  'QP_EXPRESS',
  'BOSTA_DEMO',
  'MYLERZ_DEMO',
  'ARAMEX_DEMO',
]);

export const BUILTIN_SHIPPING_SLUGS = new Set([
  'turbo',
  'bosta',
  'qp-express',
  'qp_express',
]);

export const isBuiltInShippingCompany = (
  company?: { providerKey?: string | null; slug?: string | null } | null
): boolean => {
  if (!company) return false;
  const key = String(company.providerKey || '').trim().toUpperCase();
  const slug = String(company.slug || '').trim().toLowerCase();
  return BUILTIN_SHIPPING_PROVIDER_KEYS.has(key) || BUILTIN_SHIPPING_SLUGS.has(slug);
};

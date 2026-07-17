import { buildApiUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";

export const getCompanyId = (): string | null => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
};

export const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

export const api = (path: string) => {
  const base = buildApiUrl(`hotel/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

export const hotelApi = {
  properties: {
    list: () => fetch(api('properties'), { headers: getAuthHeaders() }).then(r => r.json()),
    create: (data: any) => fetch(api('properties'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: string, data: any) => fetch(api(`properties/${id}`), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`properties/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  roomTypes: {
    list: (propertyId?: string) => fetch(api(`room-types${propertyId ? `?propertyId=${propertyId}` : ''}`), { headers: getAuthHeaders() }).then(r => r.json()),
    create: (data: any) => fetch(api('room-types'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: string, data: any) => fetch(api(`room-types/${id}`), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`room-types/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  rooms: {
    list: (propertyId?: string, roomTypeId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (propertyId) params.set('propertyId', propertyId);
      if (roomTypeId) params.set('roomTypeId', roomTypeId);
      if (status) params.set('status', status);
      return fetch(api(`rooms?${params}`), { headers: getAuthHeaders() }).then(r => r.json());
    },
    create: (data: any) => fetch(api('rooms'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: string, data: any) => fetch(api(`rooms/${id}`), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`rooms/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
    updateStatus: (id: string, status: string, notes?: string) => fetch(api(`rooms/${id}/status`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status, notes }) }).then(r => r.json()),
  },
  reservations: {
    list: (propertyId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (propertyId) params.set('propertyId', propertyId);
      if (status) params.set('status', status);
      return fetch(api(`reservations?${params}`), { headers: getAuthHeaders() }).then(r => r.json());
    },
    get: (id: string) => fetch(api(`reservations/${id}`), { headers: getAuthHeaders() }).then(r => r.json()),
    create: (data: any) => fetch(api('reservations'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    updateStatus: (id: string, status: string) => fetch(api(`reservations/${id}/status`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status }) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`reservations/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  availability: {
    check: (propertyId: string, checkIn: string, checkOut: string) => fetch(api(`availability?propertyId=${propertyId}&checkIn=${checkIn}&checkOut=${checkOut}`), { headers: getAuthHeaders() }).then(r => r.json()),
  },
  folio: {
    add: (reservationId: string, data: any) => fetch(api(`reservations/${reservationId}/folio`), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    remove: (reservationId: string, itemId: string) => fetch(api(`reservations/${reservationId}/folio/${itemId}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  rates: {
    list: (roomTypeId?: string) => fetch(api(`room-rates${roomTypeId ? `?roomTypeId=${roomTypeId}` : ''}`), { headers: getAuthHeaders() }).then(r => r.json()),
    create: (data: any) => fetch(api('room-rates'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`room-rates/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  services: {
    list: (itemType?: string) => fetch(api(`services${itemType ? `?itemType=${itemType}` : ''}`), { headers: getAuthHeaders() }).then(r => r.json()),
    create: (data: any) => fetch(api('services'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    update: (id: string, data: any) => fetch(api(`services/${id}`), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id: string) => fetch(api(`services/${id}`), { method: 'DELETE', headers: getAuthHeaders() }).then(r => r.json()),
  },
  policies: {
    get: () => fetch(api('policies'), { headers: getAuthHeaders() }).then(r => r.json()),
    update: (data: any) => fetch(api('policies'), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
  },
};

export type HotelProperty = {
  id: string; name: string; address?: string; city?: string; phone?: string; email?: string;
  description?: string; amenities?: string[]; images?: string[];
  checkInTime: string; checkOutTime: string; isActive: boolean;
  roomTypes?: any[]; rooms?: any[]; createdAt: string;
};

export type HotelRoomType = {
  id: string; propertyId: string; name: string; nameAr?: string; description?: string;
  capacity: number; basePrice: number; pricingModel?: string; pricePerExtraAdult?: number;
  amenities?: string[]; images?: string[];
  totalRooms: number; isActive: boolean; _count?: { rooms: number };
};

export type HotelRoom = {
  id: string; propertyId: string; roomTypeId: string; roomNumber: string;
  floor?: number; status: string; notes?: string; isActive: boolean;
  view?: string; wing?: string; hasExtraBed?: boolean;
  extraBedCapacity?: number; extraBedPrice?: number; basePriceOverride?: number;
  roomType?: HotelRoomType; property?: HotelProperty;
};

export type HotelReservation = {
  id: string; propertyId: string; customerId?: string; customerName: string;
  customerPhone?: string; customerEmail?: string; customerNotes?: string;
  checkIn: string; checkOut: string; adults: number; children: number;
  totalAmount: number; paidAmount: number; status: string; source?: string;
  depositRequired?: boolean; depositAmount?: number; depositPaid?: boolean; paymentMethod?: string;
  rooms: HotelReservationRoom[]; folio: HotelFolioItem[]; property?: HotelProperty;
  createdAt: string;
};

export type HotelReservationRoom = {
  id: string; reservationId: string; roomId: string; roomTypeId: string;
  nightlyRate: number; room?: HotelRoom; roomType?: HotelRoomType;
};

export type HotelFolioItem = {
  id: string; reservationId: string; description: string; amount: number;
  itemType: string; quantity: number; chargedAt: string;
};

export type HotelService = {
  id: string; name: string; nameAr?: string; itemType: string;
  price: number; isActive: boolean;
};

export type HotelPolicy = {
  id?: string; companyId?: string;
  checkInTime: string; checkOutTime: string;
  earlyCheckInFee: number; lateCheckOutFee: number;
  cancelFreeBefore: number; cancelPenaltyPct: number;
  childrenAllowed: boolean; extraBedPrice: number;
  quietHoursFrom?: string; quietHoursTo?: string;
  smokingAllowed: boolean;
  visitorsAllowed: boolean; visitorsHours?: string;
  customRules?: string[];
};

export type HotelRoomRate = {
  id: string; roomTypeId: string; dateFrom: string; dateTo: string;
  price: number; label?: string; roomType?: HotelRoomType;
};

export const ROOM_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'متاحة', OCCUPIED: 'مشغولة', MAINTENANCE: 'صيانة', CLEANING: 'تنظيف', RESERVED: 'محجوزة'
};

export const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800', OCCUPIED: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800', CLEANING: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-purple-100 text-purple-800'
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلق', CONFIRMED: 'مؤكد', CHECKED_IN: 'تم الوصول', CHECKED_OUT: 'تم المغادرة', CANCELLED: 'ملغي', NO_SHOW: 'لم يحضر'
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800', CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800', NO_SHOW: 'bg-orange-100 text-orange-800'
};

export const FOLIO_TYPE_LABELS: Record<string, string> = {
  ROOM_CHARGE: 'إقامة', SERVICE: 'خدمة', RESTAURANT: 'مطعم', SPA: 'سبا', TOUR: 'جولة', TRANSPORT: 'مواصلات', OTHER: 'أخرى'
};

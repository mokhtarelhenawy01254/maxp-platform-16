export interface CartProductItem {
  name: string;
  quantity: number;
  price: number;
  image?: string | null;
}

export interface CartItem {
  id: string;
  cartId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  governorate?: string | null;
  itemsCount: number;
  items: CartProductItem[];
  cartValue: number;
  createdAt: string;
  lastUpdated: string;
  expiresAt: string;
  hasPhone: boolean;
  urgencyTier: "fresh" | "active" | "expired";
  hasStartedCheckout: boolean;
}

export interface ConvertedCartItem {
  id: string;
  cartId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  cartValue: number;
  convertedAt: string;
  channel?: string | null;
  employeeName?: string | null;
  governorate?: string | null;
}

export interface FunnelStep {
  stage: string;
  label: string;
  count: number;
}

export interface TopProduct {
  productId?: string | null;
  productName: string;
  category: string;
  image?: string | null;
  price: number;
  abandonedCount: number;
  lostRevenue: number;
}

export interface AbandonedCartStats {
  totalCarts: number;
  abandonedCarts: number;
  activeCarts: number;
  convertedCarts: number;
  abandonmentRate: number;
  recoveryRate: number;
  totalCartValue: number;
  activeCartValue: number;
  recoveredRevenue: number;
  avgCartValue: number;
  funnel: FunnelStep[];
  topAbandonedProducts: TopProduct[];
  recentAbandonedCarts: CartItem[];
  recentConverted: ConvertedCartItem[];
}

export type FilterType = "all" | "with_phone" | "fresh" | "active" | "expired";

import { OrderItem } from "../types";

export interface OrderItemsCardProps {
  isEditing: boolean;
  items: OrderItem[];
  currency: string;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  };
  discountReason?: string | null;
  editDiscountReason?: string;
  onAddItem: () => void;
  onItemChange: (index: number, field: string, value: unknown) => void;
  onRemoveItem: (index: number) => void;
  onShippingChange?: (value: number) => void;
  onTaxChange?: (value: number) => void;
  onDiscountChange?: (value: number) => void;
  onDiscountReasonChange?: (value: string) => void;
}

export type OrderItemAttributeEntry = {
  type?: unknown;
  option?: unknown;
};

export type OrderItemMetadata = {
  sku?: unknown;
  image?: unknown;
  images?: unknown;
  stock?: unknown;
  color?: unknown;
  Color?: unknown;
  productColor?: unknown;
  size?: unknown;
  Size?: unknown;
  productSize?: unknown;
  quantityOffer?: {
    groupId?: unknown;
    offerLabel?: unknown;
    offerQuantity?: unknown;
    slotIndex?: unknown;
    freeShipping?: unknown;
  };
  attributeValues?: Record<string, unknown>;
  attributes?: OrderItemAttributeEntry[] | Record<string, unknown>;
  [key: string]: unknown;
};

export type QuantityOfferDisplay = {
  groupId: string;
  offerLabel: string;
  offerQuantity: number;
  slotIndex: number | null;
  freeShipping: boolean;
};

export type QuantityOfferGroupedItem = {
  item: OrderItem;
  index: number;
  slotIndex: number | null;
};

export type QuantityOfferGroup = {
  groupId: string;
  offerLabel: string;
  offerQuantity: number;
  freeShipping: boolean;
  total: number;
  selectedPieces: number;
  items: QuantityOfferGroupedItem[];
};

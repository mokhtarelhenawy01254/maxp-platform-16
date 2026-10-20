export interface BulkOrderItem {
  row: number;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  city: string;
  area?: string;
  governorate: string;
  address?: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  total?: number;
  collectAmount?: number;
  deliverAmount?: number;
  returnContent?: string;
  notes: string;
}

export interface BulkOrderModalProps {
  item?: {
    id: string;
    name: string;
    description?: string;
    operationNumber: string;
    status: string;
    totalOrders: number;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

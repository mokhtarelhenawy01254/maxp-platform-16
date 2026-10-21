export interface WooCommerceProduct {
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
}

export interface ProcurementCatalogItem {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  cost: number;
  price?: number;
  stock: number;
  imageUrl?: string | null;
  category?: string | null;
  type?: "product" | "dental_material";
}

export interface SelectedProcurementItem {
  productId: string | null;
  variantId?: string | null;
  productName: string;
  unitPrice?: number;
  quantity?: number;
  sku?: string;
  description?: string;
}

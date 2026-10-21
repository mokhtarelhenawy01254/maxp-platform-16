export interface ProcurementCatalogItem {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  parentName?: string | null;
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

export interface ProductCatalogGroup {
  productId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  hasVariants: boolean;
  totalStock: number;
  minCost: number;
  maxCost: number;
  variants: ProcurementCatalogItem[];
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

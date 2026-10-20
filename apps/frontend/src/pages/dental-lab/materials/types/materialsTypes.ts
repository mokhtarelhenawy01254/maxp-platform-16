import type {
  DentalMaterial,
  DentalMaterialsSummary,
  DentalSupplier,
} from "../../shared";

export const CATEGORY_LABELS: Record<string, string> = {
  MILLING_DISC: "أقراص خراطة (CAD/CAM)",
  MILLING_BLOCK: "بلوكات خراطة",
  IMPLANT_PART: "أجزاء زرعات (Ti-Base)",
  CONSUMABLE: "مستهلكات وسوائل",
  TOOL_BUR: "بنط خراطة (Burs)",
};

export interface MaterialsKpiCardsProps {
  summary: DentalMaterialsSummary | null;
  materialsCount: number;
}

export interface MaterialsCategoryTabsProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  materials: DentalMaterial[];
}

export interface MaterialCardProps {
  material: DentalMaterial;
  onStockIn: (material: DentalMaterial) => void;
}

export interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: any;
    brand?: string;
    supplierId?: string;
    supplierName?: string;
    defaultShade?: string;
    standardCapacity: number;
    costPerItem: number;
    minStockAlert: number;
  }) => Promise<void>;
  suppliers: DentalSupplier[];
  onOpenAddSupplier: () => void;
  isSubmitting: boolean;
}

export interface StockInModalProps {
  isOpen: boolean;
  material: DentalMaterial | null;
  onClose: () => void;
  onSubmit: (data: {
    materialId: string;
    lotNumber: string;
    shade?: string;
    thicknessMm?: number;
    initialUnits?: number;
    totalCost?: number;
    supplierId?: string;
    supplierName?: string;
    expiryDate?: string;
  }) => Promise<void>;
  suppliers: DentalSupplier[];
  onOpenAddSupplier: () => void;
  isSubmitting: boolean;
}

export interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    city?: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export interface ViewSuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: DentalSupplier[];
  onOpenAddSupplier: () => void;
}

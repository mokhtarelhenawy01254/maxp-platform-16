export interface WorkTypeForm {
  id?: string;
  name: string;
  category: string;
  pricingMode: "PER_UNIT" | "FLAT";
  price: number;
  costPrice: number;
  leadTimeDays: number;
  urgentLeadTimeDays: number;
  defaultMaterial: string;
  materialBrand: string;
  instructions: string;
  defaultWarrantyYears: number;
  defaultCrownCount: number;
  sortOrder: number;
  isActive: boolean;
}

export const COMMON_MATERIALS = [
  "زيركون (Zirconia Multilayer)",
  "إيماكس (e.max CAD / Press)",
  "بورسلين ميتال (PFM Cobalt-Chrome)",
  "بي إي إي كيه (PEEK / High Performance)",
  "أكريل وطباعة 3D (PMMA / 3D Print)",
  "معدن مسبوك (Cast Metal / Gold)",
  "فينير تجميلي (Cosmetic Veneer)",
];

export const COMMON_BRANDS = [
  "Aidite (3D Pro Zir, Honor)",
  "Kuraray Noritake (Katana Zirconia)",
  "Ivoclar Vivadent (IPS e.max CAD / Press)",
  "Upcera (Explore Multilayer)",
  "Wieland Dental (Zenostar)",
  "Vita Zahnfabrik (Suprinity, Enamic)",
  "Argen (ArgenZ Zirconia)",
  "Dentsply Sirona (Cercon ht)",
];

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "CROWN", label: "تيجان" },
  { value: "BRIDGE", label: "جسور" },
  { value: "REMOVABLE", label: "أطقم" },
  { value: "IMPLANT", label: "زراعة" },
  { value: "PROTECTIVE", label: "تطبيقات واقية" },
  { value: "ORTHODONTICS", label: "تقويم" },
  { value: "OTHER", label: "أخرى" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    CATEGORY_OPTIONS.map((c): [string, string] => [c.value, c.label])
  ),
  VENEERS: "فينير",
};

import React from "react";
import {
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Car,
  Coffee,
  Cpu,
  Dumbbell,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Music,
  Package,
  Palette,
  PawPrint,
  PiggyBank,
  Plane,
  Rocket,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react";
import type {
  BusinessSpecialty,
  BusinessSpecialtyFormPayload,
  MarketplaceAppOption,
} from "../../../services/businessSpecialtyService";

export type {
  BusinessSpecialty,
  BusinessSpecialtyFormPayload,
  MarketplaceAppOption,
};

export type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "AUTO";
export type SortOption = "sortOrder" | "name" | "companies";
export type ViewMode = "grid" | "table";

export interface StatusFilterOption {
  id: StatusFilter;
  label: string;
}

export const STATUS_FILTERS: StatusFilterOption[] = [
  { id: "ALL", label: "الكل" },
  { id: "ACTIVE", label: "النشطة" },
  { id: "INACTIVE", label: "الموقوفة" },
  { id: "AUTO", label: "تثبيت تلقائي" },
];

export const STORE_THEME_OPTIONS = [
  { value: "mens-grooming-pro", label: "Mens Grooming Pro (مدونة أفليت + SEO)" },
  { value: "modern-minimal", label: "Modern Minimal (افتراضي)" },
  { value: "khemet-luxe-eg", label: "Khemet Luxe" },
  { value: "ink-paper", label: "Ink & Paper" },
  { value: "crafted", label: "Crafted" },
];

export const SPECIALTY_ICON_CATALOG: {
  name: string;
  labelAr: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { name: "Briefcase", labelAr: "حقيبة أعمال", icon: Briefcase },
  { name: "Store", labelAr: "متجر / محل", icon: Store },
  { name: "ShoppingBag", labelAr: "حقيبة تسوق", icon: ShoppingBag },
  { name: "Building2", labelAr: "شركة / عقارات", icon: Building2 },
  { name: "UtensilsCrossed", labelAr: "مطعم ومأكولات", icon: UtensilsCrossed },
  { name: "Coffee", labelAr: "كافيه ومشروبات", icon: Coffee },
  { name: "Stethoscope", labelAr: "عيادة وصحة", icon: Stethoscope },
  { name: "HeartPulse", labelAr: "رعاية طبية", icon: HeartPulse },
  { name: "Dumbbell", labelAr: "جيم ولياقة", icon: Dumbbell },
  { name: "Scissors", labelAr: "صالون وتجميل", icon: Scissors },
  { name: "Car", labelAr: "سيارات وصيانة", icon: Car },
  { name: "Wrench", labelAr: "ورشة وخدمات", icon: Wrench },
  { name: "GraduationCap", labelAr: "تعليم وتدريب", icon: GraduationCap },
  { name: "Laptop", labelAr: "تقنية وبرمجيات", icon: Laptop },
  { name: "Smartphone", labelAr: "هواتف واتصالات", icon: Smartphone },
  { name: "Shirt", labelAr: "ملابس وأزياء", icon: Shirt },
  { name: "Baby", labelAr: "أطفال وأمومة", icon: Baby },
  { name: "Truck", labelAr: "شحن ولوجستيات", icon: Truck },
  { name: "Package", labelAr: "توزيع وتوريد", icon: Package },
  { name: "Plane", labelAr: "سياحة وسفر", icon: Plane },
  { name: "Home", labelAr: "ديكور ومنزل", icon: Home },
  { name: "Palette", labelAr: "تصميم وفنون", icon: Palette },
  { name: "Camera", labelAr: "تصوير وميديا", icon: Camera },
  { name: "Music", labelAr: "صوتيات وإنتاج", icon: Music },
  { name: "Gamepad2", labelAr: "ألعاب وترفيه", icon: Gamepad2 },
  { name: "BookOpen", labelAr: "كتب ونشر", icon: BookOpen },
  { name: "Landmark", labelAr: "خدمات مالية", icon: Landmark },
  { name: "PiggyBank", labelAr: "تمويل ومحاسبة", icon: PiggyBank },
  { name: "PawPrint", labelAr: "بيطرة وحيوانات", icon: PawPrint },
  { name: "Heart", labelAr: "خيري وإنساني", icon: Heart },
  { name: "Sun", labelAr: "طاقة وبيئة", icon: Sun },
  { name: "Sparkles", labelAr: "تنظيف وتعقيم", icon: Sparkles },
  { name: "Zap", labelAr: "كهرباء وطاقة", icon: Zap },
  { name: "Globe", labelAr: "تجارة دولية", icon: Globe },
  { name: "Users", labelAr: "موارد واستشارات", icon: Users },
  { name: "Cpu", labelAr: "صناعة وعتاد", icon: Cpu },
  { name: "Rocket", labelAr: "ستارتاب وريادة", icon: Rocket },
];

export const SPECIALTY_ICON_MAP = new Map(
  SPECIALTY_ICON_CATALOG.map((item) => [item.name, item.icon]),
);

export const getSpecialtyIcon = (
  iconName?: string | null,
): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  if (!iconName) return Briefcase;
  return SPECIALTY_ICON_MAP.get(iconName) || Briefcase;
};

export const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  ecommerce: "متجر إلكتروني",
  ECOMMERCE: "متجر إلكتروني",
  marketing: "تسويق",
  operations: "عمليات",
  support: "خدمة عملاء",
  crm: "إدارة العملاء",
  ai: "ذكاء اصطناعي",
};

export const getCategoryLabel = (category?: string | null): string => {
  if (!category) return "عام";
  return CATEGORY_LABELS[category] || category;
};

export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object") {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return candidate.response?.data?.message || candidate.message || fallback;
  }
  return fallback;
};

export const createDefaultFormPayload = (): BusinessSpecialtyFormPayload => ({
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  icon: "Briefcase",
  appSlugs: [],
  autoInstallOnSignup: true,
  themeId: null,
  sortOrder: 0,
  isActive: true,
});

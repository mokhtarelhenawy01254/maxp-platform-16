import {
  Store,
  Heart,
  Brain,
  BarChart3,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MarketplaceApp } from "@/types/marketplace";

export interface SystemHub {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: LucideIcon;
  descriptionAr: string;
  categories: string[];
  specialtySlugs: string[];
  badgeClassName: string;
  borderClassName: string;
}

export const SYSTEM_HUBS: SystemHub[] = [
  {
    id: "ALL",
    nameAr: "كل المنظومات",
    nameEn: "All Systems",
    icon: LayoutGrid,
    descriptionAr: "استعراض كافة حلول وتطبيقات منصة MaxP لجميع القطاعات",
    categories: [],
    specialtySlugs: [],
    badgeClassName: "bg-muted/70 text-muted-foreground",
    borderClassName: "border-border/40",
  },
  {
    id: "COMMERCE",
    nameAr: "التجارة والتجزئة",
    nameEn: "Commerce & Retail",
    icon: Store,
    descriptionAr: "المتاجر، دروب شيبينغ، جملة، نقاط بيع POS، شحن ومخازن",
    categories: ["ECOMMERCE", "ORDER_OPS", "WHOLESALE", "SALES", "SHIPPING", "WAREHOUSE", "THEMES", "POS"],
    specialtySlugs: ["ecommerce", "fashion", "retail", "clothing", "shoes", "electronics", "supermarket", "wholesale", "dropshipping", "restaurant"],
    badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50",
    borderClassName: "hover:border-blue-500/40",
  },
  {
    id: "MEDICAL",
    nameAr: "المنظومة الطبية",
    nameEn: "Medical & Health",
    icon: Heart,
    descriptionAr: "إدارة العيادات، معامل الأسنان، مراكز الأشعة، وملفات المرضى",
    categories: ["MEDICAL"],
    specialtySlugs: ["medical", "clinic", "dental", "dental_lab", "dental-lab", "radiology", "doctor", "pharmacy", "hospital"],
    badgeClassName: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/50",
    borderClassName: "hover:border-rose-500/40",
  },
  {
    id: "AI_COMMUNICATION",
    nameAr: "الذكاء الاصطناعي والمراسلات",
    nameEn: "AI & Omnichannel",
    icon: Brain,
    descriptionAr: "وكلاء AI، واتساب، تليجرام، بوتات الرد الآلي وخدمة العملاء",
    categories: ["AI", "WHATSAPP", "COMMUNICATION", "SUPPORT", "INTEGRATION"],
    specialtySlugs: ["marketing_agency", "agency", "call_center", "support"],
    badgeClassName: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/50",
    borderClassName: "hover:border-violet-500/40",
  },
  {
    id: "OPERATIONS_FINANCE",
    nameAr: "العمليات والـ HR والمالية",
    nameEn: "Operations & ERP",
    icon: BarChart3,
    descriptionAr: "عهد، بصمة، رواتب، محاسبة، فواتير، وتقارير الأداء",
    categories: ["HR", "FINANCE", "ACCOUNTING", "PAYMENTS", "ANALYTICS", "PRODUCTIVITY", "PROCUREMENT", "AUTOMATION"],
    specialtySlugs: ["services", "enterprise", "holding", "factory", "contracting"],
    badgeClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/50",
    borderClassName: "hover:border-emerald-500/40",
  },
  {
    id: "MARKETING_GROWTH",
    nameAr: "التسويق والأفلييت",
    nameEn: "Marketing & Growth",
    icon: Sparkles,
    descriptionAr: "شبكة المسوقين، الحملات الإعلانية، الكوبونات، وعروض النمو",
    categories: ["MARKETING", "CRM", "SEO", "GAMIFICATION", "DESIGN"],
    specialtySlugs: ["affiliate", "marketing", "influencer"],
    badgeClassName: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50",
    borderClassName: "hover:border-amber-500/40",
  },
];

export function getAppSystemHub(app: MarketplaceApp): SystemHub {
  const cat = (app.category || "").toUpperCase();
  for (const hub of SYSTEM_HUBS) {
    if (hub.id === "ALL") continue;
    if (hub.categories.includes(cat)) {
      return hub;
    }
  }
  return SYSTEM_HUBS[1];
}

export function resolveRecommendedSystemHub(specialtySlug?: string | null): SystemHub | null {
  if (!specialtySlug) return null;
  const s = specialtySlug.toLowerCase().trim();
  for (const hub of SYSTEM_HUBS) {
    if (hub.id === "ALL") continue;
    if (hub.specialtySlugs.some(slug => s.includes(slug) || slug.includes(s))) {
      return hub;
    }
  }
  return null;
}

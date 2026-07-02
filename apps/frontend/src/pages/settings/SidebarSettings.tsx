import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "../../components/ui/switch";
import { getSidebarConfig } from "../../config/sidebar";
import { useAuth } from "../../hooks/useAuthSimple";
import { useSidebarSettings } from "../../contexts/SidebarSettingsContext";
import type { SidebarItem, SidebarItemSettings, SidebarLayoutType, SidebarSection, SidebarSectionSettings, SidebarManagementData } from "../../types/layout";

const ALL_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER", "AGENT", "AFFILIATE", "MERCHANT", "CUSTOMER"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Company Admin",
  OWNER: "مالك",
  MANAGER: "مدير",
  AGENT: "وكيل",
  AFFILIATE: "مسوق",
  MERCHANT: "تاجر",
  CUSTOMER: "عميل",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  COMPANY_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  AGENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  AFFILIATE: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  MERCHANT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CUSTOMER: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const CATEGORY_MAP: Record<string, string> = {
  main: "رئيسية",
  facebook: "تواصل",
  whatsapp: "تواصل",
  telegram: "تواصل",
  orders: "مبيعات",
  "orders-analytics": "تحليلات",
  products: "مبيعات",
  "storefront-design": "مبيعات",
  customers: "عملاء",
  procurement: "مشتريات",
  affiliate: "تسويق",
  "platform-partner": "تسويق",
  inventory: "مخزون",
  marketing: "تسويق",
  "my-account": "موظفين",
  "my-companies": "إدارة",
  hr: "موظفين",
  business: "عمليات",
  analytics: "تحليلات",
  support: "دعم",
  marketplace: "نظام",
  billing: "مالية",
  notifications: "نظام",
  activity: "نظام",
  settings: "نظام",
  "ai-operator": "نظام",
  admin: "إدارة",
  system: "إدارة",
  company: "إدارة",
  legal: "نظام",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  رئيسية: Squares2X2Icon,
  تواصل: ChatBubbleIcon,
  مبيعات: ShoppingCartIcon,
  تحليلات: ChartIcon,
  عملاء: UsersIcon,
  مشتريات: ClipboardIcon,
  تسويق: MegaphoneIcon,
  مخزون: ArchiveBoxIcon,
  موظفين: UserGroupIcon,
  إدارة: CogIcon,
  عمليات: CalendarIcon,
  دعم: TicketIcon,
  نظام: ComputerIcon,
  مالية: CurrencyIcon,
};

const CATEGORY_COLORS: Record<string, string> = {
  رئيسية: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
  تواصل: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
  مبيعات: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
  تحليلات: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
  عملاء: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800",
  مشتريات: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ring-orange-200 dark:ring-orange-800",
  تسويق: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 ring-pink-200 dark:ring-pink-800",
  مخزون: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-teal-200 dark:ring-teal-800",
  موظفين: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-800",
  إدارة: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800",
  عمليات: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
  دعم: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 ring-lime-200 dark:ring-lime-800",
  نظام: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-gray-200 dark:ring-gray-700",
  مالية: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 ring-yellow-200 dark:ring-yellow-800",
};

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}
function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.794.794 0 01-1.17-.532 19.642 19.642 0 01-.597-3.58m0-9.18a19.64 19.64 0 01.597-3.58.794.794 0 011.17-.532l.657.38c.523.301.71.961.463 1.511a12.163 12.163 0 00-.985 2.783m0 9.18H18.75A2.25 2.25 0 0021 15.75V12.5a2.25 2.25 0 00-2.25-2.25h-3.47" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function ArchiveBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 11.625v6.75" />
    </svg>
  );
}
function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0zm-12 0a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm0 0l-1.5 1.5m15 0L18 12m-7.5 7.5l1.5-1.5M12 4.5L10.5 6" />
    </svg>
  );
}
function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}
function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-6.75-1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v6zm7.5 0a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v3z" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const SidebarSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, refreshSettings, userLayout, setUserLayout } = useSidebarSettings();
  const [localSections, setLocalSections] = useState<Record<string, SidebarSectionSettings>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [expandedItemRoles, setExpandedItemRoles] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"categories" | "flat">("categories");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sidebarSections = useMemo(() => {
    try {
      return getSidebarConfig(t, user ?? {});
    } catch {
      return [];
    }
  }, [t, user]);

  // Sections visible in settings = only those from active apps and permitted roles
  const visibleSectionIds = useMemo(() => {
    return new Set(sidebarSections.filter((s) => !s.hidden).map((s) => s.id));
  }, [sidebarSections]);

  useEffect(() => {
    if (settings && settings.sections) {
      // Only keep settings for sections that are currently accessible (active apps + permitted roles)
      const filtered: Record<string, SidebarSectionSettings> = {};
      for (const [sectionId, section] of Object.entries(settings.sections)) {
        if (visibleSectionIds.has(sectionId)) {
          filtered[sectionId] = section;
        }
      }
      setLocalSections(filtered);
    } else if (sidebarSections.length > 0 && !settings) {
      const defaults: Record<string, SidebarSectionSettings> = {};
      for (const section of sidebarSections) {
        if (section.hidden) continue; // Skip inactive/restricted sections
        const sectionItems: Record<string, SidebarItemSettings> = {};
        for (const item of section.items) {
          const itemId = item.itemId || item.to.replace(/[^a-zA-Z0-9]/g, "_");
          sectionItems[itemId] = {
            visible: !item.hidden,
            enabled: true,
            order: section.items.indexOf(item),
            requiredRoles: item.requiredRoles || [],
            requiredApps: item.requiredApps || [],
          };
        }
        defaults[section.id] = {
          visible: !section.hidden,
          order: sidebarSections.indexOf(section),
          requiredRoles: section.requiredRoles || [],
          requiredApps: section.requiredApps || [],
          items: sectionItems,
        };
      }
      setLocalSections(defaults);
    }
  }, [settings, sidebarSections, visibleSectionIds]);

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("idle");
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, 800);
  }, [localSections]);

  const performSave = useCallback(async () => {
    setSaveStatus("saving");
    // Only save currently-visible sections — do not merge stale DB sections
    // that may carry outdated "visible: false" for now-reactivated apps.
    const success = await updateSettings({ sections: localSections } as Partial<SidebarManagementData>);
    setSaveStatus(success ? "saved" : "error");
    if (success) {
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [localSections, updateSettings]);

  const toggleItemVisibility = useCallback((sectionId: string, itemId: string) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section?.items[itemId]) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...section,
          items: {
            ...section.items,
            [itemId]: { ...section.items[itemId], visible: !section.items[itemId].visible },
          },
        },
      };
    });
    triggerSave();
  }, []);

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section) return prev;
      const newVisible = !section.visible;
      const items = { ...section.items };
      for (const key of Object.keys(items)) {
        items[key] = { ...items[key], visible: newVisible };
      }
      return { ...prev, [sectionId]: { ...section, visible: newVisible, items } };
    });
    triggerSave();
  }, []);

  const setItemVisibility = useCallback((sectionId: string, itemId: string, visible: boolean) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section?.items[itemId]) return prev;
      return {
        ...prev,
        [sectionId]: {
          ...section,
          items: {
            ...section.items,
            [itemId]: { ...section.items[itemId], visible },
          },
        },
      };
    });
    triggerSave();
  }, []);

  const setSectionVisibility = useCallback((sectionId: string, visible: boolean) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section) return prev;
      const items = { ...section.items };
      for (const key of Object.keys(items)) {
        items[key] = { ...items[key], visible };
      }
      return { ...prev, [sectionId]: { ...section, visible, items } };
    });
    triggerSave();
  }, []);

  const moveItem = useCallback((sectionId: string, itemId: string, direction: "up" | "down") => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section) return prev;
      const entries = Object.entries(section.items);
      const idx = entries.findIndex(([id]) => id === itemId);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === entries.length - 1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [entries[idx], entries[swapIdx]] = [entries[swapIdx], entries[idx]];
      const newItems: Record<string, SidebarItemSettings> = {};
      entries.forEach(([id, item], i) => {
        newItems[id] = { ...item, order: i };
      });
      return { ...prev, [sectionId]: { ...section, items: newItems } };
    });
    triggerSave();
  }, []);

  const moveSection = useCallback((sectionId: string, direction: "up" | "down") => {
    setLocalSections((prev) => {
      const entries = Object.entries(prev);
      const idx = entries.findIndex(([id]) => id === sectionId);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === entries.length - 1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [entries[idx], entries[swapIdx]] = [entries[swapIdx], entries[idx]];
      const result: Record<string, SidebarSectionSettings> = {};
      entries.forEach(([id, section], i) => {
        result[id] = { ...section, order: i };
      });
      return result;
    });
    triggerSave();
  }, []);

  const toggleRoleForSection = useCallback((sectionId: string, role: string) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section) return prev;
      const roles = section.requiredRoles?.includes(role)
        ? section.requiredRoles.filter((r) => r !== role)
        : [...(section.requiredRoles || []), role];
      return { ...prev, [sectionId]: { ...section, requiredRoles: roles } };
    });
    triggerSave();
  }, []);

  const toggleRoleForItem = useCallback((sectionId: string, itemId: string, role: string) => {
    setLocalSections((prev) => {
      const section = prev[sectionId];
      if (!section?.items[itemId]) return prev;
      const currentRoles = section.items[itemId].requiredRoles || [];
      const roles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role];
      return {
        ...prev,
        [sectionId]: {
          ...section,
          items: { ...section.items, [itemId]: { ...section.items[itemId], requiredRoles: roles } },
        },
      };
    });
    triggerSave();
  }, []);

  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleRoleExpand = (itemKey: string) => {
    setExpandedItemRoles((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const categorizedSections = useMemo(() => {
    const groups: Record<string, Array<{ sectionId: string; section: SidebarSectionSettings }>> = {};
    const categoryOrder = ["رئيسية", "تواصل", "مبيعات", "تحليلات", "عملاء", "تسويق", "مشتريات", "مخزون", "موظفين", "عمليات", "إدارة", "مالية", "دعم", "نظام"];

    for (const [sectionId, section] of Object.entries(localSections)) {
      if (!visibleSectionIds.has(sectionId)) continue;
      const cat = CATEGORY_MAP[sectionId] || "نظام";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ sectionId, section });
    }

    return Object.entries(groups)
      .sort(([a], [b]) => {
        const ai = categoryOrder.indexOf(a);
        const bi = categoryOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([category, sections]) => ({
        category,
        sections: sections.sort((a, b) => (a.section.order ?? 0) - (b.section.order ?? 0)),
      }));
  }, [localSections, visibleSectionIds]);

  const flatItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: Array<{ sectionId: string; sectionTitle: string; itemId: string; item: SidebarItemSettings }> = [];
    for (const [sectionId, section] of Object.entries(localSections)) {
      if (!visibleSectionIds.has(sectionId)) continue;
      const sectionDef = sidebarSections.find((s) => s.id === sectionId);
      const sectionTitle = sectionDef?.title || sectionId;
      for (const [itemId, item] of Object.entries(section.items)) {
        const itemDef = sectionDef?.items.find((i) => (i.itemId || i.to.replace(/[^a-zA-Z0-9]/g, "_")) === itemId);
        const label = item.label || itemDef?.label || itemId;
        if (label.toLowerCase().includes(q) || sectionTitle.toLowerCase().includes(q)) {
          results.push({ sectionId, sectionTitle, itemId, item });
        }
      }
    }
    return results;
  }, [searchQuery, localSections, sidebarSections, visibleSectionIds]);

  const visibleCount = useMemo(() => {
    let count = 0;
    for (const [sectionId, section] of Object.entries(localSections)) {
      if (!visibleSectionIds.has(sectionId)) continue;
      if (section.visible) {
        for (const item of Object.values(section.items)) {
          if (item.visible) count++;
        }
      }
    }
    return count;
  }, [localSections, visibleSectionIds]);

  const totalCount = useMemo(() => {
    let count = 0;
    for (const [sectionId, section] of Object.entries(localSections)) {
      if (!visibleSectionIds.has(sectionId)) continue;
      count += Object.keys(section.items).length;
    }
    return count;
  }, [localSections, visibleSectionIds]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            <PaintBrushIcon className="h-6 w-6 text-indigo-500" />
            إدارة القائمة الجانبية
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            تحكم في ظهور وترتيب عناصر القائمة الجانبية حسب الصلاحيات والتطبيقات المفعلة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">
            {visibleCount}/{totalCount} ظاهر
          </span>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جاري الحفظ...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              تم الحفظ
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <ExclamationCircleIcon className="h-4 w-4" />
              فشل الحفظ
            </span>
          )}
          <button
            type="button"
            onClick={() => { refreshSettings(); setSaveStatus("idle"); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            تحديث
          </button>
        </div>
      </div>

      {/* Per-user layout picker */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <PaintBrushIcon className="h-4 w-4 text-indigo-500" />
          شكل القائمة الجانبية (إعداد شخصي)
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {([
            { id: "classic" as const, label: "كلاسيك", desc: "قائمة جانبية موسعة" },
            { id: "three-tier" as const, label: "ثلاثي", desc: "رتل + لوحة + قائمة" },
            { id: "horizontal" as const, label: "أفقي", desc: "شريط علوي" },
            { id: "floating" as const, label: "عائم", desc: "بطاقة عائمة" },
            { id: "minimal" as const, label: "مصغر", desc: "أيقونات فقط" },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setUserLayout(userLayout === opt.id ? null : opt.id)}
              className={`relative rounded-lg border-2 p-3 text-right transition ${
                userLayout === opt.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`text-xs font-semibold ${userLayout === opt.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-gray-100"}`}>
                {opt.label}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                {opt.desc}
              </div>
              {userLayout === opt.id && (
                <CheckCircleIcon className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-indigo-500" />
              )}
            </button>
          ))}
          {userLayout && (
            <button
              onClick={() => setUserLayout(null)}
              className="col-span-full mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              إلغاء التخصيص والعودة لإعداد الشركة
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في عناصر القائمة..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-10 pl-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("categories")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "categories"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Squares2X2Icon className="ml-1 inline h-3.5 w-3.5" />
            تصنيفات
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "flat"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Bars3Icon className="ml-1 inline h-3.5 w-3.5" />
            مسطح
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="mr-3 text-sm text-gray-500">جاري تحميل الإعدادات...</span>
        </div>
      ) : flatItems ? (
        <div className="space-y-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
            نتائج البحث ({flatItems.length})
          </h3>
          {flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MagnifyingGlassIcon className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">لا توجد نتائج مطابقة</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-indigo-500 hover:underline"
              >
                مسح البحث
              </button>
            </div>
          ) : (
            flatItems.map(({ sectionId, sectionTitle, itemId, item }) => {
              const sectionDef = sidebarSections.find((s) => s.id === sectionId);
              const itemDef = sectionDef?.items.find((i) => (i.itemId || i.to.replace(/[^a-zA-Z0-9]/g, "_")) === itemId);
              return (
                <div key={`${sectionId}-${itemId}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="min-w-0 flex-1 ml-3">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.label || itemDef?.label || itemId}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {sectionTitle}
                    </p>
                  </div>
                  <Switch
                    checked={item.visible}
                    onCheckedChange={(checked) => setItemVisibility(sectionId, itemId, checked)}
                    size="sm"
                  />
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === "categories" ? (
        <div className="space-y-6">
          {categorizedSections.map(({ category, sections }) => (
            <CategoryGroup
              key={category}
              category={category}
              sections={sections}
              sidebarSections={sidebarSections}
              expandedSections={expandedSections}
              expandedItemRoles={expandedItemRoles}
              searchQuery={searchQuery}
              onToggleExpand={toggleExpand}
              onToggleSectionVisibility={toggleSectionVisibility}
              onSetSectionVisibility={setSectionVisibility}
              onSetItemVisibility={setItemVisibility}
              onMoveSection={moveSection}
              onMoveItem={moveItem}
              onToggleRoleForSection={toggleRoleForSection}
              onToggleRoleForItem={toggleRoleForItem}
              onToggleRoleExpand={toggleRoleExpand}
            />
          ))}
          {categorizedSections.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <p className="text-sm">لا توجد أقسام</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(localSections)
            .filter(([sectionId]) => visibleSectionIds.has(sectionId))
            .map(([sectionId, section], sectionIdx) => {
            const sectionDef = sidebarSections.find((s) => s.id === sectionId);
            const sectionTitle = sectionDef?.title || sectionId;
            const isExpanded = expandedSections[sectionId] ?? true;
            const roles = section.requiredRoles || [];
            const entries = Object.entries(section.items);
            const allVisible = entries.every(([, item]) => item.visible);
            const someVisible = entries.some(([, item]) => item.visible);

            return (
              <div key={sectionId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(sectionId)}
                      className="flex items-center gap-2 text-right"
                    >
                      <ChevronLeftIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{sectionTitle}</span>
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        {entries.length}
                      </span>
                    </button>
                    {roles.length > 0 && (
                      <div className="hidden items-center gap-1 sm:flex">
                        {roles.map((role) => (
                          <span key={role} className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role] || "bg-gray-100 text-gray-700"}`}>
                            {ROLE_LABELS[role] || role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveSection(sectionId, "up")}
                      disabled={sectionIdx === 0}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700"
                      title="تحريك لأعلى"
                    >
                      <ArrowUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(sectionId, "down")}
                      disabled={sectionIdx === Object.keys(localSections).length - 1}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700"
                      title="تحريك لأسفل"
                    >
                      <ArrowDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600" />
                    <Switch
                      checked={section.visible}
                      onCheckedChange={(checked) => setSectionVisibility(sectionId, checked)}
                      size="sm"
                    />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {entries.map(([itemId, item], itemIdx) => {
                          const itemDef = sectionDef?.items.find((i) => (i.itemId || i.to.replace(/[^a-zA-Z0-9]/g, "_")) === itemId);
                          const itemRoles = item.requiredRoles || [];
                          const itemKey = `${sectionId}-${itemId}`;
                          const isRolesExpanded = expandedItemRoles[itemKey] ?? false;

                          return (
                            <div key={itemId} className="group px-4 py-2.5 transition hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                  <Bars3Icon className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-500 dark:text-gray-600" />
                                  <div className="min-w-0 flex-1">
                                    <p className={`truncate text-sm font-medium ${item.visible ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 line-through"}`}>
                                      {item.label || itemDef?.label || itemId}
                                    </p>
                                    <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                                      {itemDef?.to || itemId}
                                    </p>
                                  </div>
                                  {itemRoles.length > 0 && (
                                    <div className="hidden items-center gap-1 lg:flex">
                                      {itemRoles.slice(0, 2).map((role) => (
                                        <span key={role} className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role] || "bg-gray-100 text-gray-700"}`}>
                                          {ROLE_LABELS[role] || role}
                                        </span>
                                      ))}
                                      {itemRoles.length > 2 && (
                                        <span className="text-[10px] text-gray-400">+{itemRoles.length - 2}</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveItem(sectionId, itemId, "up")}
                                    disabled={itemIdx === 0}
                                    className="rounded-lg p-1 text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 disabled:opacity-0 dark:hover:bg-gray-600"
                                    title="تحريك لأعلى"
                                  >
                                    <ArrowUpIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveItem(sectionId, itemId, "down")}
                                    disabled={itemIdx === entries.length - 1}
                                    className="rounded-lg p-1 text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 disabled:opacity-0 dark:hover:bg-gray-600"
                                    title="تحريك لأسفل"
                                  >
                                    <ArrowDownIcon className="h-3 w-3" />
                                  </button>

                                  <Switch
                                    checked={item.visible}
                                    onCheckedChange={(checked) => setItemVisibility(sectionId, itemId, checked)}
                                    size="sm"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => toggleRoleExpand(itemKey)}
                                    className={`rounded-lg p-1.5 transition ${isRolesExpanded || itemRoles.length > 0 ? "text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" : "text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                                    title="صلاحيات الظهور"
                                  >
                                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isRolesExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mb-2 mt-3 mr-9 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                                      <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                          صلاحيات الظهور - {item.label || itemDef?.label || itemId}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {ALL_ROLES.map((role) => {
                                          const isSelected = itemRoles.includes(role);
                                          return (
                                            <button
                                              key={role}
                                              type="button"
                                              onClick={() => toggleRoleForItem(sectionId, itemId, role)}
                                              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                                isSelected
                                                  ? "bg-indigo-500 text-white shadow-sm"
                                                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-indigo-300 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
                                              }`}
                                            >
                                              {ROLE_LABELS[role] || role}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {itemRoles.length === 0 && (
                                        <p className="mt-1.5 text-[10px] text-indigo-400">بدون تحديد: متاح للجميع</p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}

                        <div className="bg-gray-50/50 px-4 py-2.5 dark:bg-gray-700/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              <ShieldCheckIcon className="ml-1 inline h-3.5 w-3.5" />
                              صلاحيات القسم الأساسية
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRoleExpand(`section-${sectionId}`)}
                              className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400"
                            >
                              {expandedItemRoles[`section-${sectionId}`] ? "إخفاء" : "تعديل الصلاحيات"}
                            </button>
                          </div>
                          <AnimatePresence>
                            {expandedItemRoles[`section-${sectionId}`] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {ALL_ROLES.map((role) => {
                                    const isSelected = roles.includes(role);
                                    return (
                                      <button
                                        key={role}
                                        type="button"
                                        onClick={() => toggleRoleForSection(sectionId, role)}
                                        className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                          isSelected
                                            ? "bg-indigo-500 text-white shadow-sm"
                                            : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-indigo-300 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
                                        }`}
                                      >
                                        {ROLE_LABELS[role] || role}
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/20 dark:bg-indigo-900/10">
        <div className="flex items-start gap-3">
          <SparklesIcon className="mt-0.5 h-5 w-5 text-indigo-500" />
          <div>
            <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
              نظام إدارة القائمة الجانبية الذكي
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-indigo-700 dark:text-indigo-300">
              <li className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                العناصر المخفية لا تظهر للمستخدمين نهائياً
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                صلاحيات الأدوار تمنع ظهور العناصر لغير المصرح لهم
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                التطبيقات غير المفعلة تخفي عناصرها تلقائياً
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                يتم حفظ التغييرات تلقائياً بعد التعديل
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryGroupProps {
  category: string;
  sections: Array<{ sectionId: string; section: SidebarSectionSettings }>;
  sidebarSections: SidebarSection[];
  expandedSections: Record<string, boolean>;
  expandedItemRoles: Record<string, boolean>;
  searchQuery: string;
  onToggleExpand: (id: string) => void;
  onToggleSectionVisibility: (id: string) => void;
  onSetSectionVisibility: (id: string, visible: boolean) => void;
  onSetItemVisibility: (sectionId: string, itemId: string, visible: boolean) => void;
  onMoveSection: (id: string, dir: "up" | "down") => void;
  onMoveItem: (sectionId: string, itemId: string, dir: "up" | "down") => void;
  onToggleRoleForSection: (id: string, role: string) => void;
  onToggleRoleForItem: (sectionId: string, itemId: string, role: string) => void;
  onToggleRoleExpand: (key: string) => void;
}

const CategoryGroup = React.memo<CategoryGroupProps>(function CategoryGroup({
  category,
  sections,
  sidebarSections,
  expandedSections,
  expandedItemRoles,
  onToggleExpand,
  onSetSectionVisibility,
  onSetItemVisibility,
  onMoveSection,
  onMoveItem,
  onToggleRoleForSection,
  onToggleRoleForItem,
  onToggleRoleExpand,
}) {
  const CatIcon = CATEGORY_ICONS[category] || Squares2X2Icon;
  const categoryColor = CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-gray-200 dark:ring-gray-700";
  const allSectionsVisible = sections.every(({ section }) => section.visible);
  const allItemsVisible = sections.every(({ section }) =>
    Object.values(section.items).every((item) => item.visible)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-50 to-white px-4 py-3 dark:from-gray-800 dark:to-gray-800/80">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg p-1.5 ring-1 ${categoryColor}`}>
            <CatIcon className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{category}</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {sections.length} أقسام
          </span>
        </div>
        <Switch
          checked={allSectionsVisible}
          onCheckedChange={(checked) => {
            sections.forEach(({ sectionId }) => onSetSectionVisibility(sectionId, checked));
          }}
          size="sm"
        />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {sections.map(({ sectionId, section }) => {
          const sectionDef = sidebarSections.find((s: SidebarSection) => s.id === sectionId);
          const sectionTitle = sectionDef?.title || sectionId;
          const isExpanded = expandedSections[sectionId] ?? true;
          const roles = section.requiredRoles || [];
          const entries = Object.entries(section.items);

          return (
            <div key={sectionId}>
              <button
                type="button"
                onClick={() => onToggleExpand(sectionId)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-right hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ChevronLeftIcon className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{sectionTitle}</span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {entries.length}
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={section.visible}
                    onCheckedChange={(checked) => onSetSectionVisibility(sectionId, checked)}
                    size="sm"
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {entries.map(([itemId, item]) => {
                        const itemDef = sectionDef?.items.find((i: SidebarItem) => (i.itemId || i.to.replace(/[^a-zA-Z0-9]/g, "_")) === itemId);
                        return (
                          <div
                            key={itemId}
                            className="flex items-center justify-between px-6 py-2 transition hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                          >
                            <div className="min-w-0 flex-1 ml-2">
                              <p className={`truncate text-xs font-medium ${item.visible ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 line-through"}`}>
                                {item.label || itemDef?.label || itemId}
                              </p>
                            </div>
                            <Switch
                              checked={item.visible}
                              onCheckedChange={(checked) => onSetItemVisibility(sectionId, itemId, checked)}
                              size="sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SidebarSettings;

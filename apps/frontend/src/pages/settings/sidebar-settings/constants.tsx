import React from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";

export const ALL_ROLES = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "OWNER",
  "MANAGER",
  "AGENT",
  "AFFILIATE",
  "MERCHANT",
  "CUSTOMER",
] as const;

export const getRoleLabel = (
  t: (key: string, options?: Record<string, unknown>) => string,
  role: string
): string => {
  const labels: Record<string, string> = {
    SUPER_ADMIN: t("sidebar.roleSuperAdmin"),
    COMPANY_ADMIN: t("sidebar.roleCompanyAdmin"),
    OWNER: t("sidebar.roleOwner"),
    MANAGER: t("sidebar.roleManager"),
    AGENT: t("sidebar.roleAgent"),
    AFFILIATE: t("sidebar.roleAffiliate"),
    MERCHANT: t("sidebar.roleMerchant"),
    CUSTOMER: t("sidebar.roleCustomer"),
  };
  return labels[role] || role;
};

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  COMPANY_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  AGENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  AFFILIATE: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  MERCHANT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  CUSTOMER: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export const CATEGORY_MAP: Record<string, string> = {
  main: "main",
  facebook: "communication",
  whatsapp: "communication",
  telegram: "communication",
  orders: "sales",
  "orders-analytics": "analytics",
  products: "sales",
  "storefront-design": "sales",
  customers: "customers",
  procurement: "procurement",
  affiliate: "marketing",
  "platform-partner": "marketing",
  inventory: "inventory",
  marketing: "marketing",
  "my-account": "employees",
  "my-companies": "management",
  hr: "employees",
  business: "operations",
  analytics: "analytics",
  support: "support",
  marketplace: "system",
  billing: "finance",
  notifications: "system",
  activity: "system",
  settings: "system",
  "ai-operator": "system",
  admin: "management",
  system: "management",
  company: "management",
  legal: "system",
  education: "operations",
  academy: "operations",
};

export function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}
export function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
export function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
export function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
export function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.794.794 0 01-1.17-.532 19.642 19.642 0 01-.597-3.58m0-9.18a19.64 19.64 0 01.597-3.58.794.794 0 011.17-.532l.657.38c.523.301.71.961.463 1.511a12.163 12.163 0 00-.985 2.783m0 9.18H18.75A2.25 2.25 0 0021 15.75V12.5a2.25 2.25 0 00-2.25-2.25h-3.47" />
    </svg>
  );
}
export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
export function ArchiveBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 11.625v6.75" />
    </svg>
  );
}
export function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0zm-12 0a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
export function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm0 0l-1.5 1.5m15 0L18 12m-7.5 7.5l1.5-1.5M12 4.5L10.5 6" />
    </svg>
  );
}
export function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}
export function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-6.75-1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v6zm7.5 0a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-3a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v3z" />
    </svg>
  );
}
export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
export function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  main: Squares2X2Icon,
  communication: ChatBubbleIcon,
  sales: ShoppingCartIcon,
  analytics: ChartIcon,
  customers: UsersIcon,
  procurement: ClipboardIcon,
  marketing: MegaphoneIcon,
  inventory: ArchiveBoxIcon,
  employees: UserGroupIcon,
  management: CogIcon,
  operations: CalendarIcon,
  support: TicketIcon,
  system: ComputerIcon,
  finance: CurrencyIcon,
};

export const CATEGORY_COLORS: Record<string, string> = {
  main: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
  communication: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
  sales: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
  analytics: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
  customers: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200 dark:ring-blue-800",
  procurement: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ring-orange-200 dark:ring-orange-800",
  marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 ring-pink-200 dark:ring-pink-800",
  inventory: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-teal-200 dark:ring-teal-800",
  employees: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-800",
  management: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800",
  operations: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
  support: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 ring-lime-200 dark:ring-lime-800",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-gray-200 dark:ring-gray-700",
  finance: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 ring-yellow-200 dark:ring-yellow-800",
};

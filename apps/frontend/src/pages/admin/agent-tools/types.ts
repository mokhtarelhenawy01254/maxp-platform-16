export interface ToolDefinition {
  name: string;
  description: string;
  sideEffects: "read" | "write";
  requiresApproval: boolean;
  approvalMode?: string;
  source?: string;
  runtimeSource?: string;
  aliases?: string[];
  companyScoped?: boolean;
  group?: string;
  parameters?: Record<string, any>;
  schema?: Record<string, any>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: string;
  allowedTools: string[];
  toolAutonomy?: Record<string, string>;
}

export interface AgentToolInfo {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: string;
  autonomy?: string;
}

export type ToolSideEffectFilter = "all" | "read" | "write";
export type ToolInstallFilter = "all" | "installed" | "uninstalled";

export interface ToolGroupMeta {
  key: string;
  labelAr: string;
  icon: string;
  colorClass: string;
}

export const KNOWN_TOOL_GROUPS: Record<string, ToolGroupMeta> = {
  all: { key: "all", labelAr: "الكل", icon: "", colorClass: "text-primary" },
  order: { key: "order", labelAr: "الطلبات والمبيعات", icon: "", colorClass: "text-amber-500" },
  product: { key: "product", labelAr: "كتالوج المنتجات", icon: "", colorClass: "text-blue-500" },
  facebook: { key: "facebook", labelAr: "إعلانات ميتا وفيسبوك", icon: "", colorClass: "text-indigo-500" },
  customer: { key: "customer", labelAr: "العملاء والمحادثات", icon: "", colorClass: "text-emerald-500" },
  inventory: { key: "inventory", labelAr: "المخزون والمستودعات", icon: "", colorClass: "text-cyan-500" },
  sales: { key: "sales", labelAr: "المبيعات والصفقات", icon: "", colorClass: "text-rose-500" },
  shipping: { key: "shipping", labelAr: "الشحن والتوصيل", icon: "", colorClass: "text-orange-500" },
  medical: { key: "medical", labelAr: "العيادات والمواعيد", icon: "", colorClass: "text-teal-500" },
  hotel: { key: "hotel", labelAr: "الفنادق والغرف", icon: "", colorClass: "text-amber-600" },
  governance: { key: "governance", labelAr: "الحوكمة والرقابة", icon: "", colorClass: "text-purple-500" },
  knowledge_base: { key: "knowledge_base", labelAr: "قاعدة المعرفة", icon: "", colorClass: "text-sky-500" },
  hr: { key: "hr", labelAr: "الموارد البشرية", icon: "", colorClass: "text-emerald-600" },
  smart_seller: { key: "smart_seller", labelAr: "البيع الذكي", icon: "", colorClass: "text-pink-500" },
  system: { key: "system", labelAr: "النظام والبيئة", icon: "", colorClass: "text-slate-500" },
  mcp: { key: "mcp", labelAr: "بروتوكول MCP", icon: "", colorClass: "text-violet-500" },
  other: { key: "other", labelAr: "أخرى", icon: "", colorClass: "text-muted-foreground" },
};

export function getToolGroupMeta(groupName?: string): ToolGroupMeta {
  if (!groupName) return KNOWN_TOOL_GROUPS.other;
  const key = groupName.toLowerCase().trim();
  if (key in KNOWN_TOOL_GROUPS) {
    return KNOWN_TOOL_GROUPS[key];
  }
  // Heuristics
  if (key.includes("order") || key.includes("cart")) return KNOWN_TOOL_GROUPS.order;
  if (key.includes("product")) return KNOWN_TOOL_GROUPS.product;
  if (key.includes("fb") || key.includes("facebook") || key.includes("ad")) return KNOWN_TOOL_GROUPS.facebook;
  if (key.includes("customer") || key.includes("chat") || key.includes("whatsapp")) return KNOWN_TOOL_GROUPS.customer;
  if (key.includes("stock") || key.includes("inventory")) return KNOWN_TOOL_GROUPS.inventory;
  if (key.includes("clinic") || key.includes("medical") || key.includes("patient")) return KNOWN_TOOL_GROUPS.medical;
  if (key.includes("hotel") || key.includes("room")) return KNOWN_TOOL_GROUPS.hotel;
  if (key.includes("mcp")) return KNOWN_TOOL_GROUPS.mcp;
  return {
    key: groupName,
    labelAr: groupName,
    icon: "",
    colorClass: "text-muted-foreground",
  };
}

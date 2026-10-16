/** Shared types for the Developer Hub feature. */

export interface DevCredential {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  credentialType: "API" | "MCP";
  scopes: string[];
  rateLimitPerMin: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevScopeDef {
  key: string;
  group: string;
  label_ar: string;
  label_en: string;
}

export interface DevUsageSummary {
  windowDays: number;
  totals: { requests: number; ok: number; errors: number };
  daily: Array<{ date: string; count: number }>;
  byCredential: Array<{
    credentialId: string;
    count: number;
    name: string;
    maskedKey: string | null;
    credentialType: "API" | "MCP" | null;
  }>;
  topEndpoints: Array<{ label: string; count: number }>;
}

export const formatDateTime = (value: string | null, lang: string | undefined): string => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(lang === "en" ? "en-GB" : "ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
};

export const formatNumber = (value: number | string | null | undefined): string => {
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString("en-US");
};

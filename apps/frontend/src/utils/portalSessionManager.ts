export const PORTAL_SESSIONS_VAULT_KEY = "maxp_portal_sessions_v1";

export type PortalSessionRole =
  | "parent"
  | "teacher"
  | "doctor"
  | "patient"
  | "dental"
  | "courier"
  | "student";

export interface PortalCompanyOption {
  companyId: string;
  companyName: string;
  companySlug?: string | null;
  companyLogo?: string | null;
  label?: string | null;
}

export interface PortalSessionRecord<TProfile = Record<string, unknown>> {
  role: PortalSessionRole;
  companyId: string;
  token: string;
  profile: TProfile | null;
  companySlug?: string | null;
  companyName?: string | null;
  updatedAt: string;
}

interface PortalRoleStorageSpec {
  tokenKey: string;
  profileKey?: string;
  phoneKey?: string;
  nameKey?: string;
  syncSessionStorage?: boolean;
}

export const PORTAL_ROLE_STORAGE_MAP: Record<
  PortalSessionRole,
  PortalRoleStorageSpec
> = {
  parent: {
    tokenKey: "parentToken",
    profileKey: "parent",
  },
  teacher: {
    tokenKey: "teacherToken",
    profileKey: "teacher",
  },
  doctor: {
    tokenKey: "doctorToken",
    profileKey: "doctor",
  },
  patient: {
    tokenKey: "patientToken",
    profileKey: "patient",
  },
  dental: {
    tokenKey: "dental_portal_token",
    profileKey: "dental_portal_dentist",
  },
  courier: {
    tokenKey: "courier_portal_token",
    profileKey: "courier_portal_user",
    syncSessionStorage: true,
  },
  student: {
    tokenKey: "studentToken",
    phoneKey: "studentPhone",
    nameKey: "studentName",
  },
};

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readVault(): Record<string, PortalSessionRecord> {
  if (!canUseBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(PORTAL_SESSIONS_VAULT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, PortalSessionRecord>;
  } catch {
    return {};
  }
}

function writeVault(vault: Record<string, PortalSessionRecord>): void {
  if (!canUseBrowserStorage()) return;
  try {
    if (Object.keys(vault).length === 0) {
      window.localStorage.removeItem(PORTAL_SESSIONS_VAULT_KEY);
    } else {
      window.localStorage.setItem(PORTAL_SESSIONS_VAULT_KEY, JSON.stringify(vault));
    }
  } catch {
    // Storage quota or private mode failure — fail gracefully
  }
}

function getVaultEntryKey(role: PortalSessionRole, companyId: string): string {
  return `${role}:${companyId}`;
}

export function decodeJwtPayload<
  T extends Record<string, unknown> = Record<string, unknown>,
>(token?: string | null): T | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, "=");
    const binary = atob(padded);
    const json =
      typeof TextDecoder !== "undefined"
        ? new TextDecoder().decode(
            Uint8Array.from(binary, (char) => char.charCodeAt(0)),
          )
        : binary;
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function extractCompanyIdFromToken(token?: string | null): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const raw = payload["companyId"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function applyActiveKeys<TProfile>(
  role: PortalSessionRole,
  token: string,
  profile: TProfile | null | undefined,
  persist: boolean = true,
): void {
  if (!canUseBrowserStorage()) return;
  const spec = PORTAL_ROLE_STORAGE_MAP[role];

  try {
    if (persist) {
      window.localStorage.setItem(spec.tokenKey, token);
    }
    if (spec.syncSessionStorage && typeof window.sessionStorage !== "undefined") {
      window.sessionStorage.setItem(spec.tokenKey, token);
    }

    if (spec.profileKey && profile !== undefined) {
      if (profile === null) {
        window.localStorage.removeItem(spec.profileKey);
      } else {
        window.localStorage.setItem(spec.profileKey, JSON.stringify(profile));
      }
    }

    if (role === "student" && profile && typeof profile === "object") {
      const profileRecord = profile as Record<string, unknown>;
      const phone = profileRecord["phone"];
      const name = profileRecord["name"];
      if (spec.phoneKey && typeof phone === "string" && phone.trim()) {
        window.localStorage.setItem(spec.phoneKey, phone.trim());
      }
      if (spec.nameKey && typeof name === "string" && name.trim()) {
        window.localStorage.setItem(spec.nameKey, name.trim());
      }
    }
  } catch {
    // Ignore storage errors gracefully
  }
}

function removeActiveKeys(role: PortalSessionRole): void {
  if (!canUseBrowserStorage()) return;
  const spec = PORTAL_ROLE_STORAGE_MAP[role];
  try {
    window.localStorage.removeItem(spec.tokenKey);
    if (spec.profileKey) {
      window.localStorage.removeItem(spec.profileKey);
    }
    if (spec.phoneKey) {
      window.localStorage.removeItem(spec.phoneKey);
    }
    if (spec.nameKey) {
      window.localStorage.removeItem(spec.nameKey);
    }
    if (spec.syncSessionStorage && typeof window.sessionStorage !== "undefined") {
      window.sessionStorage.removeItem(spec.tokenKey);
      if (spec.profileKey) {
        window.sessionStorage.removeItem(spec.profileKey);
      }
    }
  } catch {
    // Ignore storage errors gracefully
  }
}

export function getActivePortalToken(role: PortalSessionRole): string | null {
  if (!canUseBrowserStorage()) return null;
  const spec = PORTAL_ROLE_STORAGE_MAP[role];
  try {
    const fromLocal = window.localStorage.getItem(spec.tokenKey);
    if (fromLocal) return fromLocal;
    if (spec.syncSessionStorage && typeof window.sessionStorage !== "undefined") {
      return window.sessionStorage.getItem(spec.tokenKey);
    }
    return null;
  } catch {
    return null;
  }
}

export function savePortalSession<TProfile = Record<string, unknown>>(params: {
  role: PortalSessionRole;
  companyId?: string | null;
  token: string;
  profile?: TProfile | null;
  companySlug?: string | null;
  companyName?: string | null;
  persist?: boolean;
}): PortalSessionRecord<TProfile> {
  const {
    role,
    companyId,
    token,
    profile = null,
    companySlug = null,
    companyName = null,
    persist = true,
  } = params;

  const profileCompanyId =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)["companyId"]
      : undefined;

  const resolvedCompanyId =
    (typeof companyId === "string" && companyId.trim()) ||
    extractCompanyIdFromToken(token) ||
    (typeof profileCompanyId === "string" && profileCompanyId.trim()) ||
    "default";

  const record: PortalSessionRecord<TProfile> = {
    role,
    companyId: resolvedCompanyId,
    token,
    profile: profile ?? null,
    companySlug: companySlug ?? null,
    companyName: companyName ?? null,
    updatedAt: new Date().toISOString(),
  };

  applyActiveKeys(role, token, profile, persist);

  const vault = readVault();
  vault[getVaultEntryKey(role, resolvedCompanyId)] =
    record as PortalSessionRecord;
  writeVault(vault);

  return record;
}

export function activateCompanySession(
  role: PortalSessionRole,
  companyId: string,
): PortalSessionRecord | null {
  if (!companyId) return null;
  const vault = readVault();
  const entry = vault[getVaultEntryKey(role, companyId)];
  if (!entry || !entry.token) {
    return null;
  }
  applyActiveKeys(role, entry.token, entry.profile, true);
  return entry;
}

export function getSavedSessionsForRole(
  role: PortalSessionRole,
): PortalSessionRecord[] {
  const vault = readVault();
  return Object.values(vault)
    .filter((entry) => entry && entry.role === role && Boolean(entry.token))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function verifyTokenMatchesHostCompany(
  token?: string | null,
  hostCompanyId?: string | null,
): boolean {
  if (!token || !hostCompanyId) {
    return true;
  }
  const tokenCompanyId = extractCompanyIdFromToken(token);
  if (tokenCompanyId && tokenCompanyId !== hostCompanyId) {
    return false;
  }
  return true;
}

export function clearPortalSession(
  role: PortalSessionRole,
  companyId?: string,
): void {
  const vault = readVault();

  if (companyId) {
    delete vault[getVaultEntryKey(role, companyId)];
    writeVault(vault);

    const activeToken = getActivePortalToken(role);
    const activeCompanyId = extractCompanyIdFromToken(activeToken);
    if (!activeToken || !activeCompanyId || activeCompanyId === companyId) {
      removeActiveKeys(role);
    }
    return;
  }

  for (const key of Object.keys(vault)) {
    const entry = vault[key];
    if (entry && entry.role === role) {
      delete vault[key];
    }
  }
  writeVault(vault);
  removeActiveKeys(role);
}

export function normalizePortalCompanyOptions(
  raw: unknown,
): PortalCompanyOption[] {
  if (!Array.isArray(raw)) return [];
  const options: PortalCompanyOption[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const rawId = obj["companyId"] ?? obj["id"];
    const companyId = typeof rawId === "string" ? rawId.trim() : "";
    if (!companyId) continue;

    const rawName = obj["companyName"] ?? obj["name"] ?? obj["clinicName"];
    const companyName =
      typeof rawName === "string" && rawName.trim()
        ? rawName.trim()
        : companyId;

    const rawSlug = obj["companySlug"] ?? obj["slug"];
    const rawLogo = obj["companyLogo"] ?? obj["logo"];
    const rawLabel = obj["label"] ?? obj["clinicName"] ?? obj["roleLabel"];

    options.push({
      companyId,
      companyName,
      companySlug: typeof rawSlug === "string" ? rawSlug : null,
      companyLogo: typeof rawLogo === "string" ? rawLogo : null,
      label:
        typeof rawLabel === "string" && rawLabel !== companyName
          ? rawLabel
          : null,
    });
  }

  return options;
}

export function getCurrentSubdomainFromHost(hostnameInput?: string): string | null {
  const rawHost =
    hostnameInput ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  const hostname = String(rawHost || "").trim().toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  const parts = hostname.split(".");
  const isIpAddress =
    parts.length === 4 && parts.every((part) => /^\d+$/.test(part));
  if (isIpAddress) {
    return null;
  }

  const firstPart = parts[0]?.trim().toLowerCase() ?? "";
  const reservedSubdomains = new Set([
    "app",
    "admin",
    "api",
    "dashboard",
    "www",
    "dev",
    "staging",
    "mail",
  ]);

  if (hostname.endsWith(".localhost") && firstPart && !reservedSubdomains.has(firstPart)) {
    return firstPart;
  }

  if (parts.length >= 3 && firstPart && !reservedSubdomains.has(firstPart)) {
    return firstPart;
  }

  return null;
}

export function getPortalSubdomainHeaders(
  hostnameInput?: string,
): Record<string, string> {
  const subdomain = getCurrentSubdomainFromHost(hostnameInput);
  if (!subdomain) return {};
  return {
    "X-Company-Subdomain": subdomain,
    "X-Subdomain": subdomain,
    "X-Company-Slug": subdomain,
  };
}

/**
 * Checks if the active session for `role` belongs to a different tenant than
 * the current host subdomain. If it conflicts, clears the active legacy slot
 * (or switches to a matching saved session from the multi-company vault).
 */
export async function syncPortalSessionWithHost(
  role: PortalSessionRole,
  apiUrl: string,
): Promise<{ hostCompanyId: string | null; clearedConflict: boolean }> {
  const subdomain = getCurrentSubdomainFromHost();
  const activeToken = getActivePortalToken(role);
  if (!subdomain || !activeToken) {
    return { hostCompanyId: null, clearedConflict: false };
  }

  const saved = getSavedSessionsForRole(role);
  const activeCompanyId = extractCompanyIdFromToken(activeToken);
  const activeRecord = activeCompanyId
    ? saved.find((entry) => entry.companyId === activeCompanyId)
    : undefined;

  if (activeRecord?.companySlug && activeRecord.companySlug.toLowerCase() !== subdomain) {
    removeActiveKeys(role);
    const matchingBySlug = saved.find(
      (entry) => entry.companySlug?.toLowerCase() === subdomain,
    );
    if (matchingBySlug) {
      applyActiveKeys(role, matchingBySlug.token, matchingBySlug.profile, true);
    }
    return { hostCompanyId: matchingBySlug?.companyId ?? null, clearedConflict: true };
  }

  try {
    const cleanApiUrl = String(apiUrl || "/api/v1").replace(/\/+$/, "");
    const res = await fetch(`${cleanApiUrl}/public/storefront/settings`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...getPortalSubdomainHeaders(),
      },
    });
    if (!res.ok) {
      return { hostCompanyId: null, clearedConflict: false };
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const data =
      json && typeof json["data"] === "object" && json["data"] !== null
        ? (json["data"] as Record<string, unknown>)
        : null;
    const company =
      data && typeof data["company"] === "object" && data["company"] !== null
        ? (data["company"] as Record<string, unknown>)
        : null;
    const rawHostId = company?.["id"];
    const hostCompanyId = typeof rawHostId === "string" ? rawHostId.trim() : null;

    if (hostCompanyId && !verifyTokenMatchesHostCompany(activeToken, hostCompanyId)) {
      removeActiveKeys(role);
      const matchingByCompany = saved.find(
        (entry) => entry.companyId === hostCompanyId,
      );
      if (matchingByCompany) {
        applyActiveKeys(role, matchingByCompany.token, matchingByCompany.profile, true);
      }
      return { hostCompanyId, clearedConflict: true };
    }

    return { hostCompanyId, clearedConflict: false };
  } catch {
    return { hostCompanyId: null, clearedConflict: false };
  }
}

export const portalSessionManager = {
  decodeJwtPayload,
  extractCompanyIdFromToken,
  getActivePortalToken,
  savePortalSession,
  activateCompanySession,
  getSavedSessionsForRole,
  verifyTokenMatchesHostCompany,
  clearPortalSession,
  normalizePortalCompanyOptions,
  getCurrentSubdomainFromHost,
  getPortalSubdomainHeaders,
  syncPortalSessionWithHost,
};

export default portalSessionManager;

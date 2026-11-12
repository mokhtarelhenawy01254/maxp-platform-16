import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Search, ShieldCheck } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { getPortalEntryPath } from "../../config/portals";
import { resolveBrandingLogoUrl } from "../../hooks/useCompanyBranding";
import { tokenManager } from "../../utils/tokenManager";
import {
  activateCompanySession,
  extractCompanyIdFromToken,
  getActivePortalToken,
  getSavedSessionsForRole,
  PORTAL_ROLE_STORAGE_MAP,
  type PortalSessionRole,
} from "../../utils/portalSessionManager";

export const LAST_PORTAL_COMPANY_STORAGE_KEY = "maxp_portal_last_company_v1";

export interface PortalDirectoryCompany {
  companyId: string;
  name: string;
  slug: string | null;
  publicCode: string | null;
  customDomain: string | null;
  logo: string | null;
  accent: string;
}

const PORTAL_META: Record<string, { label: string; shortLabel: string }> = {
  parent: { label: "بوابة ولي الأمر", shortLabel: "ولي أمر" }, teacher: { label: "بوابة المدرس", shortLabel: "مدرس" },
  student: { label: "بوابة الطالب والأكاديمية", shortLabel: "طالب" }, academy: { label: "بوابة الأكاديمية", shortLabel: "أكاديمية" },
  doctor: { label: "بوابة الطبيب", shortLabel: "طبيب" }, patient: { label: "بوابة المريض", shortLabel: "مريض" },
  dental: { label: "بوابة معامل الأسنان", shortLabel: "معمل أسنان" }, courier: { label: "بوابة المندوب", shortLabel: "مندوب" },
  wholesale: { label: "بوابة الجملة", shortLabel: "جملة" }, customer: { label: "حساب العميل", shortLabel: "عميل" },
  account: { label: "حساب العميل", shortLabel: "عميل" }, client: { label: "بوابة العميل", shortLabel: "شحن وتجارة" },
};

const QUICK_PORTAL_KEYS = ["parent", "teacher", "student", "doctor", "patient", "dental", "courier", "customer"] as const;
const APEX_HOSTS = new Set(["maxp.online", "www.maxp.online", "mokhtarelhenawy.online", "www.mokhtarelhenawy.online"]);
const normalizePortalKey = (raw?: string | null): string => { const c = String(raw || "").trim().toLowerCase(); return c && c in PORTAL_META ? c : "parent"; };
const asObj = (val: unknown): Record<string, unknown> => val && typeof val === "object" && !Array.isArray(val) ? (val as Record<string, unknown>) : {};
const strOrNull = (val: unknown): string | null => (typeof val === "string" && val.trim() ? val.trim() : null);
const isPortalSessionRole = (key: string): key is PortalSessionRole => key in PORTAL_ROLE_STORAGE_MAP;

function parseCompanyItem(raw: unknown): PortalDirectoryCompany | null {
  const root = asObj(raw);
  const unwrapped = Object.keys(asObj(root["data"])).length > 0 ? asObj(root["data"]) : root;
  const company = asObj(unwrapped["company"]);
  const branding = asObj(unwrapped["branding"]);
  const src = Object.keys(company).length > 0 && !unwrapped["companyId"] && !unwrapped["id"] ? company : unwrapped;
  const companyId = strOrNull(src["companyId"] ?? src["id"] ?? company["id"]);
  const slug = strOrNull(src["slug"] ?? company["slug"]);
  const name = strOrNull(src["name"] ?? src["companyName"] ?? company["name"]);
  if (!companyId && !slug && !name) return null;
  return {
    companyId: companyId || slug || "", name: name || slug || "المؤسسة", slug,
    publicCode: strOrNull(src["publicCode"] ?? src["code"] ?? company["publicCode"]),
    customDomain: strOrNull(src["customDomain"] ?? company["customDomain"]),
    logo: strOrNull(src["logo"] ?? company["logo"]),
    accent: strOrNull(src["accent"] ?? src["primaryColor"] ?? branding["primaryColor"]) || "#4f46e5",
  };
}

function parseLookupList(rawResData: unknown): PortalDirectoryCompany[] {
  const root = asObj(rawResData);
  const data = root["data"] ?? rawResData;
  const dObj = asObj(data);
  const list = Array.isArray(data) ? data : (["items", "companies", "results"].map((k) => dObj[k]).find(Array.isArray) as unknown[] | undefined) ?? null;
  if (list) return list.map(parseCompanyItem).filter((c): c is PortalDirectoryCompany => c !== null);
  const single = parseCompanyItem(data);
  return single ? [single] : [];
}

function hasActiveSessionForCompany(portalKey: string, company: PortalDirectoryCompany): boolean {
  if (isPortalSessionRole(portalKey)) {
    const savedList = getSavedSessionsForRole(portalKey);
    const matched = savedList.find(
      (s) => (company.companyId && s.companyId === company.companyId) || (company.slug && s.companySlug?.toLowerCase() === company.slug.toLowerCase()),
    );
    if (matched?.token) return true;
    const activeToken = getActivePortalToken(portalKey);
    if (!activeToken) return false;
    const tokenCid = extractCompanyIdFromToken(activeToken);
    if (tokenCid) return !company.companyId || tokenCid === company.companyId;
    const claimedByOther = savedList.some((s) => s.token === activeToken && company.companyId && s.companyId !== company.companyId);
    return !claimedByOther && !company.companyId;
  }
  if (portalKey === "customer" || portalKey === "wholesale" || portalKey === "account") {
    const token = tokenManager.getAccessToken();
    if (!token) return false;
    const tokenCid = extractCompanyIdFromToken(token);
    return !company.companyId || !tokenCid || tokenCid === company.companyId;
  }
  return false;
}

async function persistLastSelectedCenter(payload: Record<string, string | null>): Promise<void> {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(payload);
  try { window.localStorage.setItem(LAST_PORTAL_COMPANY_STORAGE_KEY, serialized); } catch { /* ignore */ }
  try {
    const win = window as unknown as { Capacitor?: { Plugins?: { Preferences?: { set?: (o: { key: string; value: string }) => Promise<void> } } } };
    await win.Capacitor?.Plugins?.Preferences?.set?.({ key: LAST_PORTAL_COMPANY_STORAGE_KEY, value: serialized });
  } catch { /* ignore */ }
}

export const PortalInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code")?.trim() || "";
  const inviteIdentifier = routeSlug?.trim() || initialCode;

  const [selectedPortal, setSelectedPortal] = useState<string>(() => normalizePortalKey(searchParams.get("portal")));
  const [selectedCompany, setSelectedCompany] = useState<PortalDirectoryCompany | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(Boolean(inviteIdentifier));
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(initialCode);
  const [searchResults, setSearchResults] = useState<PortalDirectoryCompany[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [autoCancelled, setAutoCancelled] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);

  const savedCenters = useMemo<PortalDirectoryCompany[]>(() => {
    const seen = new Map<string, PortalDirectoryCompany>();
    const roles: PortalSessionRole[] = isPortalSessionRole(selectedPortal) ? [selectedPortal] : (Object.keys(PORTAL_ROLE_STORAGE_MAP) as PortalSessionRole[]);
    for (const role of roles) {
      for (const s of getSavedSessionsForRole(role)) {
        if (!s.companyId || seen.has(s.companyId)) continue;
        seen.set(s.companyId, { companyId: s.companyId, name: s.companyName || s.companySlug || s.companyId, slug: s.companySlug ?? null, publicCode: null, customDomain: null, logo: null, accent: "#4f46e5" });
      }
    }
    return Array.from(seen.values());
  }, [selectedPortal]);

  useEffect(() => setLogoError(false), [selectedCompany?.logo]);

  useEffect(() => {
    if (!inviteIdentifier) { setInviteLoading(false); return; }
    let active = true;
    setInviteLoading(true);
    setInviteError(null);
    const queryKey = routeSlug?.trim() ? "slug" : "code";
    const reqConfig = { _skipAuthHeader: true as const, _skipErrorToast: true as const };

    (async () => {
      try {
        try {
          const res = await apiClient.get(`/public/portal/branding?${queryKey}=${encodeURIComponent(inviteIdentifier)}`, reqConfig);
          if (!active) return;
          const parsed = parseCompanyItem(res.data);
          if (parsed) { setSelectedCompany(parsed); return; }
        } catch { /* fallback to lookup */ }

        const lookupRes = await apiClient.get(`/public/portal/lookup?q=${encodeURIComponent(inviteIdentifier)}`, reqConfig);
        if (!active) return;
        const matches = parseLookupList(lookupRes.data);
        if (matches[0]) setSelectedCompany(matches[0]);
        else setInviteError("لم يتم العثور على المؤسسة المطلوبة، يمكنك البحث بالاسم أو الكود.");
      } catch {
        if (active) setInviteError("تعذر تحميل بيانات المؤسسة حالياً، حاول البحث بالكود.");
      } finally {
        if (active) setInviteLoading(false);
      }
    })();
    return () => { active = false; };
  }, [inviteIdentifier, routeSlug]);

  const openCompanyPortal = useCallback(
    (company: PortalDirectoryCompany, portalKeyInput?: string) => {
      const portalKey = normalizePortalKey(portalKeyInput || selectedPortal);
      void persistLastSelectedCenter({ companyId: company.companyId, slug: company.slug, name: company.name, portal: portalKey });
      if (isPortalSessionRole(portalKey)) {
        const matched = getSavedSessionsForRole(portalKey).find(
          (s) => (company.companyId && s.companyId === company.companyId) || (company.slug && s.companySlug?.toLowerCase() === company.slug.toLowerCase()),
        );
        if (matched) activateCompanySession(portalKey, matched.companyId);
      }
      const entryPath = getPortalEntryPath(portalKey, hasActiveSessionForCompany(portalKey, company));
      const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
      if (APEX_HOSTS.has(hostname) && (company.customDomain || company.slug)) {
        const cleanDomain = company.customDomain?.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
        if (cleanDomain) { window.location.assign(`https://${cleanDomain}${entryPath}`); return; }
        if (company.slug) {
          const mainDomain = hostname.endsWith("mokhtarelhenawy.online") ? "mokhtarelhenawy.online" : "maxp.online";
          window.location.assign(`https://${company.slug}.${mainDomain}${entryPath}`);
          return;
        }
      }
      navigate(entryPath);
    },
    [navigate, selectedPortal],
  );

  useEffect(() => {
    if (!routeSlug?.trim() || !selectedCompany || inviteLoading || autoCancelled) return;
    const timer = window.setTimeout(() => openCompanyPortal(selectedCompany, selectedPortal), 1200);
    return () => window.clearTimeout(timer);
  }, [routeSlug, selectedCompany, inviteLoading, autoCancelled, openCompanyPortal, selectedPortal]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchError("أدخل كود المؤسسة أو اسم المركز للبحث"); return; }
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const res = await apiClient.get(`/public/portal/lookup?q=${encodeURIComponent(trimmed)}`, { _skipAuthHeader: true, _skipErrorToast: true });
      setSearchResults(parseLookupList(res.data));
    } catch {
      setSearchResults([]);
      setSearchError("تعذر تنفيذ البحث حالياً، تأكد من الاتصال وحاول مجدداً");
    } finally { setSearching(false); }
  };

  const portalLabel = PORTAL_META[selectedPortal]?.label || "بوابة ولي الأمر";
  const resolvedLogo = selectedCompany && !logoError ? resolveBrandingLogoUrl(selectedCompany.logo) : null;
  const accent = selectedCompany?.accent || "#4f46e5";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col justify-center px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{portalLabel}</span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">بوابات MaxP</span>
          </div>
          <h1 className="mt-2.5 text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {selectedCompany ? selectedCompany.name : "الاتصال ببوابة المؤسسة"}
          </h1>
        </div>

        <div className="px-4 py-3 border-b border-border/60 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {QUICK_PORTAL_KEYS.map((key) => (
              <button key={key} type="button" onClick={() => { setAutoCancelled(true); setSelectedPortal(key); }} className={`min-h-[38px] shrink-0 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-all active:scale-[0.97] ${selectedPortal === key ? "bg-primary text-primary-foreground shadow-2xs" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {PORTAL_META[key]?.shortLabel}
              </button>
            ))}
          </div>
        </div>
        {inviteLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">جاري تجهيز بوابة المؤسسة…</p>
          </div>
        ) : selectedCompany ? (
          <div className="px-4 py-5 sm:px-6 space-y-4">
            <div className="flex items-center gap-3.5">
              {resolvedLogo ? (
                <img src={resolvedLogo} alt={selectedCompany.name} onError={() => setLogoError(true)} className="size-14 shrink-0 rounded-xl border border-border/60 bg-background object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: accent }}>{selectedCompany.name.charAt(0) || "M"}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-foreground">{selectedCompany.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {selectedCompany.publicCode ? <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground">{selectedCompany.publicCode}</span> : null}
                  {hasActiveSessionForCompany(selectedPortal, selectedCompany) ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="size-3.5" aria-hidden="true" /><span>جلسة نشطة</span></span> : null}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => openCompanyPortal(selectedCompany, selectedPortal)} style={{ backgroundColor: accent }} className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span>فتح البوابة الآن</span>
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            {routeSlug && !autoCancelled ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>سيتم فتح البوابة تلقائياً خلال لحظات…</span>
                <button type="button" onClick={() => setAutoCancelled(true)} className="cursor-pointer font-semibold text-primary hover:underline">إلغاء</button>
              </div>
            ) : null}
          </div>
        ) : null}

        {inviteError ? <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 sm:mx-6">{inviteError}</div> : null}

        <div className="border-t border-border/60 px-4 py-4 sm:px-6 space-y-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <label htmlFor="portal-center-search" className="sr-only">كود أو اسم المؤسسة</label>
            <input id="portal-center-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث بكود المؤسسة أو اسم المركز…" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-border/80 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <button type="submit" disabled={searching} className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-60">
              {searching ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
              <span>بحث</span>
            </button>
          </form>
          {searchError ? <p className="text-xs font-medium text-destructive">{searchError}</p> : null}
          {searchResults.length > 0 ? (
            <ul className="divide-y divide-border/60 border-t border-border/60 pt-1">
              {searchResults.map((company) => (
                <li key={company.companyId} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{company.name}</p>
                    {company.publicCode ? <p className="text-[11px] font-mono text-muted-foreground tabular-nums">{company.publicCode}</p> : null}
                  </div>
                  <button type="button" onClick={() => { setAutoCancelled(true); setSelectedCompany(company); openCompanyPortal(company, selectedPortal); }} className="min-h-[40px] shrink-0 cursor-pointer rounded-xl bg-muted px-3 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors active:scale-[0.97]">فتح</button>
                </li>
              ))}
            </ul>
          ) : hasSearched && !searching && !searchError ? (
            <p className="text-xs text-muted-foreground">لا توجد نتائج مطابقة لهذا الكود أو الاسم.</p>
          ) : null}
          {savedCenters.length > 0 ? (
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Building2 className="size-3.5" aria-hidden="true" />
                <span>المؤسسات المحفوظة على هذا الجهاز</span>
              </p>
              <div className="divide-y divide-border/50">
                {savedCenters.map((center) => (
                  <button key={center.companyId} type="button" onClick={() => openCompanyPortal(center, selectedPortal)} className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 py-2 text-right hover:bg-muted/40 rounded-lg px-2 transition-colors">
                    <span className="truncate text-sm font-medium text-foreground">{center.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-primary">دخول</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PortalInvitePage;

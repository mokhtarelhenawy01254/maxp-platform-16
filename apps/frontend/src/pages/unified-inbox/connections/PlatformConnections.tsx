import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useAuth } from "../../../hooks/useAuthSimple";
import { envConfig } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type PlatformId = "facebook" | "instagram" | "whatsapp" | "telegram" | "telegramUserbot";

interface PlatformItem {
  id: string;
  pageId?: string;
  pageName?: string;
  name?: string;
  label?: string;
  phoneNumber?: string;
  status?: string;
  username?: string;
  botName?: string;
  botUsername?: string;
  type?: string;
  isActive?: boolean;
  inboxEnabled?: boolean;
  createdAt?: string;
  connectedAt?: string;
  provider?: string;
  tokenHealth?: string;
  instagramAccountName?: string;
}

interface PlatformStatus {
  connected: boolean;
  count?: number;
  pages?: PlatformItem[];
  sessions?: PlatformItem[];
  configs?: PlatformItem[];
}

interface ConnectionsStatus {
  facebook: PlatformStatus;
  instagram: PlatformStatus;
  whatsapp: PlatformStatus;
  telegram: PlatformStatus;
  telegramUserbot: PlatformStatus;
}

const cfg: Record<PlatformId, {
  labelKey: string; color: string; settingsPath: string;
  icon: (cn?: string) => React.ReactNode;
}> = {
  facebook: {
    labelKey: "unifiedInbox.platforms.facebook", color: "#1877F2", settingsPath: "/settings/facebook-oauth",
    icon: (cn) => <svg className={cn} viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>,
  },
  instagram: {
    labelKey: "unifiedInbox.platforms.instagram", color: "#E4405F", settingsPath: "/settings/instagram",
    icon: (cn) => <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  },
  whatsapp: {
    labelKey: "unifiedInbox.platforms.whatsapp", color: "#25D366", settingsPath: "/whatsapp/settings",
    icon: (cn) => <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  },
  telegram: {
    labelKey: "unifiedInbox.platforms.telegram", color: "#0088cc", settingsPath: "/settings/telegram",
    icon: (cn) => <svg className={cn} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35 1 .22 1.59.15.15 2.71 2.48 2.76 2.69.01.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.74 7.59-3.27 3.61-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.5.16.13.12.17.28.19.39.02.1.02.2.01.3z"/></svg>,
  },
  telegramUserbot: {
    labelKey: "unifiedInbox.platforms.telegramUserbot", color: "#26A5E4", settingsPath: "/settings/telegram",
    icon: (cn) => <svg className={cn} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
  },
};

const PlatformConnections: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { user } = useAuth();

  const [statuses, setStatuses] = useState<ConnectionsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // WhatsApp modal
  const [showWa, setShowWa] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waStep, setWaStep] = useState<"form" | "qr" | "done" | "error">("form");
  const [waId, setWaId] = useState<string | null>(null);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waPairing, setWaPairing] = useState<string | null>(null);
  const [waName, setWaName] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waPairingMode, setWaPairingMode] = useState(true);
  const [waErr, setWaErr] = useState<string | null>(null);
  const waQrRef = useRef<((d: { sessionId: string; qr: string }) => void) | null>(null);
  const waConnRef = useRef<((d: { sessionId: string; status: string }) => void) | null>(null);

  // Telegram modal
  const [showTg, setShowTg] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgToken, setTgToken] = useState("");
  const [tgLabel, setTgLabel] = useState("");
  const [tgErr, setTgErr] = useState<string | null>(null);
  const [tgDone, setTgDone] = useState(false);

  // Userbot inbox toggle
  const [ubLoading, setUbLoading] = useState<string | null>(null);

  // ── API ──

  const load = useCallback(async () => {
    try { setLoading(true); setError(null);
      const r = await apiClient.get("/api/v1/unified-inbox/settings");
      if (r.data?.success) setStatuses(r.data.data.platforms);
      else setError(t("unifiedInbox.connections.loadError"));
    } catch { setError(t("unifiedInbox.connections.loadError"));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const connectedCount = statuses ? Object.values(statuses).filter((s) => s.connected).length : 0;
  const totalPlatforms = 5;

  // ── Facebook OAuth ──
  const fbOAuth = useCallback(async () => {
    if (!user?.companyId) return;
    const popup = window.open("", "facebook-oauth", "width=600,height=800");
    try {
      const r = await fetch(`${envConfig.apiUrl}/facebook-oauth/authorize?companyId=${user.companyId}&userId=${user.id}&popup=true&returnOrigin=${encodeURIComponent(window.location.origin)}`,
        { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) });
      const d = await r.json();
      if (d?.authUrl && popup) popup.location.href = d.authUrl;
      else popup?.close();
    } catch { popup?.close(); }
  }, [user]);

  useEffect(() => {
    const h = (e: MessageEvent) => { if (e.data?.type === "facebook-oauth-callback") load(); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [load]);

  // ── Facebook disconnect ──
  const fbDisconnect = useCallback(async (pageId: string) => {
    if (!user?.companyId) return;
    setDeleting(pageId);
    try {
      await apiClient.delete(`/api/v1/facebook-oauth/disconnect?companyId=${user.companyId}`, { data: { pageIds: [pageId] } });
      load();
    } finally { setDeleting(null); }
  }, [user, load]);

  // ── WhatsApp modal ──
  const openWa = useCallback(() => {
    setShowWa(true); setWaStep("form"); setWaId(null); setWaQr(null); setWaPairing(null);
    setWaName(""); setWaPhone(""); setWaPairingMode(true); setWaErr(null);
  }, []);
  const closeWa = useCallback(() => {
    setShowWa(false);
    if (waQrRef.current) socketService.off("whatsapp:qr", waQrRef.current);
    if (waConnRef.current) socketService.off("whatsapp:connection", waConnRef.current);
  }, []);

  const waCreate = useCallback(async () => {
    if (!waName.trim()) return;
    setWaLoading(true); setWaErr(null);
    try {
      const body: Record<string, string | boolean> = { name: waName.trim(), provider: "BAILEYS" };
      if (waPairingMode && waPhone.trim()) { body.phoneNumber = waPhone.trim(); body.usePairingCode = true; }
      const r = await apiClient.post("/api/v1/whatsapp/sessions", body);
      if (r.data?.success) {
        const s = r.data.session;
        setWaId(s.id);
        const qh = (d: { sessionId: string; qr: string }) => { if (d.sessionId === s.id && d.qr) { setWaQr(d.qr); setWaStep("qr"); } };
        const ch = (d: { sessionId: string; status: string }) => { if (d.sessionId === s.id && (d.status === "CONNECTED" || d.status === "connected")) { setWaStep("done"); setTimeout(() => { closeWa(); load(); }, 1500); } };
        waQrRef.current = qh; waConnRef.current = ch;
        socketService.on("whatsapp:qr", qh); socketService.on("whatsapp:connection", ch);
        if (s.qrCode) { setWaQr(s.qrCode); setWaStep("qr"); }
        else if (s.pairingCode) { setWaPairing(s.pairingCode); setWaStep("qr"); }
        else setWaStep("qr");
      } else { setWaErr(r.data?.message || "فشل إنشاء الجلسة"); setWaStep("error"); }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setWaErr(e?.response?.data?.message || e?.message || "فشل إنشاء الجلسة"); setWaStep("error");
    } finally { setWaLoading(false); }
  }, [waName, waPhone, waPairingMode, closeWa, load]);

  // ── WhatsApp delete (حذف الجلسة نهائياً) ──
  const waDisconnect = useCallback(async (id: string) => {
    setDeleting(id);
    try { await apiClient.delete(`/api/v1/whatsapp/sessions/${id}`); load(); }
    finally { setDeleting(null); }
  }, [load]);

  // ── Telegram modal ──
  const openTg = useCallback(() => {
    setShowTg(true); setTgToken(""); setTgLabel(""); setTgErr(null); setTgDone(false);
  }, []);
  const closeTg = useCallback(() => { setShowTg(false); }, []);

  const tgConnect = useCallback(async () => {
    if (!tgToken.trim()) return;
    setTgLoading(true); setTgErr(null); setTgDone(false);
    try {
      const r = await apiClient.post("/api/v1/telegram/settings/connect", {
        botToken: tgToken.trim(), label: tgLabel.trim() || "My Bot",
      });
      if (r.data?.success) { setTgDone(true); setTimeout(() => { closeTg(); load(); }, 1200); }
      else setTgErr(r.data?.message || "فشل الربط");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setTgErr(e?.response?.data?.message || e?.message || "فشل الربط");
    } finally { setTgLoading(false); }
  }, [tgToken, tgLabel, closeTg, load]);

  // ── Telegram disconnect ──
  const tgDisconnect = useCallback(async (id: string) => {
    if (!user?.companyId) return;
    setDeleting(id);
    try {
      await apiClient.post("/api/v1/telegram/settings/disconnect", { id, companyId: user.companyId });
      load();
    } finally { setDeleting(null); }
  }, [user, load]);

  // ── Userbot inbox toggle ──
  const toggleUserbotInbox = useCallback(async (id: string, enabled: boolean) => {
    setUbLoading(id);
    try {
      await apiClient.put(`/telegram/userbots/${id}/inbox`, { enabled });
      load();
    } catch { /* ignore */ }
    finally { setUbLoading(null); }
  }, [load]);

  const fmtCode = (c: string) => c.length === 9 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;

  // ── Render card ──
  const card = (pid: PlatformId) => {
    const c = cfg[pid];
    const st = statuses?.[pid] || { connected: false };
    const isUb = pid === "telegramUserbot";
    const items: PlatformItem[] = st.pages || st.sessions || st.configs || [];
    const connected = st.connected;

    return (
      <div key={pid} className={`rounded-xl overflow-hidden transition-all duration-200 ${connected ? "shadow-sm" : "shadow-none"} hover:shadow-lg`}
        style={{ background: "var(--business-surface-card)", border: `1px solid ${connected ? c.color+"20" : "var(--business-card-border)"}` }}>
        <div style={{ height: 4, background: c.color }} />
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}12` }}>
              {c.icon("w-6 h-6")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: "var(--color-foreground)" }}>{t(c.labelKey)}</h3>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${connected ? "text-green-700 bg-green-100" : "text-gray-400 bg-gray-100"}`}>
                  {connected ? <><CheckCircleIcon className="w-3 h-3" />{t("unifiedInbox.connections.connected")}</>
                    : <><XCircleIcon className="w-3 h-3" />{t("unifiedInbox.connections.disconnected")}</>}
                </span>
              </div>
              {st.count !== undefined && (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                  {st.count} {pid === "facebook" ? "صفحة" : pid === "instagram" ? "حساب" : pid === "whatsapp" ? "جلسة" : pid === "telegramUserbot" ? "حساب" : "بوت"}
                </p>
              )}
            </div>
          </div>

          {/* Connected items list */}
          {items.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--business-surface-panel)" }}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${(item.status === "CONNECTED" || item.isActive || item.status === "connected") ? "bg-green-500" : item.status === "QR_PENDING" ? "bg-amber-400" : "bg-gray-300"}`} />
                  <span className="flex-1 truncate font-medium" style={{ color: "var(--color-foreground)" }}>
                    {item.pageName || item.name || item.botName || item.label || item.botUsername || item.id?.slice(0, 8)}
                  </span>
                  {isUb && item.isActive && (
                    <button
                      type="button"
                      onClick={() => toggleUserbotInbox(item.id, !item.inboxEnabled)}
                      disabled={ubLoading === item.id}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        item.inboxEnabled
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title={item.inboxEnabled ? "الانبوكس الموحد مفعل" : "تفعيل الانبوكس الموحد"}
                    >
                      {ubLoading === item.id ? "..." : item.inboxEnabled ? "Inbox ON" : "Inbox OFF"}
                    </button>
                  )}
                  <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>
                    {item.phoneNumber || ""}
                  </span>
                  {(pid === "whatsapp" || pid === "telegram" || pid === "facebook") && (
                    <button type="button" onClick={() => {
                      if (pid === "facebook") fbDisconnect(item.pageId || item.id);
                      else if (pid === "whatsapp") waDisconnect(item.id);
                      else if (pid === "telegram") tgDisconnect(item.id);
                    }} disabled={deleting === item.id}
                      className="p-1 rounded-md hover:bg-red-50 transition-colors flex-shrink-0" title="حذف">
                      {deleting === item.id
                        ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                        : <TrashIcon className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {pid === "facebook" && (
              <button type="button" onClick={fbOAuth}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: c.color, color: "#fff" }}>
                {connected ? "إضافة صفحة" : t("unifiedInbox.connections.connect")}
              </button>
            )}
            {pid === "instagram" && (
              <button type="button" onClick={fbOAuth}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: c.color, color: "#fff" }}>
                {connected ? "إضافة حساب" : t("unifiedInbox.connections.connect")}
              </button>
            )}
            {pid === "whatsapp" && (
              <button type="button" onClick={openWa}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: c.color, color: "#fff" }}>
                {connected ? "إضافة جلسة" : t("unifiedInbox.connections.connect")}
              </button>
            )}
            {pid === "telegram" && (
              <button type="button" onClick={openTg}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: c.color, color: "#fff" }}>
                {connected ? "إضافة بوت" : t("unifiedInbox.connections.connect")}
              </button>
            )}
            {isUb && (
              <a href={c.settingsPath}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all text-center active:scale-[0.98]"
                style={{ background: c.color, color: "#fff" }}>
                {connected ? "إدارة الحسابات" : "ربط حساب"}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b shrink-0" style={{ borderColor: "var(--business-muted-line)", background: "var(--business-surface-panel)" }}>
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-[24px] font-bold" style={{ color: "var(--color-foreground)" }}>
            {t("unifiedInbox.connections.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            {t("unifiedInbox.connections.subtitle")}
          </p>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--business-muted-line)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(connectedCount/totalPlatforms)*100}%`, background: "linear-gradient(90deg, var(--color-primary), #25D366)" }} />
              </div>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>
                {connectedCount}/{totalPlatforms} {t("unifiedInbox.connections.connected")}
              </span>
            </div>
            <button type="button" onClick={load} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: "var(--color-muted-foreground)" }} disabled={loading}>
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-6">
          {loading && !statuses ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                style={{ borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)", borderTopColor: "transparent" }} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <XCircleIcon className="w-10 h-10" style={{ color: "var(--business-danger)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>{error}</p>
              <button type="button" onClick={load} className="inbox-filter-chip">{t("unifiedInbox.connections.retry")}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["facebook", "instagram", "whatsapp", "telegram", "telegramUserbot"] as PlatformId[]).map(card)}
            </div>
          )}
        </div>
      </div>

      {/* ═══ WhatsApp Modal ═══ */}
      {showWa && (
        <Overlay onClose={closeWa}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "#25D366" }} />
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="font-bold text-base" style={{ color: "var(--color-foreground)" }}>ربط واتساب</h3>
              <button type="button" onClick={closeWa} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" style={{ color: "var(--color-muted-foreground)" }} />
              </button>
            </div>
            <div className="px-5 pb-5">
              {waStep === "form" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">اسم الجلسة</label>
                    <input type="text" value={waName} onChange={(e) => setWaName(e.target.value)}
                      placeholder="مثلاً: واتساب رئيسي"
                      className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                      style={{ borderColor: "var(--business-card-border)" }} />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={waPairingMode} onChange={(e) => setWaPairingMode(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500" />
                    <span className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>استخدام كود الربط (بدلاً من QR)</span>
                  </label>
                  {waPairingMode && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">رقم الهاتف</label>
                      <input type="tel" value={waPhone} onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="مثلاً: 201234567890+"
                        className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                        style={{ borderColor: "var(--business-card-border)" }} />
                    </div>
                  )}
                  <button type="button" onClick={waCreate} disabled={waLoading || !waName.trim()}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
                    style={{ background: "#25D366" }}>
                    {waLoading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري...</span> : "إنشاء الجلسة"}
                  </button>
                </div>
              )}
              {waStep === "qr" && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="text-sm text-center leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                    {waPairing && waPairingMode
                      ? "افتح واتساب > الأجهزة المرتبطة > الربط برقم هاتف، ثم أدخل هذا الكود:"
                      : "افتح واتساب > الأجهزة المرتبطة > ربط جهاز، ثم امسح الرمز:"}
                  </p>
                  {waQr && (
                    <div className="p-4 bg-white rounded-2xl shadow-lg border" style={{ borderColor: "var(--business-card-border)" }}>
                      <QRCodeSVG value={waQr} size={260} marginSize={4} level="M" />
                    </div>
                  )}
                  {waPairing && (
                    <div className="text-center">
                      <p className="text-3xl font-bold tracking-[0.3em] select-all" style={{ color: "var(--color-foreground)", fontFamily: "monospace" }}>
                        {fmtCode(waPairing)}
                      </p>
                      <button type="button" onClick={() => navigator.clipboard?.writeText(waPairing)}
                        className="mt-3 text-xs font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ borderColor: "var(--business-card-border)", color: "var(--color-muted-foreground)" }}>
                        نسخ الكود
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 py-2 px-4 rounded-full bg-gray-50">
                    <div className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    <span className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>في انتظار المسح...</span>
                  </div>
                </div>
              )}
              {waStep === "done" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="font-bold text-base" style={{ color: "var(--color-foreground)" }}>تم ربط واتساب بنجاح!</p>
                </div>
              )}
              {waStep === "error" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <XCircleIcon className="w-12 h-12" style={{ color: "var(--business-danger)" }} />
                  <p className="text-sm text-center" style={{ color: "var(--business-danger)" }}>{waErr}</p>
                  <button type="button" onClick={() => setWaStep("form")}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                    style={{ borderColor: "var(--business-card-border)" }}>حاول مرة أخرى</button>
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* ═══ Telegram Modal ═══ */}
      {showTg && (
        <Overlay onClose={closeTg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "#0088cc" }} />
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="font-bold text-base" style={{ color: "var(--color-foreground)" }}>ربط بوت تيليجرام</h3>
              <button type="button" onClick={closeTg} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <XMarkIcon className="w-5 h-5" style={{ color: "var(--color-muted-foreground)" }} />
              </button>
            </div>
            <div className="px-5 pb-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">توكن البوت</label>
                  <input type="password" value={tgToken} onChange={(e) => setTgToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full px-3.5 py-2.5 border rounded-lg text-sm font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    style={{ borderColor: "var(--business-card-border)" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">اسم البوت</label>
                  <input type="text" value={tgLabel} onChange={(e) => setTgLabel(e.target.value)}
                    placeholder="مثلاً: بوت المبيعات"
                    className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    style={{ borderColor: "var(--business-card-border)" }} />
                </div>
                <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "#F0F9FF", color: "#006699" }}>
                  💡 احصل على توكن البوت من @BotFather على تيليجرام والصقه هنا.
                </div>
                <button type="button" onClick={tgConnect} disabled={tgLoading || !tgToken.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
                  style={{ background: "#0088cc" }}>
                  {tgLoading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري...</span> : "ربط البوت"}
                </button>
                {tgErr && (
                  <div className="p-3.5 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: "rgba(239,68,68,0.08)", color: "var(--business-danger)" }}>
                    <XCircleIcon className="w-4 h-4 flex-shrink-0" />{tgErr}
                  </div>
                )}
                {tgDone && (
                  <div className="p-3.5 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", color: "rgb(34,197,94)" }}>
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />تم ربط البوت بنجاح!
                  </div>
                )}
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
};

const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    onClick={onClose}>{children}</div>
);

export default PlatformConnections;

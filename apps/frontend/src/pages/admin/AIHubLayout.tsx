import React, { useLayoutEffect, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Building2, Send, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

const AIAgentSandboxPage = React.lazy(() => import("./ai-agent-sandbox/AIAgentSandboxPage"));
import ChannelRoutingPage from "./ChannelRoutingPage";
import AgentSkillsPage from "./AgentSkillsPage";
import AgentToolsPage from "./AgentToolsPage";
import AIIgnoreListPage from "./AIIgnoreListPage";
const AgenticRAGLab = React.lazy(() => import("./AgenticRAGLab"));
const WebChatWidgetPage = React.lazy(() => import("./WebChatWidgetPage"));
const AgentTrainingPage = React.lazy(() => import("./AgentTrainingPage"));
const SuperAdminAiIncidentsPage = React.lazy(() => import("../super-admin/ai-incidents/SuperAdminAiIncidentsPage"));
const CapabilityCoveragePage = React.lazy(() => import("./CapabilityCoveragePage"));

const TABS = [
  { key: "sandbox", labelKey: "aiHub.tabs.sandbox" },
  { key: "coverage", labelKey: "aiHub.tabs.coverage" },
  { key: "train", labelKey: "aiHub.tabs.train" },
  { key: "widget", labelKey: "aiHub.tabs.widget" },
  { key: "skills", labelKey: "aiHub.tabs.skills" },
  { key: "tools", labelKey: "aiHub.tabs.tools" },
  { key: "incidents", labelKey: "aiHub.tabs.incidents" },
  { key: "routing", labelKey: "aiHub.tabs.routing" },
  { key: "ignoreList", labelKey: "aiHub.tabs.ignoreList" },
  { key: "test", labelKey: "aiHub.tabs.test", superOnly: true },
  { key: "rag", labelKey: "aiHub.tabs.rag", superOnly: true },
] as const;

interface Company { id: string; name: string }

function AgentTestTab({ companyId }: { companyId: string }) {
  const { t: t2 } = useTranslation();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const res = await fetch(buildApiUrl(`ai-sandbox/agents?companyId=${encodeURIComponent(companyId)}`), {
          headers: tokenManager.createAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) setAgents(data.agents || []);
      } catch {}
    })();
  }, [companyId]);

  const handleSend = async () => {
    if (!selectedAgent || !message.trim()) return;
    setLoading(true); setResponse("");
    try {
      const res = await fetch(buildApiUrl("ai-sandbox/chat"), {
        method: "POST",
        headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent, message: message.trim(),
          sessionId: `super-admin-test-${companyId}-${Date.now()}`,
          companyId,
        }),
      });
      const data = await res.json();
      setResponse(data.response || data.message || JSON.stringify(data, null, 2));
    } catch (err: any) { setResponse("Error: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">{t2("aiHub.test.agent")}</label>
        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
          className="h-9 rounded-lg border border-border/80 bg-background px-3 text-xs min-w-[220px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary">
          <option value="">{t2("aiHub.test.selectAgent")}</option>
          {agents.map((a: any) => (
            <option key={a.id || a.agentId} value={a.id || a.agentId}>
              {a.name || a.label || a.agentId}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">{t2("aiHub.test.message")}</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full h-24 rounded-lg border border-border/80 bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          placeholder={t2("aiHub.test.messagePlaceholder")} />
      </div>
      <button onClick={handleSend} disabled={loading || !selectedAgent || !message.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {t2("aiHub.test.send")}
      </button>
      {response && (
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <pre className="whitespace-pre-wrap text-xs font-mono text-foreground">{response}</pre>
        </div>
      )}
    </div>
  );
}

export default function AIHubLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "sandbox";
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (!isSuper) return;
    (async () => {
      try {
        const { data }: { data: { success: boolean; companies?: Company[] } } =
          await apiClient.get("/super-admin/companies/quick-list");
        if (data.success) setCompanies(data.companies || []);
      } catch {}
    })();
  }, [isSuper]);

  const availableTabs = TABS.filter((t) => !("superOnly" in t && t.superOnly) || isSuper);
  const currentTab = availableTabs.find((t) => t.key === activeTab) ? activeTab : availableTabs[0]?.key || "sandbox";

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(".app-shell-content");
    if (el) { el.style.overflow = "hidden"; el.style.padding = "0"; el.style.display = "flex"; el.style.flexDirection = "column"; }
    const w = document.querySelector<HTMLElement>(".motion-safe\\:animate-fade-in");
    if (w) { w.style.display = "flex"; w.style.flex = "1"; w.style.minHeight = "0"; }
    const saMain = document.querySelector<HTMLElement>("main.flex-1");
    if (saMain && !el) { saMain.style.overflow = "hidden"; }
    const saWrap = saMain?.querySelector<HTMLElement>("div.w-full");
    if (saWrap && !el) { saWrap.style.padding = "0"; saWrap.style.display = "flex"; saWrap.style.flex = "1"; saWrap.style.minHeight = "0"; }
    return () => {
      if (el) { el.style.overflow = ""; el.style.padding = ""; el.style.display = ""; el.style.flexDirection = ""; }
      if (w) { w.style.display = ""; w.style.flex = ""; w.style.minHeight = ""; }
      if (saMain && !el) { saMain.style.overflow = ""; }
      if (saWrap && !el) { saWrap.style.padding = ""; saWrap.style.display = ""; saWrap.style.flex = ""; saWrap.style.minHeight = ""; }
    };
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden pb-16 lg:pb-0 bg-background text-foreground font-sans">
      {/* Top Cockpit Chassis Header */}
      <div className="border-b border-border/70 bg-card sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                منظومة وكلاء الذكاء الاصطناعي (AI Hub)
              </h1>
              {isSuper && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Super Admin
                </span>
              )}
            </div>
          </div>

          {/* Clean Linear Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0 -mx-1 px-1">
            {availableTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSearchParams({ tab: tab.key })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 active:scale-97 cursor-pointer ${
                  currentTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {isSuper && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2.5 pt-2.5 border-t border-border/60">
            <div className="flex items-center gap-1.5 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-foreground">{t("aiHub.company")}:</span>
            </div>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs min-w-[180px] sm:min-w-[220px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("aiHub.selectCompany")}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!selectedCompanyId && currentTab === "test" && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">{t("aiHub.companyRequired")}</span>
            )}
          </div>
        )}
      </div>

      {/* Surface Canvas */}
      <div className="flex-1 bg-background overflow-hidden flex flex-col min-h-0">
        <React.Suspense fallback={
          <div className="flex h-[400px] items-center justify-center text-muted-foreground text-xs font-mono">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            جاري تحميل لوحة التحكم...
          </div>
        }>
          {currentTab === "sandbox" && <AIAgentSandboxPage />}
          {currentTab === "coverage" && <div className="h-full overflow-y-auto"><CapabilityCoveragePage /></div>}
          {currentTab === "train" && <div className="h-full overflow-y-auto"><AgentTrainingPage /></div>}
          {currentTab === "widget" && <div className="h-full overflow-y-auto"><WebChatWidgetPage /></div>}
          {currentTab === "skills" && <div className="h-full overflow-y-auto"><AgentSkillsPage companyId={isSuper ? selectedCompanyId || undefined : undefined} /></div>}
          {currentTab === "tools" && <div className="h-full overflow-y-auto"><AgentToolsPage companyId={isSuper ? selectedCompanyId || undefined : undefined} /></div>}
          {currentTab === "incidents" && <SuperAdminAiIncidentsPage />}
          {currentTab === "routing" && <div className="h-full overflow-y-auto"><ChannelRoutingPage /></div>}
          {currentTab === "ignoreList" && (
            <div className="h-full overflow-y-auto">
              <AIIgnoreListPage companyId={isSuper ? selectedCompanyId || undefined : undefined} />
            </div>
          )}
          {currentTab === "test" && selectedCompanyId
            ? <div className="h-full overflow-y-auto"><AgentTestTab key={selectedCompanyId} companyId={selectedCompanyId} /></div>
            : currentTab === "test" && <div className="flex h-64 items-center justify-center text-xs text-muted-foreground font-mono">{t("aiHub.selectCompanyFirst")}</div>
          }
          {currentTab === "rag" && selectedCompanyId
            ? <div className="h-full overflow-y-auto"><AgenticRAGLab key={selectedCompanyId} companyId={selectedCompanyId} /></div>
            : currentTab === "rag" && <div className="flex h-64 items-center justify-center text-xs text-muted-foreground font-mono">{t("aiHub.selectCompanyFirst")}</div>
          }
        </React.Suspense>
      </div>
    </div>
  );
}

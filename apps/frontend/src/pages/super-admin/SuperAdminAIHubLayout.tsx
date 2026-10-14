import React, { useState, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Building2 } from "lucide-react";
import { apiClient } from "../../services/apiClient";

const AgentSkillsPage = React.lazy(() => import("../admin/AgentSkillsPage"));
const AgentToolsPage = React.lazy(() => import("../admin/AgentToolsPage"));
const AgenticRAGLab = React.lazy(() => import("../admin/AgenticRAGLab"));
const SuperAdminAiIncidentsPage = React.lazy(() => import("./ai-incidents/SuperAdminAiIncidentsPage"));

interface Company {
  id: string;
  name: string;
}

const TABS = [
  { key: "skills", labelKey: "aiHub.tabs.skills", labelDefault: "المهارات", needsCompany: false },
  { key: "tools", labelKey: "aiHub.tabs.tools", labelDefault: "الأدوات", needsCompany: false },
  { key: "incidents", labelKey: "aiHub.tabs.incidents", labelDefault: "رصد أعطال الأدوات", needsCompany: false },
  { key: "rag", labelKey: "aiHub.tabs.rag", labelDefault: "مختبر RAG", needsCompany: true },
] as const;

export default function SuperAdminAIHubLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const activeTab = (searchParams.get("tab") || "skills") as "skills" | "tools" | "incidents" | "rag";
  const currentTabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState("");

  useEffect(() => {
    if (!currentTabMeta.needsCompany || companies.length > 0) return;
    (async () => {
      setLoadingCompanies(true);
      setCompaniesError("");
      try {
        const { data } = await apiClient.get("/super-admin/companies/quick-list");
        if (data.success) setCompanies(data.companies);
        else setCompaniesError(data.message || t("aiHub.loadCompaniesFailed"));
      } catch {
        setCompaniesError(t("aiHub.loadCompaniesError"));
      }
      finally { setLoadingCompanies(false); }
    })();
  }, [currentTabMeta.needsCompany, companies.length, t]);

  useLayoutEffect(() => {
    const appShellContent = document.querySelector<HTMLElement>(".app-shell-content");
    if (appShellContent) {
      appShellContent.style.overflow = "hidden";
      appShellContent.style.padding = "0";
      appShellContent.style.display = "flex";
      appShellContent.style.flexDirection = "column";
    }
    return () => {
      if (appShellContent) {
        appShellContent.style.overflow = "";
        appShellContent.style.padding = "";
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden" dir="rtl">
      {/* Sticky top nav - Linear Single Chassis */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-xs">
              <Bot className="size-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                  مركز الذكاء الاصطناعي — الإدارة المركزية
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  AI Hub Super
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                إدارة المهارات، الأدوات المركزية، مراقبة الأعطال اللحظية، ومختبر الذاكرة والـ RAG
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/70 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSearchParams({ tab: tab.key })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(tab.labelKey, tab.labelDefault)}
              </button>
            ))}
          </div>
        </div>

        {/* Company selector — shown only for tabs needing it */}
        {currentTabMeta.needsCompany && (
          <div className="flex items-center gap-2.5 mt-2.5 pt-2.5 border-t border-border/50">
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground">{t("aiHub.company")}:</span>
            {loadingCompanies ? (
              <span className="text-xs font-mono text-muted-foreground">{t("common.loading")}</span>
            ) : companiesError ? (
              <span className="text-xs text-destructive">{companiesError}</span>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="h-7.5 rounded-lg border border-border/70 bg-background/50 px-2.5 text-xs min-w-[200px] text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">{t("aiHub.selectCompany")}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 bg-background/50 overflow-y-auto p-3 sm:p-4">
        <React.Suspense
          fallback={
            <div className="flex h-[350px] items-center justify-center">
              <div className="animate-spin rounded-full size-7 border-b-2 border-primary" />
            </div>
          }
        >
          {activeTab === "skills" && (
            <AgentSkillsPage key={selectedCompanyId || "no-company"} companyId={selectedCompanyId || undefined} />
          )}
          {activeTab === "tools" && (
            <AgentToolsPage key={selectedCompanyId || "no-company"} companyId={selectedCompanyId || undefined} />
          )}
          {activeTab === "incidents" && (
            <SuperAdminAiIncidentsPage />
          )}
          {activeTab === "rag" && (
            selectedCompanyId
              ? <AgenticRAGLab key={selectedCompanyId} companyId={selectedCompanyId} />
              : <div className="flex h-64 items-center justify-center text-xs font-mono text-muted-foreground">{t("aiHub.selectCompanyForRag")}</div>
          )}
        </React.Suspense>
      </div>
    </div>
  );
}

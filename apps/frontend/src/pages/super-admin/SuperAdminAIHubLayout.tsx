import React, { useState, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Building2, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { Alert, AlertDescription } from "../../components/ui/alert";

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
  }, [currentTabMeta.needsCompany, companies.length]);


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
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Sticky top nav */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              AI Hub — Super Admin
            </h1>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSearchParams({ tab: tab.key })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t(tab.labelKey, tab.labelDefault)}
              </button>
            ))}
          </div>
        </div>

        {/* Company selector — shown only for tabs needing it */}
        {currentTabMeta.needsCompany && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">{t("aiHub.company")}:</span>
            {loadingCompanies ? (
              <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
            ) : companiesError ? (
              <span className="text-sm text-destructive">{companiesError}</span>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-w-[220px] text-foreground"
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
      <div className="flex-1 bg-muted/20 overflow-y-auto">
        <React.Suspense
          fallback={
            <div className="flex h-[400px] items-center justify-center">
              <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
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
              : <div className="flex h-64 items-center justify-center text-muted-foreground">{t("aiHub.selectCompanyForRag")}</div>
          )}
        </React.Suspense>
      </div>
    </div>
  );
}

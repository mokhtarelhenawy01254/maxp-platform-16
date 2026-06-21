import React, { useState, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Building2 } from "lucide-react";
import { apiClient } from "../../services/apiClient";

const AgentSkillsPage = React.lazy(() => import("../admin/AgentSkillsPage"));
const AgentToolsPage = React.lazy(() => import("../admin/AgentToolsPage"));
const AgenticRAGLab = React.lazy(() => import("../admin/AgenticRAGLab"));

interface Company {
  id: string;
  name: string;
}

const TABS = [
  { key: "skills", label: "مهارات الوكيل", needsCompany: true },
  { key: "tools", label: "أدوات الوكيل", needsCompany: false },
  { key: "rag", label: "قاعدة المعرفة (RAG)", needsCompany: true },
] as const;

export default function SuperAdminAIHubLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") || "skills") as "skills" | "tools" | "rag";
  const currentTabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    if (!currentTabMeta.needsCompany || companies.length > 0) return;
    (async () => {
      setLoadingCompanies(true);
      try {
        const { data } = await apiClient.get("/super-admin/companies/quick-list");
        if (data.success) setCompanies(data.companies);
      } catch {}
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
            <Bot className="size-5 text-indigo-600 animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
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
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Company selector — shown only for RAG tab */}
        {currentTabMeta.needsCompany && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">الشركة:</span>
            {loadingCompanies ? (
              <span className="text-sm text-muted-foreground">جاري التحميل...</span>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-w-[220px]"
              >
                <option value="">اختر شركة...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 bg-slate-50/20 overflow-y-auto">
        <React.Suspense
          fallback={
            <div className="flex h-[400px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          }
        >
          {activeTab === "skills" && (
            selectedCompanyId
              ? <AgentSkillsPage key={selectedCompanyId} companyId={selectedCompanyId} />
              : <div className="flex h-64 items-center justify-center text-muted-foreground">اختر شركة لعرض مهارات الوكيل</div>
          )}
          {activeTab === "tools" && (
            <AgentToolsPage key={selectedCompanyId || "no-company"} companyId={selectedCompanyId || undefined} />
          )}
          {activeTab === "rag" && (
            selectedCompanyId
              ? <AgenticRAGLab key={selectedCompanyId} companyId={selectedCompanyId} />
              : <div className="flex h-64 items-center justify-center text-muted-foreground">اختر شركة لعرض قاعدة المعرفة</div>
          )}
        </React.Suspense>
      </div>
    </div>
  );
}

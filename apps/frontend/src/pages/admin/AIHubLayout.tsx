import React from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, PlayCircle, BookOpen, Wrench, Shield, Clock } from "lucide-react";

// Lazy-loaded sub-components for AI pages
const CompanyAIAgents = React.lazy(() => import("./CompanyAIAgents"));
const AIAgentSandboxPage = React.lazy(() => import("./ai-agent-sandbox/AIAgentSandboxPage"));
const AgenticRAGLab = React.lazy(() => import("./AgenticRAGLab"));
const AgentToolsPage = React.lazy(() => import("./AgentToolsPage"));
const AgentSkillsPage = React.lazy(() => import("./AgentSkillsPage"));
const CompanyAIScheduler = React.lazy(() => import("./CompanyAIScheduler"));

export default function AIHubLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "agents";
  const { t } = useTranslation();

  const setActiveTab = (tab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams);
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Sticky Top Sub-navigation for AI Hub */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-indigo-600 animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {t("aiHub.subtitle")} ({t("aiHub.title")})
            </h1>
          </div>
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
             <TabsList className="flex overflow-x-auto no-scrollbar md:flex md:w-auto h-auto p-0.5 bg-muted/60 rounded-lg border w-full md:w-auto">
               <TabsTrigger value="agents" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <Bot className="size-3.5" />
                 <span>{t("aiHub.tabs.agents")}</span>
               </TabsTrigger>
               <TabsTrigger value="sandbox" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <PlayCircle className="size-3.5" />
                 <span>{t("aiHub.tabs.sandbox")}</span>
               </TabsTrigger>
               <TabsTrigger value="rag" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <BookOpen className="size-3.5" />
                 <span>{t("aiHub.tabs.rag")}</span>
               </TabsTrigger>
               <TabsTrigger value="tools" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <Wrench className="size-3.5" />
                 <span>{t("aiHub.tabs.tools")}</span>
               </TabsTrigger>
               <TabsTrigger value="skills" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <Shield className="size-3.5" />
                 <span>{t("aiHub.tabs.skills")}</span>
               </TabsTrigger>
               <TabsTrigger value="scheduler" className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200 flex-shrink-0">
                 <Clock className="size-3.5" />
                 <span>{t("aiHub.tabs.scheduler")}</span>
               </TabsTrigger>
             </TabsList>
           </Tabs>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 bg-slate-50/20">
        <React.Suspense fallback={
          <div className="flex h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        }>
           {activeTab === "agents" && <CompanyAIAgents />}
           {activeTab === "sandbox" && <AIAgentSandboxPage />}
           {activeTab === "rag" && <AgenticRAGLab />}
           {activeTab === "tools" && <AgentToolsPage />}
           {activeTab === "skills" && <AgentSkillsPage />}
           {activeTab === "scheduler" && <CompanyAIScheduler />}
        </React.Suspense>
      </div>
    </div>
  );
}

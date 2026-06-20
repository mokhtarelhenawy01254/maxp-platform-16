import React, { useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";

// Lazy-loaded sub-components for AI pages
const AIAgentSandboxPage = React.lazy(() => import("./ai-agent-sandbox/AIAgentSandboxPage"));
import ChannelRoutingPage from "./ChannelRoutingPage";

export default function AIHubLayout() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "sandbox";
  const { t } = useTranslation();

  useLayoutEffect(() => {
    const appShellContent = document.querySelector<HTMLElement>(".app-shell-content");
    if (appShellContent) {
      appShellContent.style.overflow = "hidden";
      appShellContent.style.padding = "0";
      appShellContent.style.display = "flex";
      appShellContent.style.flexDirection = "column";
    }
    const wrapper = document.querySelector<HTMLElement>(".motion-safe\\:animate-fade-in");
    if (wrapper) {
      const prev = [wrapper.style.display, wrapper.style.flex, wrapper.style.minHeight];
      wrapper.style.display = "flex";
      wrapper.style.flex = "1";
      wrapper.style.minHeight = "0";
    }
    return () => {
      if (appShellContent) {
        appShellContent.style.overflow = "";
        appShellContent.style.padding = "";
      }
      if (wrapper) {
        wrapper.style.display = "";
        wrapper.style.flex = "";
        wrapper.style.minHeight = "";
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Sticky Top Sub-navigation for AI Hub */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-6 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-indigo-600 animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {t("aiHub.subtitle")} ({t("aiHub.title")})
            </h1>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 bg-slate-50/20 overflow-y-auto">
        <React.Suspense fallback={
          <div className="flex h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        }>
           {activeTab === "sandbox" && <AIAgentSandboxPage />}
           {activeTab === "routing" && <ChannelRoutingPage />}
        </React.Suspense>
      </div>
    </div>
  );
}

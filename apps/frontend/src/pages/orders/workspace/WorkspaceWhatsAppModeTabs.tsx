import React from "react";
import { ChatBubbleOvalLeftEllipsisIcon, SparklesIcon } from "@heroicons/react/24/outline";

export interface WorkspaceWhatsAppModeTabsProps {
  activeTab: "chat" | "templates";
  setActiveTab: (tab: "chat" | "templates") => void;
  messagesCount: number;
  templatesCount: number;
  isArabic: boolean;
}

export const WorkspaceWhatsAppModeTabs: React.FC<WorkspaceWhatsAppModeTabsProps> = ({
  activeTab,
  setActiveTab,
  messagesCount,
  templatesCount,
  isArabic,
}) => {
  return (
    <div className="flex border-b border-border/50 bg-muted/10 px-4">
      <button
        type="button"
        onClick={() => setActiveTab("chat")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
          activeTab === "chat"
            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
        <span>{isArabic ? "المحادثة الحية" : "Live Chat"}</span>
        {messagesCount > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
            {messagesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("templates")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-all ${
          activeTab === "templates"
            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        <SparklesIcon className="h-4 w-4" />
        <span>{isArabic ? "قوالب التأكيد والرسائل" : "Templates"}</span>
        {templatesCount > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary font-bold tabular-nums">
            {templatesCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default WorkspaceWhatsAppModeTabs;

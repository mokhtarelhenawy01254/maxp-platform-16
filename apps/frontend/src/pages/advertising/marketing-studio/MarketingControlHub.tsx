import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Rocket,
  Clock,
  Sparkles,
  Layers,
  FolderArchive,
} from "lucide-react";
import { CampaignDraftLaunchCard } from "./CampaignDraftLaunchCard";
import type { CopilotSession } from "../../../components/advertising/copilot/types";
import type { MarketingCampaignDraft, MarketingProduct } from "./types";

interface MarketingControlHubProps {
  sessions: CopilotSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  draft: MarketingCampaignDraft | null;
  selectedProduct: MarketingProduct | null;
  onDraftPublished?: (draftId: string) => void;
  activeTab: "SESSIONS" | "DRAFT";
  onTabChange: (tab: "SESSIONS" | "DRAFT") => void;
}

export const MarketingControlHub: React.FC<MarketingControlHubProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  draft,
  selectedProduct,
  onDraftPublished,
  activeTab,
  onTabChange,
}) => {
  const [search, setSearch] = useState("");

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sessions, search]);

  const formatSessionTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Top Header & Dual Tabs */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl w-full gap-1">
          <button
            type="button"
            onClick={() => onTabChange("SESSIONS")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "SESSIONS"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>الجلسات</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("DRAFT")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "DRAFT"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>المسودات</span>
            {draft && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Sessions Hub */}
      {activeTab === "SESSIONS" && (
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-2.5">
          {/* New Session Button */}
          <button
            type="button"
            onClick={onNewSession}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>بدء جلسة تسويق جديدة</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الجلسات السابقة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-0.5">
            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                لم يتم العثور على جلسات مطابقة للبحث.
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const msgCount = sess.messages ? sess.messages.length : 0;
                return (
                  <div
                    key={sess.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSession(sess.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSelectSession(sess.id);
                    }}
                    className={`group w-full text-right p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded-lg flex-shrink-0 ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold truncate">
                          {sess.title || "جلسة جديدة"}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{msgCount} رسائل</span>
                          <span>•</span>
                          <span>{formatSessionTime(sess.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(sess.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                        title="حذف هذه الجلسة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Drafts & Launch */}
      {activeTab === "DRAFT" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {draft ? (
            <CampaignDraftLaunchCard
              draft={draft}
              selectedProduct={selectedProduct}
              onDraftPublished={onDraftPublished}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500">
                <Rocket className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                لا توجد مسودة إعلان جاهزة حالياً
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                اطلب من إيجنت الميديا باير في الشات:
                <span className="block mt-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                  "جهّز لي مسودة إعلان للمنتج المحدد"
                </span>
                وسيتم توليدها وعرضها هنا فوراً للمراجعة وتعديل الـ CTA والإطلاق بضغطة زر.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  TicketIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import { TurboTicketItem } from "./types";

interface TurboTicketListPanelProps {
  tickets: TurboTicketItem[];
  selectedTicketId: number | null;
  onSelectTicket: (ticket: TurboTicketItem) => void;
  onOpenNewTicket: () => void;
  unreadCount: number;
  loading: boolean;
  onRefresh: () => void;
  page: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
}

export const TurboTicketListPanel: React.FC<TurboTicketListPanelProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  onOpenNewTicket,
  unreadCount,
  loading,
  onRefresh,
  page,
  total,
  perPage,
  onPageChange,
  statusFilter,
  onChangeStatusFilter,
  searchQuery,
  onChangeSearchQuery,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const getStatusBadge = (status: any) => {
    let val = "";
    let label = "";

    if (status && typeof status === "object") {
      val = String(status.value || "").toLowerCase().trim();
      label = status.label || "";
    } else if (status !== undefined && status !== null) {
      val = String(status).toLowerCase().trim();
    }

    if (val === "0" || val === "open" || val === "new") {
      return {
        label: label || "جديدة",
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
      };
    }
    if (val === "3" || val === "on_hold" || val === "hold" || val === "pending") {
      return {
        label: label || "معلقة",
        className:
          "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20",
      };
    }
    if (val === "1" || val === "in_progress" || val === "processing") {
      return {
        label: label || "قيد المعالجة",
        className:
          "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
      };
    }
    if (val === "2" || val === "closed" || val === "resolved" || val === "solved") {
      return {
        label: label || "مغلقة",
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
      };
    }

    if (label) {
      return {
        label,
        className:
          "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20",
      };
    }

    return {
      label: "غير محدد",
      className:
        "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20",
    };
  };

  const statusTabs = [
    { key: "all", label: "الكل" },
    { key: "open", label: "الجديدة" },
    { key: "on_hold", label: "المعلقة" },
    { key: "in_progress", label: "قيد المعالجة" },
    { key: "closed", label: "مغلقة" },
  ];

  return (
    <aside className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-3.5 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5 shrink-0 bg-white dark:bg-zinc-900 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              <TicketIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>تذاكر الدعم والعمليات</span>
                {unreadCount > 0 && (
                  <span className="tabular-nums px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="تحديث التذاكر"
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onOpenNewTicket}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition active:scale-97 shadow-xs"
            >
              <PlusIcon className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>تذكرة جديدة</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="بحث برقم التذكرة أو كود الشحنة..."
            className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg text-[11px] font-medium overflow-x-auto scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeStatusFilter(tab.key)}
                className={`flex-1 min-w-max py-1 px-2 rounded-md transition text-center whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets Scrollable List */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-zinc-100 dark:divide-zinc-800/60 min-h-0 touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
        {loading && tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
            <div className="h-5 w-5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin rounded-full mx-auto" />
            <p>جاري تحميل التذاكر من تربو...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
            <ChatBubbleLeftEllipsisIcon className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-700" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              لا توجد تذاكر مطابقة
            </p>
            <p className="text-[11px] text-zinc-400">
              يمكنك فتح تذكرة جديدة لأي استفسار أو شكوى شحن.
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const isSelected = selectedTicketId === t.id;
            const badge = getStatusBadge(t.status);
            const title =
              t.subject ||
              t.description ||
              t.content ||
              `تذكرة #${t.id}`;
            const timeStr = t.created_at
              ? new Date(t.created_at).toLocaleDateString("ar-EG", {
                  month: "short",
                  day: "numeric",
                })
              : "";

            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTicket(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTicket(t);
                  }
                }}
                className={`p-3 text-right cursor-pointer transition relative group focus:outline-hidden ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800/90"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-zinc-900 dark:bg-zinc-100 rounded-l" />
                )}

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      #{t.id}
                    </span>
                    {t.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
                        {t.code}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed mb-2">
                  {title}
                </p>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    <span className="tabular-nums">{timeStr}</span>
                  </span>
                  {t.rate ? (
                    <span className="text-amber-500 font-semibold tabular-nums">
                      ★ {t.rate}/5
                    </span>
                  ) : t.messages && t.messages.length > 0 ? (
                    <span className="text-zinc-400 tabular-nums">
                      {t.messages.length} رسالة
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {total > perPage && (
        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 transition"
          >
            السابق
          </button>
          <span className="tabular-nums text-[11px]">
            {page} / {totalPages} ({total} تذكرة)
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 transition"
          >
            التالي
          </button>
        </div>
      )}
    </aside>
  );
};

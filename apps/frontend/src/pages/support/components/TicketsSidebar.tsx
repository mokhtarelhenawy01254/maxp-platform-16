import React, { useState } from "react";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Filter,
} from "lucide-react";
import { Ticket } from "../../../services/supportService";

interface TicketsSidebarProps {
  tickets: Ticket[];
  activeTicketId: string | null;
  onTicketSelect: (ticketId: string) => void;
  onNewTicket: () => void;
  loading: boolean;
}

type TabType = "open" | "in_progress" | "closed" | "all";

export const TicketsSidebar: React.FC<TicketsSidebarProps> = ({
  tickets,
  activeTicketId,
  onTicketSelect,
  onNewTicket,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case "in_progress":
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
      case "closed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "closed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "مفتوحة";
      case "in_progress":
        return "قيد المتابعة";
      case "closed":
        return "مغلقة";
      default:
        return status;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesTab = activeTab === "all" || ticket.status === activeTab;
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTabCount = (tab: TabType) => {
    if (tab === "all") return tickets.length;
    return tickets.filter((t) => t.status === tab).length;
  };

  const getLastMessage = (ticket: Ticket) => {
    if (ticket.messages.length === 0) return "لا توجد رسائل سابقة";
    const lastMsg = ticket.messages[ticket.messages.length - 1];
    if (!lastMsg) return "لا توجد رسائل سابقة";
    return (
      lastMsg.content.substring(0, 50) +
      (lastMsg.content.length > 50 ? "..." : "")
    );
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return then.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border/70 select-none">
      {/* Header with Search and New Ticket Action */}
      <div className="p-3.5 border-b border-border/60 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">قائمة التذاكر</h2>
            <span className="text-[11px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 tabular-nums">
              {filteredTickets.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onNewTicket}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-2xs active:scale-[0.98]"
            title="إنشاء تذكرة جديدة"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>جديدة</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="البحث برقم التذكرة أو الموضوع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-border/80 bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 p-1.5 border-b border-border/60 bg-muted/20 shrink-0">
        {[
          { key: "all" as TabType, label: "الكل" },
          { key: "open" as TabType, label: "مفتوحة" },
          { key: "in_progress" as TabType, label: "متابعة" },
          { key: "closed" as TabType, label: "مغلقة" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                isActive
                  ? "bg-card text-foreground shadow-2xs border border-border/70 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                ({getTabCount(tab.key)})
              </span>
            </button>
          );
        })}
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-xs">جارٍ تحميل التذاكر...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40 stroke-[1.5]" />
            <p className="text-xs font-medium text-foreground">لا توجد تذاكر تطابق البحث</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">يمكنك تغيير فلتر الحالة أو فتح تذكرة دعم جديدة</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = activeTicketId === ticket.ticketId;
            return (
              <button
                key={ticket.id || ticket.ticketId}
                type="button"
                onClick={() => onTicketSelect(ticket.ticketId)}
                className={`w-full text-right p-3 transition-colors flex flex-col gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-accent/40 border-r-2 border-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
                    #{ticket.ticketId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${getStatusBadge(
                        ticket.status
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      <span>{getStatusLabel(ticket.status)}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {getRelativeTime(ticket.updatedAt)}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-medium text-foreground line-clamp-1 leading-snug">
                  {ticket.subject}
                </h3>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                  <span className="truncate max-w-[190px]">
                    {getLastMessage(ticket)}
                  </span>
                  {ticket.messages.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
                      <MessageSquare className="w-3 h-3" />
                      <span>{ticket.messages.length}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TicketsSidebar;

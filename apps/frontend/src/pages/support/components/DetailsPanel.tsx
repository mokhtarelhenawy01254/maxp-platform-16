import React from "react";
import {
  Calendar,
  Tag,
  User,
  Mail,
  Clock,
  Star,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Ticket } from "../../../services/supportService";

interface DetailsPanelProps {
  ticket: Ticket | null;
  userHistory?: any[];
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ ticket, userHistory }) => {
  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-card p-4 text-center select-none">
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <Tag className="w-8 h-8 opacity-40 stroke-[1.5]" />
          <p className="text-xs font-medium text-foreground">تفاصيل التذكرة</p>
          <p className="text-[11px]">حدد تذكرة لمعاينة بياناتها الفنية</p>
        </div>
      </div>
    );
  }

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "low":
        return "bg-muted text-muted-foreground border-border/60";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-primary/10 text-primary border-primary/20";
      case "billing":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "inquiry":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "suggestion":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "complaint":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      open: "مفتوحة",
      in_progress: "قيد المتابعة",
      closed: "مغلقة ومحلولة",
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      critical: "حرجة وعاجلة",
      high: "عالية",
      medium: "متوسطة",
      low: "منخفضة",
    };
    return priorityMap[priority] || priority;
  };

  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      technical: "دعم برمجي وتقني",
      billing: "فواتير واشتراكات",
      inquiry: "استفسار عام",
      suggestion: "اقتراح تطويري",
      complaint: "شكوى تشغيلية",
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="h-full overflow-y-auto bg-card border-r border-border/70 p-3.5 space-y-4 select-none text-xs">
      {/* Header section */}
      <div className="border-b border-border/60 pb-2.5">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>المعلومات الفنية للتذكرة</span>
        </h3>
      </div>

      {/* Meta Specifications Table */}
      <div className="space-y-3">
        {/* Ticket ID */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px]">رقم التذكرة:</span>
          <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60 tabular-nums">
            #{ticket.ticketId}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px]">حالة المعالجة:</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${getStatusBadge(
              ticket.status
            )}`}
          >
            {ticket.status === "closed" ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : ticket.status === "in_progress" ? (
              <AlertCircle className="w-3 h-3 text-blue-500" />
            ) : (
              <Clock className="w-3 h-3 text-amber-500" />
            )}
            <span>{getStatusText(ticket.status)}</span>
          </span>
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px]">درجة الأهمية:</span>
          <span
            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${getPriorityBadge(
              ticket.priority
            )}`}
          >
            {getPriorityText(ticket.priority)}
          </span>
        </div>

        {/* Category */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px]">القسم المعني:</span>
          <span
            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-medium ${getCategoryBadge(
              ticket.category
            )}`}
          >
            {getCategoryText(ticket.category)}
          </span>
        </div>

        {/* Created Date */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>تاريخ الفتح:</span>
          </span>
          <span className="font-mono text-foreground tabular-nums text-[11px]">
            {new Date(ticket.createdAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>آخر تفاعل:</span>
          </span>
          <span className="font-mono text-foreground tabular-nums text-[11px]">
            {new Date(ticket.updatedAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Assigned Engineer / Agent */}
        {ticket.assignedTo && (
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <span className="text-muted-foreground text-[11px] block">المهندس المسؤول:</span>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/60">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{ticket.assignedTo.name}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">
                  {ticket.assignedTo.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Client User Info */}
        {ticket.userId && (
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <span className="text-muted-foreground text-[11px] block">بيانات صاحب التذكرة:</span>
            <div className="space-y-1 p-2 rounded-lg bg-muted/30 border border-border/60">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <User className="w-3 h-3 text-muted-foreground" />
                <span>{ticket.userId.name || "مستخدم مسجل"}</span>
              </div>
              {ticket.userId.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-mono break-all">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span>{ticket.userId.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Satisfaction Rating */}
        {ticket.rating && (
          <div className="pt-2 border-t border-border/60 space-y-2">
            <span className="text-muted-foreground text-[11px] block">تقييم جودة الخدمة:</span>
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-1.5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= ticket.rating!
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
                <span className="mr-1 text-[11px] font-mono font-bold text-foreground tabular-nums">
                  {ticket.rating}/5
                </span>
              </div>
              {ticket.feedback && (
                <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1">
                  "{ticket.feedback}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Historical Tickets Context */}
        {userHistory && userHistory.length > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>سجل التذاكر السابقة:</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                ({userHistory.length})
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {userHistory.slice(0, 4).map((hTicket) => (
                <div
                  key={hTicket.id || hTicket.ticketId}
                  className="p-1.5 rounded border border-border/50 bg-background text-[11px] space-y-0.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-semibold text-primary text-[10px] tabular-nums">
                      #{hTicket.ticketId}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {new Date(hTicket.createdAt).toLocaleDateString("ar-EG", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-foreground truncate">{hTicket.subject}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;

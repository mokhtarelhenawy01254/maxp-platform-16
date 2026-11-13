import React from "react";
import { Phone, MessageCircle, Clock, User } from "lucide-react";
import { Customer } from "../../services/customerService";

export const LEAD_STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "جديد",
  CONTACTED: "تم التواصل",
  INTERESTED: "مهتم",
  FOLLOW_UP_SCHEDULED: "متابعة مجدولة",
  PROPOSAL_SENT: "عرض مُرسل",
  NEGOTIATION: "تفاوض",
  CONVERTED: "اتحول",
  NOT_INTERESTED: "غير مهتم",
  LOST: "مفقود",
};

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  HOT: {
    label: "ساخن",
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  },
  WARM: {
    label: "دافئ",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  COLD: {
    label: "بارد",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
  },
};

const dateFmt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "short" });

interface LeadsMobileCardProps {
  customer: Customer;
  onOpen: (customer: Customer) => void;
}

export const LeadsMobileCard: React.FC<LeadsMobileCardProps> = ({
  customer,
  onOpen,
}) => {
  const fullName =
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    "عميل غير مسمى";
  const digits = (customer.phone || "").replace(/\D/g, "");
  const stageLabel = customer.leadStage
    ? LEAD_STAGE_LABELS[customer.leadStage]
    : null;
  const priority = customer.leadPriority
    ? PRIORITY_STYLES[customer.leadPriority]
    : null;
  const assignee = customer.assignedTo
    ? `${customer.assignedTo.firstName || ""} ${customer.assignedTo.lastName || ""}`.trim()
    : null;

  return (
    <div
      onClick={() => onOpen(customer)}
      className="rounded-xl border border-border/70 bg-card shadow-2xs p-3 space-y-2 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.99] min-w-0"
    >
      {/* Name + chips */}
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <div className="font-semibold text-xs text-foreground truncate min-w-0">
          {fullName}
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {stageLabel && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {stageLabel}
            </span>
          )}
          {priority && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${priority.cls}`}
            >
              {priority.label}
            </span>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate min-w-0">{assignee || "غير مُسند"}</span>
      </div>

      {/* Next follow-up */}
      {customer.nextFollowUpDate && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span dir="ltr" className="tabular-nums">
            {dateFmt.format(new Date(customer.nextFollowUpDate))}
          </span>
        </div>
      )}

      {/* Contact actions */}
      {customer.phone && (
        <div className="flex items-center gap-1 pt-1.5 border-t border-border/50">
          <a
            href={`tel:${customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="اتصال هاتفي"
            aria-label="اتصال هاتفي"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/${digits}`, "_blank");
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"
            title="واتساب"
            aria-label="واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <span
            dir="ltr"
            className="font-mono text-[11px] text-muted-foreground tabular-nums truncate min-w-0"
          >
            {customer.phone}
          </span>
        </div>
      )}
    </div>
  );
};

export default LeadsMobileCard;

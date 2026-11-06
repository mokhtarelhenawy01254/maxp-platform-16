import { MessageSquare, Ticket } from "lucide-react";
import type { TicketListItem } from "./companyDetailsTypes";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { formatDateTime, getStatusMeta } from "./helpers";
import { EmptyState } from "./EmptyState";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

function priorityLabel(priority?: string | null) {
  if (!priority) return "—";
  const key = priority.trim().toUpperCase();
  return PRIORITY_LABELS[key] ?? "—";
}

export function CompanySupportTickets({ tickets, companyId, loading }: {
  tickets: TicketListItem[];
  companyId: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!tickets.length) {
    return <EmptyState icon={Ticket} message="لا توجد تذاكر دعم لهذه الشركة حالياً." />;
  }

  return (
    <div className="space-y-2">
      {tickets.slice(0, 8).map((ticket) => {
        const statusMeta = getStatusMeta("ticket", ticket.status);
        return (
          <div key={ticket.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3.5 transition-colors hover:bg-muted/30">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-bold text-foreground">{ticket.subject}</span>
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] font-semibold">{ticket.ticketId}</span>
                <span>•</span>
                <span>أولوية {priorityLabel(ticket.priority)}</span>
                {ticket.user ? (
                  <>
                    <span>•</span>
                    <span>{ticket.user.firstName} {ticket.user.lastName}</span>
                  </>
                ) : null}
                <span>•</span>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" className="mr-2 shrink-0 rounded-lg hover:bg-primary/10 hover:text-primary" asChild>
              <a href={`/support/admin/tickets/${ticket.id}`} title="فتح التذكرة">
                <MessageSquare className="size-4" />
              </a>
            </Button>
          </div>
        );
      })}
      {tickets.length > 8 ? (
        <p className="pt-1 text-center text-xs text-muted-foreground">وعرض {tickets.length - 8} تذاكر أخرى في شاشة الدعم</p>
      ) : null}
    </div>
  );
}

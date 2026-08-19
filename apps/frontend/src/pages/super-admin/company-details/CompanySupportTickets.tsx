import { MessageSquare, Tag, Ticket } from 'lucide-react';
import type { TicketListItem } from "./companyDetailsTypes";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { formatDateTime } from "./helpers";
import { EmptyState } from "./EmptyState";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "مفتوحة",
  IN_PROGRESS: "قيد المعالجة",
  CLOSED: "مغلقة",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

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
      {tickets.slice(0, 5).map((ticket) => (
        <div key={ticket.id} className="flex items-center justify-between rounded-xl border p-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-foreground">{ticket.subject}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{ticket.ticketId}</span>
              <span>•</span>
              <span>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</span>
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
          <Button type="button" variant="ghost" size="sm" className="mr-2 shrink-0 rounded-lg" asChild>
            <a href={`/support/admin/tickets/${ticket.id}`}><MessageSquare className="size-3.5" /></a>
          </Button>
        </div>
      ))}
      {tickets.length > 5 ? (
        <p className="pt-1 text-center text-xs text-muted-foreground">وعرض {tickets.length - 5} تذاكر أخرى</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300",
    IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300",
    CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
  return (
    <Badge variant="outline" className={colors[status] || ""}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

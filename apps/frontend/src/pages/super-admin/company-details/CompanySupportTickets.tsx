import { useMemo, useState } from "react";
import { MessageSquare, Search, Ticket } from "lucide-react";
import type { TicketListItem } from "./companyDetailsTypes";
import { Badge } from "../../../components/ui/badge";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import { formatDateTime, formatNumber, getStatusMeta } from "./helpers";
import { EmptyState } from "./EmptyState";

const PAGE_SIZE = 10;

export function CompanySupportTickets({ tickets, companyId, loading }: {
  tickets: TicketListItem[];
  companyId: string;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const haystack = `${ticket.subject || ""} ${ticket.ticketId || ""} ${ticket.user?.firstName || ""} ${ticket.user?.lastName || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [tickets, query]);

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

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE); }}
          placeholder="ابحث برقم التذكرة أو الموضوع أو مقدّم التذكرة..."
          className="h-10 rounded-xl pr-9 text-sm"
        />
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        المعروض: {formatNumber(shown.length)} من {formatNumber(filtered.length)} تذكرة
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={Search} message="لا توجد تذاكر مطابقة للبحث الحالي." />
      ) : (
      <div className="space-y-2">
      {shown.map((ticket) => {
        const statusMeta = getStatusMeta("ticket", ticket.status);
        const priorityMeta = getStatusMeta("priority", ticket.priority);
        return (
          <div key={ticket.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30">
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
                <span>أولوية {priorityMeta.label}</span>
                {ticket.user ? (
                  <>
                    <span>•</span>
                    <span>{ticket.user.firstName} {ticket.user.lastName}</span>
                  </>
                ) : null}
                <span>•</span>
                <span>تاريخ الإنشاء: {formatDateTime(ticket.createdAt)}</span>
              </div>
            </div>
            <a
              href={`/support/admin/tickets/${ticket.id}`}
              title="فتح التذكرة"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "mr-2 shrink-0 rounded-lg hover:bg-primary/10 hover:text-primary",
              )}
            >
              <MessageSquare className="size-4" />
            </a>
          </div>
        );
      })}
      </div>
      )}

      {filtered.length > shown.length ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
          >
            عرض {formatNumber(Math.min(PAGE_SIZE, filtered.length - shown.length))} تذكرة أخرى
          </Button>
        </div>
      ) : null}
    </div>
  );
}

import React from "react";
import { ChevronRight, ChevronLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

export const statusStyles: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  approved: {
    bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "معتمد",
  },
  corrected: {
    bg: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "مصحح",
  },
  rejected: {
    bg: "bg-destructive/10 border-destructive/20 text-destructive",
    dot: "bg-destructive",
    text: "text-destructive",
    label: "مرفوض",
  },
  skipped: {
    bg: "bg-muted text-muted-foreground border-border/60",
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "تم التخطي",
  },
  error: {
    bg: "bg-destructive/10 border-destructive/20 text-destructive",
    dot: "bg-destructive",
    text: "text-destructive",
    label: "خطأ",
  },
};

export function formatTime(iso: string, locale: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === "ar" ? "ar-EG" : locale, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return iso;
  }
}

interface LogsTableProps {
  logs: any[] | undefined;
  logsLoading: boolean;
  logsError: boolean;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  language: string;
  onOpenReply: (data: { original: string; corrected: string; agent: string }) => void;
}

export function SuperAdminSelfReviewLogsTable({
  logs,
  logsLoading,
  logsError,
  page,
  totalPages,
  setPage,
  language,
  onOpenReply,
}: LogsTableProps) {
  if (logsError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription className="text-xs">حدث خطأ أثناء تحميل السجلات</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (logsLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!logs || logs.length === 0) {
    return <div className="p-12 text-center text-xs font-mono text-muted-foreground">لا توجد سجلات مطابقة للشروط</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/70 hover:bg-transparent">
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الوقت</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الوكيل</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الحالة</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الملاحظات والانحرافات</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">السبب</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">النموذج</TableHead>
              <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الزمن</TableHead>
              <TableHead className="text-left text-[11px] font-mono w-16">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const agentName = log.metadata_?.agent_name || log.agent_slug || log.agent_id.slice(0, 12);
              const originalReply = log.metadata_?.original_reply || "";
              const correctedReply = (log.status === "corrected" || log.status === "polished") ? (log.reply_preview || "") : "";
              const st = statusStyles[log.status] || statusStyles.skipped;
              return (
                <TableRow key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors text-xs">
                  <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                    {formatTime(log.created_at, language)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground max-w-[130px] truncate" title={agentName}>
                    {agentName}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border", st.bg)}>
                      <span className={cn("size-1.5 rounded-full", st.dot)} />
                      {st.label}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground font-mono text-[11px]" title={log.violations?.join(", ") || ""}>
                    {log.violations?.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs" title={log.reason || ""}>
                    {log.reason || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-[11px]">
                    {log.model_used || "—"}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground text-[11px]">
                    {log.latency_ms ? `${log.latency_ms}ms` : "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                      onClick={() => onOpenReply({
                        original: originalReply || log.reply_preview || "",
                        corrected: correctedReply,
                        agent: agentName,
                      })}
                      title="عرض الرد"
                    >
                      <MessagesSquare className="size-3.5 ml-1" />
                      <span>عرض</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between p-2.5 border-t border-border/70 bg-muted/20">
        <p className="text-xs font-mono text-muted-foreground">
          صفحة {page} / {totalPages || 1}
        </p>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="h-7 px-2.5 text-xs font-mono border-border/70"
          >
            <ChevronRight className="size-3.5 ml-1" /> السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="h-7 px-2.5 text-xs font-mono border-border/70"
          >
            التالي <ChevronLeft className="size-3.5 mr-1" />
          </Button>
        </div>
      </div>
    </>
  );
}

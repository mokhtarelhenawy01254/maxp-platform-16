import type { WhatsAppSummary, WhatsAppSession } from "./companyDetailsTypes";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { MessageSquare, Phone, CheckCircle2, XCircle, Loader2, Inbox, Plus } from "lucide-react";

function SessionStatusBadge({ status }: { status: string }) {
  const connected = status === "CONNECTED";
  return (
    <Badge variant="outline" className={connected
      ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
      : "rounded-full border-rose-200 bg-rose-50 text-rose-700 text-[11px] dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300"}>
      {connected ? <CheckCircle2 className="size-3 ml-1" /> : <XCircle className="size-3 ml-1" />}
      {connected ? "موصول" : "غير موصول"}
    </Badge>
  );
}

export function CompanyWhatsAppCard({ summary, sessions, loading }: {
  summary?: WhatsAppSummary | null;
  sessions?: WhatsAppSession[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="rounded-2xl border">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const defaultSession = summary.defaultSession;

  return (
    <Card className="rounded-2xl border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-600" />
            <h3 className="text-sm font-black text-foreground">واتساب</h3>
          </div>
          <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 text-xs">
            {summary.connectedSessions}/{summary.sessionsTotal} متصل
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            {defaultSession ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">الرقم الافتراضي</p>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground shrink-0" />
                  <span dir="ltr" className="text-sm font-bold text-foreground">{defaultSession.phoneNumber}</span>
                  <SessionStatusBadge status={defaultSession.status} />
                </div>
                {defaultSession.lastConnectedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    آخر اتصال: {new Date(defaultSession.lastConnectedAt).toLocaleDateString("ar-EG")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">لا يوجد رقم واتساب افتراضي</p>
                <p className="text-[11px] text-muted-foreground/70">لم يتم إعداد أي رقم واتساب بعد</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[100px] rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
              <p className="text-lg font-black text-foreground">{summary.sessionsTotal}</p>
              <p className="text-[11px] text-muted-foreground">الجلسات</p>
            </div>
            <div className="flex-1 min-w-[100px] rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
              <p className="text-lg font-black text-foreground">{summary.templatesTotal}</p>
              <p className="text-[11px] text-muted-foreground">القوالب</p>
            </div>
            <div className="flex-1 min-w-[100px] rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
              <p className="text-lg font-black text-foreground">{summary.notificationsEnabled ? "نعم" : "لا"}</p>
              <p className="text-[11px] text-muted-foreground">الإشعارات</p>
            </div>
          </div>
        </div>

        {sessions && sessions.length > 1 && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              جميع الأرقام ({sessions.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Phone className="size-3 text-muted-foreground" />
                    <span dir="ltr" className="text-xs font-medium text-foreground">{session.phoneNumber}</span>
                    {session.isDefault && (
                      <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-sky-700 text-[10px] dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">أساسي</Badge>
                    )}
                  </div>
                  <SessionStatusBadge status={session.status} />
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
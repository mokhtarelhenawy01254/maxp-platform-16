import React from "react";
import { Link } from "react-router-dom";
import {
  History,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Package,
} from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../../../../components/ui/avatar";
import { appIconsBySlug } from "../../../../utils/marketplace";
import type { AppActivityLog } from "../../types/appHistoryTypes";

interface AppHistoryTableProps {
  logs: AppActivityLog[];
  loading: boolean;
  isRtl: boolean;
}

export function AppHistoryTable({ logs, loading, isRtl }: AppHistoryTableProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/30 bg-muted/20"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 px-4 text-center space-y-3">
        <div className="size-14 mx-auto rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center border border-border/40">
          <History className="size-7" />
        </div>
        <h3 className="text-sm font-bold text-foreground">لا توجد حركات مسجلة حالياً</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto text-pretty">
          لم يتم تسجيل أي عمليات تثبيت أو إلغاء تثبيت تطابق الفلاتر المحددة.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/40 text-muted-foreground font-semibold">
            <th className="py-3 px-4">نوع الحركة</th>
            <th className="py-3 px-4">الأداة / التطبيق</th>
            <th className="py-3 px-4">المنفذ (بواسطة من؟)</th>
            <th className="py-3 px-4">التفاصيل والنظام</th>
            <th className="py-3 px-4">التاريخ والتوقيت</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {logs.map((log) => {
            const isInstall = log.action === "INSTALL_APP";
            const appSlug = log.metadata?.appSlug;
            const AppIconComponent = appSlug ? appIconsBySlug[appSlug] || Package : Package;

            return (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                {/* Action Badge */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {isInstall ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      <span>تثبيت وتفعيل</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                      <Trash2 className="size-3.5" />
                      <span>إلغاء التثبيت</span>
                    </span>
                  )}
                </td>

                {/* App Info */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-muted/60 text-foreground border border-border/40 flex items-center justify-center shrink-0">
                      <AppIconComponent className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{log.targetName || "تطبيق"}</p>
                      {appSlug && (
                        <Link
                          to={`/marketplace/apps/${appSlug}`}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span>{appSlug}</span>
                          <ExternalLink className="size-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </td>

                {/* Actor (Who installed or uninstalled) */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7 rounded-lg border border-border/40">
                      {log.user?.avatar && <AvatarImage src={log.user.avatar} />}
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {log.user?.name ? log.user.name.charAt(0) : "م"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground text-xs">{log.user?.name || "مدير النظام"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.user?.email || log.user?.role || "مسؤول"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Details / Pricing / Trial */}
                <td className="py-3.5 px-4 text-muted-foreground">
                  {log.metadata?.pricingModel ? (
                    <div className="space-y-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-foreground">
                        {log.metadata.pricingModel === "FREE"
                          ? "مجاني"
                          : log.metadata.pricingModel === "PAY_PER_USE"
                          ? "حسب الاستهلاك"
                          : log.metadata.billingCycle === "yearly"
                          ? "اشتراك سنوي"
                          : "اشتراك شهري"}
                      </span>
                      {log.metadata?.trial && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          تجربة مجانية
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px]">{log.description}</span>
                  )}
                </td>

                {/* Timestamp */}
                <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap tabular-nums font-mono">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="size-3 text-muted-foreground shrink-0" />
                    <span>{new Date(log.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {new Date(log.createdAt).toLocaleTimeString(isRtl ? "ar-EG" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

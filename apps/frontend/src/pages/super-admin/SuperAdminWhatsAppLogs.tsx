import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, RefreshCw, Search, Layers } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "../../services/apiClient";

interface CompanyOption {
  id: string;
  name: string;
}

interface LogRow {
  id: string;
  eventType: string;
  category: string;
  status: string;
  recipientPhone: string;
  recipientName: string | null;
  createdAt: string;
  failureReason: string | null;
  company: {
    name: string;
    slug: string | null;
  };
}

export default function SuperAdminWhatsAppLogs() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadCompanies = async () => {
      try {
        const response = await apiClient.get("/admin/companies");
        if (active) {
          setCompanies(response.data.data?.companies || []);
        }
      } catch (err) {
        console.error("Error loading companies for WhatsApp logs:", err);
      }
    };

    void loadCompanies();
    return () => { active = false; };
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/admin/whatsapp/logs", {
        params: {
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          companyId: companyId === "all" ? undefined : companyId,
          scope: "SUPER_ADMIN",
          limit: 100,
        },
      });
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error("Error loading WhatsApp logs:", err);
      setError(t("superAdmin.whatsapp.logs.empty", "تعذر استدعاء سجلات واتساب"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, companyId, t]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const getStatusBadge = (logStatus: string) => {
    switch (logStatus) {
      case "DELIVERED":
      case "READ":
        return <Badge variant="outline" className="text-[10px] font-mono rounded-md text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">{logStatus}</Badge>;
      case "SENT":
        return <Badge variant="outline" className="text-[10px] font-mono rounded-md text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10">{logStatus}</Badge>;
      case "FAILED":
        return <Badge variant="outline" className="text-[10px] font-mono rounded-md text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10">{logStatus}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-mono rounded-md">{logStatus}</Badge>;
    }
  };

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 bg-card p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                {t("superAdmin.whatsapp.logs.title", "سجل إرسال رسائل واتساب")}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {logs.length} سجل
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("superAdmin.whatsapp.logs.description", "مراقبة لحظية لحالة الإرسال والتسليم وأسباب الفشل عبر كل الشركات")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLogs}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] cursor-pointer"
          >
            <Link to="/super-admin/whatsapp">
              <Layers className="size-3.5" />
              <span>نظرة عامة</span>
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">{t("superAdmin.whatsapp.overview.errorTitle", "خطأ")}</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="p-3 rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("superAdmin.whatsapp.logs.searchPlaceholder", "بحث بالهاتف أو نوع الحدث...")}
                  aria-label={t("superAdmin.whatsapp.logs.searchPlaceholder", "بحث")}
                  className="h-8 text-xs pr-8 font-mono bg-background border-border/70"
                />
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/70">
                  <SelectValue placeholder={t("superAdmin.whatsapp.logs.statusPlaceholder", "جميع حالات التسليم")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.logs.statusAll", "جميع الحالات")}</SelectItem>
                  <SelectItem value="SENT">SENT</SelectItem>
                  <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                  <SelectItem value="READ">READ</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>

              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/70">
                  <SelectValue placeholder={t("superAdmin.whatsapp.logs.companyPlaceholder", "جميع الشركات")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.logs.companyAll", "جميع الشركات")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Single-Surface Table Container */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">
                {t("superAdmin.whatsapp.logs.listTitle", "سجلات الرسائل اللحظية")}
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                {logs.length} سجلات مرصودة
              </span>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-md" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="p-3 space-y-2 lg:hidden">
                  {logs.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground font-mono">
                      {t("superAdmin.whatsapp.logs.empty", "لا توجد سجلات")}
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">{log.company.name}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="text-[11px] font-mono text-foreground">
                          <span className="text-primary font-bold">{log.eventType}</span> · <span className="text-muted-foreground">{log.category}</span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                          <span>{log.recipientPhone} {log.recipientName ? `(${log.recipientName})` : ""}</span>
                          <span>{new Date(log.createdAt).toLocaleDateString("ar-EG")}</span>
                        </div>
                        {log.status === "FAILED" && log.failureReason && (
                          <p className="text-[10px] font-mono text-rose-500 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                            {log.failureReason}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop High-Density Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 bg-muted/10">
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.company", "الشركة")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.event", "نوع الحدث والتصنيف")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.status", "الحالة")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.error", "ملاحظة الفشل")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.recipient", "المستلم")}</TableHead>
                        <TableHead className="text-left text-xs font-mono">{t("superAdmin.whatsapp.logs.columns.time", "الوقت")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground font-mono">
                            {t("superAdmin.whatsapp.logs.empty", "لا توجد سجلات")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} className="border-border/50 hover:bg-muted/15 transition-colors">
                            <TableCell className="font-semibold text-xs text-foreground">{log.company.name}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs font-medium text-foreground">{log.eventType}</p>
                                <p className="text-[10px] text-muted-foreground">{log.category}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell>
                              {log.status === "FAILED" && log.failureReason ? (
                                <span className="max-w-[220px] truncate block text-[11px] font-mono text-rose-600 dark:text-rose-400" title={log.failureReason}>
                                  {log.failureReason}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground font-mono">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <div>
                                <p className="tabular-nums">{log.recipientPhone}</p>
                                {log.recipientName && (
                                  <p className="text-[10px] text-muted-foreground">{log.recipientName}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-left font-mono tabular-nums text-[11px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString("ar-EG")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

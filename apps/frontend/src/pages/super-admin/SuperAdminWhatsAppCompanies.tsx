import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, RefreshCw, Search, Settings2, Smartphone, ExternalLink } from "lucide-react";

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

interface CompanyRow {
  id: string;
  name: string;
  slug: string | null;
  email: string;
  isActive: boolean;
  whatsapp: {
    status: string;
    needsAttention: boolean;
    sessionsTotal: number;
    connectedSessions: number;
    notificationsEnabled: boolean;
    hasDefaultSession: boolean;
    templatesTotal: number;
    activeTemplates: number;
    sentLast30Days: number;
    failedLast30Days: number;
    lastNotificationAt: string | null;
  };
}

export default function SuperAdminWhatsAppCompanies() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [notifications, setNotifications] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/admin/whatsapp/companies", {
        params: {
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          notifications: notifications === "all" ? undefined : notifications,
          scope: "SUPER_ADMIN",
          limit: 100,
        },
      });
      setRows(response.data.data || []);
    } catch (err) {
      console.error("Error loading WhatsApp companies:", err);
      setError(t("superAdmin.whatsapp.companies.empty"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, notifications, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const sl = (key: string) => t(`superAdmin.whatsapp.companies.statusLabels.${key}`);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
            <Building2 className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {t("superAdmin.whatsapp.companies.title")}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {rows.length} شركة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("superAdmin.whatsapp.companies.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
          <Button
            nativeButton={false}
            render={<Link to="/super-admin/whatsapp" />}
            size="sm"
            className="h-8 gap-1.5 text-xs font-mono font-medium bg-muted text-foreground border border-border/70 hover:bg-muted/80 active:scale-[0.98] transition-transform"
          >
            <span>نظرة عامة</span>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="p-2.5 rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("superAdmin.whatsapp.companies.searchPlaceholder")}
                  aria-label={t("superAdmin.whatsapp.companies.searchPlaceholder")}
                  className="h-8 text-xs pr-8 font-mono bg-background border-border/70"
                />
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/70">
                  <SelectValue placeholder={t("superAdmin.whatsapp.companies.statusAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.companies.statusAll")}</SelectItem>
                  <SelectItem value="connected">{sl("connected")}</SelectItem>
                  <SelectItem value="attention">{sl("attention")}</SelectItem>
                  <SelectItem value="disconnected">{sl("disconnected")}</SelectItem>
                  <SelectItem value="not-configured">{sl("not-configured")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={notifications} onValueChange={setNotifications}>
                <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/70">
                  <SelectValue placeholder={t("superAdmin.whatsapp.companies.notificationsAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.companies.notificationsAll")}</SelectItem>
                  <SelectItem value="enabled">{t("superAdmin.whatsapp.companies.notificationsEnabled")}</SelectItem>
                  <SelectItem value="disabled">{t("superAdmin.whatsapp.companies.notificationsDisabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Single-Surface Table Container */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">
                {t("superAdmin.whatsapp.companies.listTitle")}
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                {rows.length} نتائج
              </span>
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 rounded-md" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="p-3 space-y-2 lg:hidden">
                  {rows.length === 0 ? (
                    <p className="text-center py-6 text-xs text-muted-foreground font-mono">
                      {t("superAdmin.whatsapp.companies.empty")}
                    </p>
                  ) : (
                    rows.map((row) => (
                      <div key={row.id} className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-xs text-foreground">{row.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{row.email} {row.slug ? `· @${row.slug}` : ""}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {sl(row.whatsapp.status) || row.whatsapp.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-border/50">
                          <div>
                            <span className="text-muted-foreground">الجلسات: </span>
                            <span className="font-bold tabular-nums text-foreground">{row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">التنبيهات: </span>
                            <span className="font-bold text-foreground">{row.whatsapp.notificationsEnabled ? "مفعلة" : "معطلة"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">القوالب: </span>
                            <span className="font-bold tabular-nums text-foreground">{row.whatsapp.activeTemplates}/{row.whatsapp.templatesTotal}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">الفشل: </span>
                            <span className="font-bold tabular-nums text-rose-500">{row.whatsapp.failedLast30Days}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <Button nativeButton={false} variant="outline" size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}/settings?tab=sessions`} />} className="flex-1 h-7 text-[10px] font-mono gap-1">
                            <Smartphone className="size-3" /> جلسات
                          </Button>
                          <Button nativeButton={false} variant="outline" size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />} className="flex-1 h-7 text-[10px] font-mono">
                            مساحة العمل
                          </Button>
                          <Button nativeButton={false} size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}/notifications`} />} className="h-7 text-[10px] font-mono bg-primary text-primary-foreground gap-1">
                            <Settings2 className="size-3" /> إشعارات
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop High-Density Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 bg-muted/10">
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.company")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.status")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.sessions")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.notifications")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.templates")}</TableHead>
                        <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.failures")}</TableHead>
                        <TableHead className="text-left text-xs font-mono">{t("superAdmin.whatsapp.companies.columns.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground font-mono">
                            {t("superAdmin.whatsapp.companies.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((row) => (
                          <TableRow key={row.id} className="border-border/50 hover:bg-muted/15 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-xs text-foreground">{row.name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{row.email} {row.slug ? `· @${row.slug}` : ""}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono rounded-md">
                                {sl(row.whatsapp.status) || row.whatsapp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-xs">
                              {row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              <span className={`inline-flex items-center gap-1 ${row.whatsapp.notificationsEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                <span className={`size-1.5 rounded-full ${row.whatsapp.notificationsEnabled ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                                {row.whatsapp.notificationsEnabled ? "مفعلة" : "معطلة"}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-xs">
                              {row.whatsapp.activeTemplates}/{row.whatsapp.templatesTotal}
                            </TableCell>
                            <TableCell className="font-mono tabular-nums text-xs text-rose-500">
                              {row.whatsapp.failedLast30Days}
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button nativeButton={false} variant="outline" size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}/settings?tab=sessions`} />} className="h-7 px-2 text-xs font-mono gap-1 active:scale-[0.98]">
                                  <Smartphone className="size-3" />
                                  <span>جلسات</span>
                                </Button>
                                <Button nativeButton={false} variant="outline" size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />} className="h-7 px-2 text-xs font-mono active:scale-[0.98]">
                                  <span>مساحة العمل</span>
                                </Button>
                                <Button nativeButton={false} size="sm" render={<Link to={`/super-admin/whatsapp/companies/${row.id}/notifications`} />} className="h-7 px-2 text-xs font-mono bg-primary text-primary-foreground gap-1 active:scale-[0.98]">
                                  <Settings2 className="size-3" />
                                  <span>إشعارات</span>
                                </Button>
                              </div>
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

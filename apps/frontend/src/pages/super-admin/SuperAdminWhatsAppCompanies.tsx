import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, RefreshCw, Search, Settings2, Smartphone } from "lucide-react";

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
import { WhatsAppPageShell, WhatsAppSurfaceCard } from "../whatsapp/components/WhatsAppPageShell";

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
  const controlClass =
    "h-11 rounded-2xl border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]";
  const cardSurfaceClass =
    "rounded-[22px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4";

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
    <WhatsAppPageShell
      title={t("superAdmin.whatsapp.companies.title")}
      description={t("superAdmin.whatsapp.companies.description")}
      icon={Building2}
      eyebrow="Super Admin"
    >
      {error ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={load} variant="outline" className="mt-3 rounded-full">
            <RefreshCw className="size-4" />
            {t("superAdmin.whatsapp.overview.retry")}
          </Button>
        </Alert>
      ) : (
        <>
          <WhatsAppSurfaceCard
            title={t("superAdmin.whatsapp.companies.filtersTitle")}
            description={t("superAdmin.whatsapp.companies.filtersDescription")}
          >
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("superAdmin.whatsapp.companies.searchPlaceholder")}
                  aria-label={t("superAdmin.whatsapp.companies.searchPlaceholder")}
                  className="h-11 rounded-2xl pr-9 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]"
                />
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={controlClass} aria-label={t("superAdmin.whatsapp.companies.statusAll")}>
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
                <SelectTrigger className={controlClass} aria-label={t("superAdmin.whatsapp.companies.notificationsAll")}>
                  <SelectValue placeholder={t("superAdmin.whatsapp.companies.notificationsAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.companies.notificationsAll")}</SelectItem>
                  <SelectItem value="enabled">{t("superAdmin.whatsapp.companies.notificationsEnabled")}</SelectItem>
                  <SelectItem value="disabled">{t("superAdmin.whatsapp.companies.notificationsDisabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </WhatsAppSurfaceCard>

          <WhatsAppSurfaceCard
            title={t("superAdmin.whatsapp.companies.listTitle")}
            description={t("superAdmin.whatsapp.companies.listDescription")}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-[18px]" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {rows.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      {t("superAdmin.whatsapp.companies.empty")}
                    </p>
                  ) : (
                    rows.map((row) => (
                      <div key={row.id} className={cardSurfaceClass}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium text-[color:var(--color-foreground)]">
                              {row.name}
                            </p>
                            <p className="break-words text-xs text-[color:var(--color-muted-foreground)]">
                              {row.email} {row.slug ? `· ${row.slug}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {sl(row.whatsapp.status) || row.whatsapp.status}
                          </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {t("superAdmin.whatsapp.companies.stats.sessions")}
                            </p>
                            <p className="mt-1 font-semibold">
                              {row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {t("superAdmin.whatsapp.companies.stats.notifications")}
                            </p>
                            <p className="mt-1 font-semibold">
                              {row.whatsapp.notificationsEnabled ? t("superAdmin.whatsapp.companies.notificationsEnabled") : t("superAdmin.whatsapp.companies.notificationsDisabled")}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {t("superAdmin.whatsapp.companies.stats.templates")}
                            </p>
                            <p className="mt-1 font-semibold">
                              {row.whatsapp.activeTemplates}/{row.whatsapp.templatesTotal}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {t("superAdmin.whatsapp.companies.stats.failures")}
                            </p>
                            <p className="mt-1 font-semibold">{row.whatsapp.failedLast30Days}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            nativeButton={false}
                            variant="outline"
                            render={
                              <Link
                                to={`/super-admin/whatsapp/companies/${row.id}/settings?tab=sessions`}
                              />
                            }
                            className="flex-1 rounded-full border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_80%,var(--shell-control-bg)_20%)]"
                          >
                            <Smartphone className="size-4" />
                            {t("superAdmin.whatsapp.companies.buttons.linkSession")}
                          </Button>
                          <Button
                            nativeButton={false}
                            variant="outline"
                            render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />}
                            className="rounded-full"
                          >
                            {t("superAdmin.whatsapp.companies.buttons.openWorkspace")}
                          </Button>
                          <Button
                            nativeButton={false}
                            render={
                              <Link
                                to={`/super-admin/whatsapp/companies/${row.id}/notifications`}
                              />
                            }
                            className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
                          >
                            <Settings2 className="size-4" />
                            {t("superAdmin.whatsapp.companies.buttons.notifications")}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.company")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.status")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.sessions")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.notifications")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.templates")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.companies.columns.failures")}</TableHead>
                        <TableHead className="text-left">{t("superAdmin.whatsapp.companies.columns.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            {t("superAdmin.whatsapp.companies.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{row.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {row.email} {row.slug ? `· ${row.slug}` : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-full">
                                {sl(row.whatsapp.status) || row.whatsapp.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}
                            </TableCell>
                            <TableCell>
                              {row.whatsapp.notificationsEnabled ? t("superAdmin.whatsapp.companies.notificationsEnabled") : t("superAdmin.whatsapp.companies.notificationsDisabled")}
                            </TableCell>
                            <TableCell>
                              {row.whatsapp.activeTemplates}/{row.whatsapp.templatesTotal}
                            </TableCell>
                            <TableCell>{row.whatsapp.failedLast30Days}</TableCell>
                            <TableCell className="text-left">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  nativeButton={false}
                                  variant="outline"
                                  render={
                                    <Link
                                      to={`/super-admin/whatsapp/companies/${row.id}/settings?tab=sessions`}
                                    />
                                  }
                                  className="rounded-full"
                                >
                                  <Smartphone className="size-4" />
                                  {t("superAdmin.whatsapp.companies.buttons.linkSession")}
                                </Button>
                                <Button
                                  nativeButton={false}
                                  variant="outline"
                                  render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />}
                                  className="rounded-full"
                                >
                                  {t("superAdmin.whatsapp.companies.buttons.openWorkspace")}
                                </Button>
                                <Button
                                  nativeButton={false}
                                  render={
                                    <Link
                                      to={`/super-admin/whatsapp/companies/${row.id}/notifications`}
                                    />
                                  }
                                  className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
                                >
                                  <Settings2 className="size-4" />
                                  {t("superAdmin.whatsapp.companies.buttons.notifications")}
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
          </WhatsAppSurfaceCard>
        </>
      )}
    </WhatsAppPageShell>
  );
}

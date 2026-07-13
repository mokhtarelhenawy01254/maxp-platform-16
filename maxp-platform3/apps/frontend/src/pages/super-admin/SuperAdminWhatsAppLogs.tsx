import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, RefreshCw, Search } from "lucide-react";

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
  const controlClass =
    "h-11 rounded-2xl border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]";
  const cardSurfaceClass =
    "rounded-[22px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4";

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
    return () => {
      active = false;
    };
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
      setError(t("superAdmin.whatsapp.logs.empty"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, companyId, t]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <WhatsAppPageShell
      title={t("superAdmin.whatsapp.logs.title")}
      description={t("superAdmin.whatsapp.logs.description")}
      icon={Activity}
      eyebrow="Super Admin"
    >
      {error ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={loadLogs} variant="outline" className="mt-3 rounded-full">
            <RefreshCw className="size-4" />
            {t("superAdmin.whatsapp.overview.retry")}
          </Button>
        </Alert>
      ) : (
        <>
          <WhatsAppSurfaceCard title={t("superAdmin.whatsapp.logs.filtersTitle")}>
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("superAdmin.whatsapp.logs.searchPlaceholder")}
                  aria-label={t("superAdmin.whatsapp.logs.searchPlaceholder")}
                  className="h-11 rounded-2xl pr-9 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={controlClass} aria-label={t("superAdmin.whatsapp.logs.statusPlaceholder")}>
                  <SelectValue placeholder={t("superAdmin.whatsapp.logs.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.logs.statusAll")}</SelectItem>
                  <SelectItem value="SENT">SENT</SelectItem>
                  <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                  <SelectItem value="READ">READ</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className={controlClass} aria-label={t("superAdmin.whatsapp.logs.companyPlaceholder")}>
                  <SelectValue placeholder={t("superAdmin.whatsapp.logs.companyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.whatsapp.logs.companyAll")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </WhatsAppSurfaceCard>

          <WhatsAppSurfaceCard
            title={t("superAdmin.whatsapp.logs.listTitle")}
            description={t("superAdmin.whatsapp.logs.listDescription")}
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
                  {logs.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      {t("superAdmin.whatsapp.logs.empty")}
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className={cardSurfaceClass}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full bg-[color:var(--color-primary)] text-white">
                            {log.company.name}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {log.status}
                          </Badge>
                        </div>
                        <p className="mt-3 font-medium text-[color:var(--color-foreground)]">
                          {log.eventType}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                          {log.category}
                        </p>
                        <div className="mt-3 space-y-1 text-sm">
                          <p>{log.recipientPhone}</p>
                          {log.recipientName ? (
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {log.recipientName}
                            </p>
                          ) : null}
                        </div>
                          {log.status === "FAILED" && log.failureReason ? (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400 truncate" title={log.failureReason}>
                              {log.failureReason}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                            {new Date(log.createdAt).toLocaleString("ar-EG")}
                          </p>
                        </div>
                    ))
                  )}
                </div>

                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("superAdmin.whatsapp.logs.columns.company")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.logs.columns.event")}</TableHead>
                         <TableHead>{t("superAdmin.whatsapp.logs.columns.status")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.logs.columns.error")}</TableHead>
                        <TableHead>{t("superAdmin.whatsapp.logs.columns.recipient")}</TableHead>
                        <TableHead className="text-left">{t("superAdmin.whatsapp.logs.columns.time")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            {t("superAdmin.whatsapp.logs.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{log.company.name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{log.eventType}</p>
                                <p className="text-xs text-muted-foreground">{log.category}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-full">
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.status === "FAILED" && log.failureReason ? (
                                <span className="max-w-[200px] truncate block text-xs text-red-600 dark:text-red-400" title={log.failureReason}>
                                  {log.failureReason}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p>{log.recipientPhone}</p>
                                {log.recipientName ? (
                                  <p className="text-xs text-muted-foreground">{log.recipientName}</p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-left">
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
          </WhatsAppSurfaceCard>
        </>
      )}
    </WhatsAppPageShell>
  );
}

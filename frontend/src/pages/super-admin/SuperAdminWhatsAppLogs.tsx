import { useEffect, useState } from "react";
import { Activity, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  company: {
    name: string;
    slug: string | null;
  };
}

export default function SuperAdminWhatsAppLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const controlClass =
    "h-11 rounded-2xl border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]";
  const cardSurfaceClass =
    "rounded-[22px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4";

  useEffect(() => {
    let active = true;

    const loadCompanies = async () => {
      try {
        const response = await apiClient.get("/admin/companies");
        if (active) {
          setCompanies(response.data.data?.companies || []);
        }
      } catch (error) {
        console.error("Error loading companies for WhatsApp logs:", error);
      }
    };

    void loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLogs = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/admin/whatsapp/logs", {
          params: {
            search: search || undefined,
            status: status === "all" ? undefined : status,
            companyId: companyId === "all" ? undefined : companyId,
            scope: "SUPER_ADMIN",
            limit: 100,
          },
        });
        if (active) {
          setLogs(response.data.logs || []);
        }
      } catch (error) {
        console.error("Error loading WhatsApp logs:", error);
        if (active) {
          setLogs([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadLogs();
    return () => {
      active = false;
    };
  }, [companyId, search, status]);

  return (
    <WhatsAppPageShell
      title="سجلات واتساب"
      description="مراقبة رسائل تسجيل الشركات والاشتراك التي تمر عبر مساحة السوبر أدمن فقط."
      icon={Activity}
      eyebrow="Super Admin"
    >
      <WhatsAppSurfaceCard title="فلاتر السجلات">
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالرقم أو المحتوى أو الشركة"
              className="h-11 rounded-2xl pr-9 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="SENT">SENT</SelectItem>
              <SelectItem value="DELIVERED">DELIVERED</SelectItem>
              <SelectItem value="READ">READ</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="الشركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الشركات</SelectItem>
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
        title="سجل onboarding للشركات"
        description="أحدث رسائل تسجيل الشركات والاشتراك الخارجة من نطاق السوبر أدمن."
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
                  لا توجد سجلات مطابقة للفلاتر الحالية.
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
                    <p className="mt-3 text-xs text-[color:var(--color-muted-foreground)]">
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
                    <TableHead>الشركة</TableHead>
                    <TableHead>الحدث</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المستلم</TableHead>
                    <TableHead className="text-left">الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        لا توجد سجلات مطابقة للفلاتر الحالية.
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
    </WhatsAppPageShell>
  );
}

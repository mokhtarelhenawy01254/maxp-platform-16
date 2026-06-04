import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, Settings2, Smartphone } from "lucide-react";

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
  plan: string;
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

const statusLabels: Record<string, string> = {
  connected: "متصل",
  disconnected: "غير متصل",
  "not-configured": "غير مُجهز",
  attention: "يحتاج متابعة",
};

export default function SuperAdminWhatsAppCompanies() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [notifications, setNotifications] = useState("all");
  const controlClass =
    "h-11 rounded-2xl border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]";
  const cardSurfaceClass =
    "rounded-[22px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/admin/whatsapp/companies", {
          params: {
            search: search || undefined,
            status: status === "all" ? undefined : status,
            notifications: notifications === "all" ? undefined : notifications,
            scope: "SUPER_ADMIN",
            limit: 100,
          },
        });
        if (active) {
          setRows(response.data.data || []);
        }
      } catch (error) {
        console.error("Error loading WhatsApp companies:", error);
        if (active) {
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [notifications, search, status]);

  return (
    <WhatsAppPageShell
      title="شركات واتساب"
      description="كل شركة وحالتها في onboarding واتساب، مع مسار واضح لربط السيشن ثم فتح رسائل التسجيل والاشتراك."
      icon={Building2}
      eyebrow="Super Admin"
    >
      <WhatsAppSurfaceCard
        title="فلاتر الشركات"
        description="ابحث بسرعة عن الشركات الجاهزة أو التي تحتاج تدخل."
      >
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو الإيميل أو الـ slug"
              className="h-11 rounded-2xl pr-9 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="حالة واتساب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="connected">متصل</SelectItem>
              <SelectItem value="attention">يحتاج متابعة</SelectItem>
              <SelectItem value="disconnected">غير متصل</SelectItem>
              <SelectItem value="not-configured">غير مُجهز</SelectItem>
            </SelectContent>
          </Select>

          <Select value={notifications} onValueChange={setNotifications}>
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="الإشعارات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="enabled">الإشعارات مفعلة</SelectItem>
              <SelectItem value="disabled">الإشعارات معطلة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </WhatsAppSurfaceCard>

      <WhatsAppSurfaceCard
        title="قائمة الشركات"
        description="افتح أي شركة للتحكم في الجلسات ورسائل تسجيل الشركة والاشتراك."
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
                  لا توجد شركات مطابقة للفلاتر الحالية.
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
                        {statusLabels[row.whatsapp.status] || row.whatsapp.status}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          الجلسات
                        </p>
                        <p className="mt-1 font-semibold">
                          {row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          الإشعارات
                        </p>
                        <p className="mt-1 font-semibold">
                          {row.whatsapp.notificationsEnabled ? "مفعلة" : "معطلة"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          القوالب
                        </p>
                        <p className="mt-1 font-semibold">
                          {row.whatsapp.activeTemplates}/{row.whatsapp.templatesTotal}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_76%,transparent)] px-3 py-2">
                        <p className="text-xs text-[color:var(--color-muted-foreground)]">
                          الفشل
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
                        ربط السيشن
                      </Button>
                      <Button
                        nativeButton={false}
                        variant="outline"
                        render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />}
                        className="rounded-full"
                      >
                        فتح المساحة
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
                        الإشعارات
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
                    <TableHead>الشركة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الجلسات</TableHead>
                    <TableHead>الإشعارات</TableHead>
                    <TableHead>القوالب</TableHead>
                    <TableHead>الفشل</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        لا توجد شركات مطابقة للفلاتر الحالية.
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
                            {statusLabels[row.whatsapp.status] || row.whatsapp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.whatsapp.connectedSessions}/{row.whatsapp.sessionsTotal}
                        </TableCell>
                        <TableCell>
                          {row.whatsapp.notificationsEnabled ? "مفعلة" : "معطلة"}
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
                              ربط السيشن
                            </Button>
                            <Button
                              nativeButton={false}
                              variant="outline"
                              render={<Link to={`/super-admin/whatsapp/companies/${row.id}`} />}
                              className="rounded-full"
                            >
                              فتح المساحة
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
                              الإشعارات
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
    </WhatsAppPageShell>
  );
}

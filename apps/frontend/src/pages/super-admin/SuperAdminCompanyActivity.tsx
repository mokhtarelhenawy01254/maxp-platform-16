import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, RefreshCw, Building2, Activity, Zap, Skull, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../../components/ui/input";

const PAGE_SIZE = 25;

type CompanyActivity = {
  id: string; name: string; email: string; phone: string | null;
  isActive: boolean; createdAt: string; daysSinceCreation: number; status: string;
  metrics: {
    users: number; customers: number; recentOrders: number;
    recentConversations: number; recentAiInteractions: number; hasWhatsApp: boolean;
  };
  lastLogin: string | null; lastActivity: string | null; daysSinceLastActivity: number;
  subscription: { status: string };
};

type Summary = { total: number; active: number; dormant: number; dead: number };

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  dormant: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  dead: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  dormant: "خامل",
  dead: "ميتة",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function daysLabel(days: number) {
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  if (days < 60) return "منذ شهر";
  return `منذ ${Math.floor(days / 30)} شهر`;
}

function SuperAdminCompanyActivity() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">نشاط الشركات</h1>
      <Content />
    </div>
  );
}

function Content() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "company-activity", statusFilter],
    queryFn: async () => {
      const params: any = { status: statusFilter };
      const res = await apiClient.get("/super-admin/company-activity", { params });
      return res.data;
    },
    staleTime: 30_000,
  });

  const summary: Summary | null = data?.summary ?? null;
  const companies: CompanyActivity[] = data?.companies ?? [];

  const filtered = useMemo(() => {
    if (!searchTerm) return companies;
    const q = searchTerm.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [companies, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      const order = { active: 0, dormant: 1, dead: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
        bTime - aTime;
    });
    return list;
  }, [filtered]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>فشل تحميل بيانات نشاط الشركات. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث عن شركة..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الشركات</SelectItem>
            <SelectItem value="active">النشطة</SelectItem>
            <SelectItem value="dormant">الخاملة</SelectItem>
            <SelectItem value="dead">الميتة</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="تحديث">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الشركات</p>
                    <p className="text-2xl font-bold">{summary?.total ?? "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Building2 className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">نشطة</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary?.active ?? "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">خاملة</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary?.dormant ?? "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Zap className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ميتة</p>
                    <p className="text-2xl font-bold text-slate-500">{summary?.dead ?? "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Skull className="size-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">المستخدمون</TableHead>
                  <TableHead className="text-center">العملاء</TableHead>
                  <TableHead className="text-center">الطلبيات (30 يوم)</TableHead>
                  <TableHead className="text-center">المحادثات</TableHead>
                  <TableHead className="text-center">AI</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                  <TableHead>الاشتراك</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      لا توجد شركات
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColors[c.status] || ""}`}>
                          {statusLabels[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{c.metrics.users}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{c.metrics.customers}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{c.metrics.recentOrders}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{c.metrics.recentConversations}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{c.metrics.recentAiInteractions}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {c.lastActivity ? (
                          <span>{formatDate(c.lastActivity)}</span>
                        ) : (
                          <span className="text-slate-400">لا يوجد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.subscription.status === "ACTIVE" ? "فعال" :
                           c.subscription.status === "TRIAL" ? "تجريبي" :
                           c.subscription.status === "CANCELLED" ? "ملغي" :
                           c.subscription.status === "NONE" ? "—" : c.subscription.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronRight className="size-4 ml-1" /> السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page + 1} من {totalPages} ({sorted.length} شركة)
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                التالي <ChevronLeft className="size-4 mr-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SuperAdminCompanyActivity;

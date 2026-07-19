import { useState } from "react";
import { Building2, Sparkles, Clock, AlertTriangle, Users, CheckCircle2, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { tokenManager } from "../../utils/tokenManager";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { formatDate, extractErrorMessage } from "../SuperAdminCompaniesV2/utils";
import { useCompanies, useFollowUpOwners } from "../SuperAdminCompaniesV2/hooks/useCompanies";
import { enrichCompanies, computeQuickStats, getCount } from "../SuperAdminCompaniesV2/utils";
import { CompaniesTable } from "../SuperAdminCompaniesV2/components/CompaniesTable";
import { FOLLOW_UP_SAVED_VIEWS } from "../SuperAdminCompaniesV2/constants";
import { toast } from "sonner";

const VIEW_TABS = FOLLOW_UP_SAVED_VIEWS.filter((v) => v.value !== "ALL");

export default function SuperAdminFollowUp() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("FOLLOW_UP_NOW");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [fbQuery, setFbQuery] = useState("");
  const [fbResults, setFbResults] = useState<import("../SuperAdminCompaniesV2/types").FacebookPageResult[]>([]);
  const [fbSearched, setFbSearched] = useState(false);

  const { companies, isLoading, error, admin, refetch, total, totalPages, meta } = useCompanies({
    search: "", status: "ALL", savedView: activeView,
    page: currentPage, pageSize: 20, sort: "createdAt:desc",
  });

  const enriched = enrichCompanies(companies, admin?.id || null);
  const visibleIds = enriched.map((c) => c.id);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !isAllVisibleSelected;

  const handleOpenWhatsApp = (company: import("../SuperAdminCompaniesV2/types").Company) => {
    const phone = company.phone?.replace(/\s+/g, "").replace(/^0+/, "");
    if (!phone) { toast.error("لا يوجد رقم هاتف"); return; }
    const full = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("20") ? phone : `20${phone}`;
    window.open(`https://wa.me/${full}`, "_blank", "noopener,noreferrer");
  };

  const handleLoginAsAdmin = async (company: import("../SuperAdminCompaniesV2/types").Company) => {
    try {
      const res = await apiClient.post(`/admin/companies/${company.id}/login-as-admin`);
      if (res.data?.success) {
        const superToken = tokenManager.getAccessToken();
        if (superToken) localStorage.setItem("superAuth", superToken);
        const u = localStorage.getItem("user");
        if (u) localStorage.setItem("superUser", u);
        tokenManager.setAccessToken(res.data.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.data.user));
        window.location.href = "/company-dashboard";
      } else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
  };

  const handleRunFollowUpAction = async (company: import("../SuperAdminCompaniesV2/types").Company, action: "remind" | "escalate") => {
    try {
      const payload = action === "remind" ? { markReminderSent: true } : { markEscalated: true };
      const res = await apiClient.put(`/admin/companies/${company.id}/follow-up`, payload);
      if (res.data?.success) { toast.success(action === "remind" ? "تم تسجيل التذكير" : "تم تسجيل التصعيد"); refetch(); }
      else toast.error(res.data?.message || "فشل");
    } catch (err) { toast.error(extractErrorMessage(err, "فشل")); }
  };

  return (
    <div dir="rtl" className="min-h-full pb-6">
      <div className="flex w-full flex-col gap-1.5 p-1 md:p-1.5">
        <Card className="rounded-lg bg-white shadow-sm ring-0 dark:bg-card">
          <CardHeader className="p-2 pb-0 md:p-3 md:pb-0">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="size-2.5" />
                  </div>
                  <Badge variant="outline" className="h-5 rounded-full border-primary/20 bg-primary/5 px-2 text-[11px] font-black uppercase tracking-widest text-primary">
                    <Sparkles className="ml-1 size-2" /> مركز المتابعة
                  </Badge>
                  <span className="text-[11px] font-bold text-muted-foreground/50">{formatDate(new Date().toISOString())}</span>
                </div>
                <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
                  متابعة <span className="text-primary">الشركات</span>
                </h1>
                <CardDescription className="text-sm text-muted-foreground/60">
                  إدارة ومتابعة حالات الشركات — تذكيرات، تصعيد، واتصالات.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-lg border-border/60 px-4 text-[13px] font-black" onClick={() => navigate("/super-admin/companies-v2")}>
                  <ArrowLeft className="ml-1.5 size-3.5" /> العودة للشركات
                </Button>
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-2">
                  <span className="text-[13px] font-black text-foreground">{total} شركة</span>
                </div>
              </div>
            </div>

            {/* View tabs */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {VIEW_TABS.map((view) => (
                <button
                  key={view.value}
                  type="button"
                  onClick={() => { setActiveView(view.value); setCurrentPage(1); }}
                  className={`rounded-lg px-3.5 py-2 text-xs font-black transition-all ${
                    activeView === view.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 space-y-1.5 md:p-3 md:pt-0">
            {error ? (
              <Alert variant="destructive" className="rounded-xl border-destructive/30 bg-white dark:bg-card/90">
                <AlertTriangle className="size-4" />
                <AlertTitle>تعذر التحميل</AlertTitle>
                <AlertDescription>{(error as Error).message}</AlertDescription>
              </Alert>
            ) : null}

            <CompaniesTable
              companies={enriched}
              totalPages={totalPages}
              currentPage={Math.min(currentPage, totalPages)}
              onPageChange={setCurrentPage}
              pageSize={20}
              totalItems={total}
              selectedIds={selectedIds}
              onToggleSelect={(id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
              onToggleSelectAll={(checked) => {
                if (checked) setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
                else setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
              }}
              isAllVisibleSelected={isAllVisibleSelected}
              isSomeVisibleSelected={isSomeVisibleSelected}
              loading={isLoading}
              onOpenDetails={(c) => navigate(`/super-admin/companies/${c.id}`)}
              onEdit={() => {}}
              onDelete={() => {}}
              onOpenUsers={() => {}}
              onOpenFollowUp={() => {}}
              onOpenFacebookPages={() => {}}
              onOpenWhatsApp={handleOpenWhatsApp}
              onTransferOwnership={() => {}}
              onAddEmployee={() => {}}
              onLoginAsAdmin={handleLoginAsAdmin}
              onRunFollowUpAction={handleRunFollowUpAction}
              isMobile={isMobile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

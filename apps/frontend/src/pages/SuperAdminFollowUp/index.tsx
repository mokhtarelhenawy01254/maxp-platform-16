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
import { tToast } from "../../utils/i18n-toast";

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
    if (!phone) { tToast.error("index.msg_f7bf"); return; }
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
    <div dir="rtl" className="w-full space-y-4">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Building2 className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                مركز متابعة الشركات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {total} شركة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              إدارة ومتابعة حالات الشركات — تذكيرات، تصعيد، واتصالات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/super-admin/companies-v2")}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <ArrowLeft className="size-3.5" />
            <span>العودة للشركات</span>
          </Button>
        </div>
      </div>

      {/* Segmented Pill Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-1 overflow-x-auto no-scrollbar">
        {VIEW_TABS.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => { setActiveView(view.value); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeView === view.value
                ? "bg-muted text-foreground font-semibold shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error ? (
        <Alert variant="destructive" className="rounded-xl border-destructive/30">
          <AlertTriangle className="size-4" />
          <AlertTitle>تعذر التحميل</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : null}

      {/* Single Chassis Table */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
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
      </div>
    </div>
  );
}

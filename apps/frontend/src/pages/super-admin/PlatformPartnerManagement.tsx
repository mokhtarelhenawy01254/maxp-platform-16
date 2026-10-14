import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { toast } from "sonner";
import { TrendingUp, RefreshCw } from "lucide-react";
import { PlatformPartnerSettingsTab } from "./PlatformPartnerSettingsTab";
import { PlatformPartnersTable } from "./PlatformPartnersTable";
import { PlatformPartnerPayoutsTable } from "./PlatformPartnerPayoutsTable";
import {
  PartnerRankDialog,
  PartnerRateDialog,
  PartnerPayoutDialog,
} from "./PlatformPartnerDialogs";

export default function PlatformPartnerManagement() {
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    level1Rate: 20,
    level2Rate: 5,
    level3Rate: 3,
    level4Rate: 1,
    minimumPayoutAmount: 100,
    termsAndConditions: "",
  });
  const [rankDialogOpen, setRankDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [payoutStatus, setPayoutStatus] = useState("COMPLETED");

  useEffect(() => {
    void fetchData(true);
  }, [activeTab]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const [statsRes, partnersRes, payoutsRes, settingsRes] = await Promise.all([
        apiClient.get("/platform-partners/admin/stats"),
        apiClient.get("/platform-partners/admin/partners"),
        apiClient.get("/platform-partners/admin/payouts"),
        apiClient.get("/platform-partners/admin/settings"),
      ]);

      if (statsRes.data.status === "success") setStats(statsRes.data.data.stats);
      if (partnersRes.data.status === "success") setPartners(partnersRes.data.data.partners || []);
      if (payoutsRes.data.status === "success") setPayouts(payoutsRes.data.data.payouts || []);
      if (settingsRes.data.status === "success") {
        const s = settingsRes.data.data.settings;
        setSettingsForm({
          level1Rate: s.level1Rate ?? 20,
          level2Rate: s.level2Rate ?? 5,
          level3Rate: s.level3Rate ?? 3,
          level4Rate: s.level4Rate ?? 1,
          minimumPayoutAmount: Number(s.minimumPayoutAmount ?? 100),
          termsAndConditions: s.termsAndConditions || "",
        });
      }
    } catch {
      toast.error("فشل في تحميل بيانات برنامج الشركاء");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const r = await apiClient.put("/platform-partners/admin/settings", settingsForm);
      if (r.data.status === "success") {
        toast.success("تم حفظ إعدادات الشركاء بنجاح");
        void fetchData(false);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateRank = async () => {
    if (!selectedPartner || !newTitle) return;
    try {
      const r = await apiClient.put(
        `/platform-partners/admin/partners/${selectedPartner.id}/title`,
        { title: newTitle },
      );
      if (r.data.status === "success") {
        toast.success("تم تحديث رتبة الشريك بنجاح");
        setRankDialogOpen(false);
        void fetchData(false);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل تحديث الرتبة");
    }
  };

  const handleUpdateRate = async () => {
    if (!selectedPartner) return;
    const val = newRate === "" ? null : Number(newRate);
    if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
      toast.error("النسبة يجب أن تكون بين 0 و 100");
      return;
    }
    try {
      const r = await apiClient.put(
        `/platform-partners/admin/partners/${selectedPartner.id}/commission-rate`,
        { rate: val },
      );
      if (r.data.status === "success") {
        toast.success("تم تحديث نسبة العمولة المخصصة بنجاح");
        setRateDialogOpen(false);
        void fetchData(false);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل حفظ النسبة");
    }
  };

  const handleUpdatePayout = async () => {
    if (!selectedPayout) return;
    try {
      const r = await apiClient.put(
        `/platform-partners/admin/payouts/${selectedPayout.id}/status`,
        { status: payoutStatus },
      );
      if (r.data.status === "success") {
        toast.success("تم تحديث حالة طلب السحب بنجاح");
        setPayoutDialogOpen(false);
        void fetchData(false);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل تحديث طلب السحب");
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>جاري تحميل بيانات برنامج الشركاء والعمولات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              إدارة برنامج الشركاء
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {stats?.totalPartners || partners.length} شريك
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة أداء الشركاء، مراجعة طلبات سحب الأرباح، وضبط نِسَب العمولات المنصية
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchData(false)}
          disabled={refreshing}
          className="h-8 px-2.5 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98] self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي العمولات الموزعة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {formatPrice(stats?.totalCommissionsDistributed || 0)}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي الشركاء</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {stats?.totalPartners || partners.length}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">سحوبات قيد الانتظار</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
              {formatPrice(stats?.totalPendingPayouts || 0)}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">الشركات المسجلة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {stats?.activeCompaniesCount || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Chassis Tabs */}
        <div className="p-2 border-b border-border/60 bg-muted/20 flex items-center gap-1">
          {["قائمة الشركاء", "طلبات سحب الأرباح", "إعدادات العمولات والنسب"].map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                activeTab === i
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 0: Partners Table */}
        {activeTab === 0 && (
          <PlatformPartnersTable
            partners={partners}
            formatPrice={formatPrice}
            onEditRank={(partner) => {
              setSelectedPartner(partner);
              setNewTitle(partner.title || "PARTNER");
              setRankDialogOpen(true);
            }}
            onEditRate={(partner) => {
              setSelectedPartner(partner);
              setNewRate(partner.customCommissionRate != null ? String(partner.customCommissionRate) : "");
              setRateDialogOpen(true);
            }}
          />
        )}

        {/* Tab 1: Payout Requests Table */}
        {activeTab === 1 && (
          <PlatformPartnerPayoutsTable
            payouts={payouts}
            formatPrice={formatPrice}
            onEditPayout={(payout) => {
              setSelectedPayout(payout);
              setPayoutStatus(payout.status || "COMPLETED");
              setPayoutDialogOpen(true);
            }}
          />
        )}

        {/* Tab 2: Settings Tab */}
        {activeTab === 2 && (
          <PlatformPartnerSettingsTab
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            savingSettings={savingSettings}
            onSave={handleSaveSettings}
          />
        )}
      </div>

      <PartnerRankDialog
        open={rankDialogOpen}
        onOpenChange={setRankDialogOpen}
        selectedPartner={selectedPartner}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        onSave={handleUpdateRank}
      />

      <PartnerRateDialog
        open={rateDialogOpen}
        onOpenChange={setRateDialogOpen}
        selectedPartner={selectedPartner}
        newRate={newRate}
        setNewRate={setNewRate}
        onSave={handleUpdateRate}
      />

      <PartnerPayoutDialog
        open={payoutDialogOpen}
        onOpenChange={setPayoutDialogOpen}
        selectedPayout={selectedPayout}
        payoutStatus={payoutStatus}
        setPayoutStatus={setPayoutStatus}
        formatPrice={formatPrice}
        onSave={handleUpdatePayout}
      />
    </div>
  );
}
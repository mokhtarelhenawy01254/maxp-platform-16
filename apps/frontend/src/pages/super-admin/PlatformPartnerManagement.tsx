import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { toast } from "sonner";
import {
  Edit,
  Info,
  TrendingUp,
  Users,
  Wallet,
  History,
  Landmark,
  Settings,
  Save,
  Percent,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

const PlatformPartnerManagement = () => {
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<any>(null);
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
    fetchData(true);
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
        setSettings(s);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "PENDING":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border/60";
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
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <TrendingUp className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                إدارة برنامج الشركاء
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats?.totalPartners || partners.length} شريك
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة أداء الشركاء، مراجعة طلبات سحب الأرباح، وضبط نِسَب العمولات المنصية
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(false)}
          disabled={refreshing}
          className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي العمولات الموزعة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {formatPrice(stats?.totalCommissionsDistributed || 0)}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الشركاء المسجلين</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats?.totalPartners || partners.length}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مدفوعات معلقة بانتظار السحب</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatPrice(stats?.totalPendingPayouts || 0)}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات المسجلة عبر الشركاء</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats?.activeCompaniesCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        {/* Chassis Tabs */}
        <div className="p-2 border-b border-border/60 bg-muted/20 flex items-center gap-1">
          {["قائمة الشركاء", "طلبات سحب الأرباح", "إعدادات العمولات والنسب"].map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === i
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 0: Partners Table */}
        {activeTab === 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10 text-[11px] font-mono">
                <TableRow>
                  <TableHead className="font-semibold">الشريك</TableHead>
                  <TableHead className="font-semibold">اللقب والمستوى</TableHead>
                  <TableHead className="font-semibold">إجمالي الأرباح</TableHead>
                  <TableHead className="font-semibold">الرصيد المتاح</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-12 text-center text-muted-foreground">
                      لا يوجد شركاء مسجلون حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  partners.map((partner) => (
                    <TableRow key={partner.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7.5 bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                            <AvatarFallback>
                              {partner.user?.firstName?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {partner.user?.firstName} {partner.user?.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {partner.partnerCode || partner.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-foreground border border-border/40">
                          {partner.title || "PARTNER"}
                        </span>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {partner.customCommissionRate != null
                            ? `نسبة مخصصة: ${partner.customCommissionRate}%`
                            : "النسبة العامة للمنصة"}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono tabular-nums text-xs font-semibold">
                        {formatPrice(partner.totalEarnings || 0)}
                      </TableCell>

                      <TableCell className="font-mono tabular-nums text-xs font-semibold text-primary">
                        {formatPrice(partner.pendingEarnings || 0)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(
                            partner.status,
                          )}`}
                        >
                          {partner.status || "ACTIVE"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                            title="تعديل الرتبة"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setNewTitle(partner.title || "PARTNER");
                              setRankDialogOpen(true);
                            }}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                            title="نسبة عمولة مخصصة"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setNewRate(
                                partner.customCommissionRate != null
                                  ? String(partner.customCommissionRate)
                                  : "",
                              );
                              setRateDialogOpen(true);
                            }}
                          >
                            <Percent className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 1: Payout Requests Table */}
        {activeTab === 1 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10 text-[11px] font-mono">
                <TableRow>
                  <TableHead className="font-semibold">الشريك</TableHead>
                  <TableHead className="font-semibold">المبلغ المطلوب</TableHead>
                  <TableHead className="font-semibold">طريقة التحويل والبيانات</TableHead>
                  <TableHead className="font-semibold">تاريخ الطلب</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                  <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-12 text-center text-muted-foreground">
                      لا توجد طلبات سحب حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <p className="text-xs font-semibold text-foreground">
                          {payout.partner?.user?.firstName} {payout.partner?.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {payout.partner?.partnerCode}
                        </p>
                      </TableCell>

                      <TableCell className="font-mono tabular-nums text-xs font-bold text-rose-600 dark:text-rose-400">
                        {formatPrice(payout.amount || 0)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Landmark className="size-3.5 text-muted-foreground" />
                          <span>{payout.method}</span>
                          {payout.accountNumber && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              ({payout.accountNumber})
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {new Date(payout.createdAt || Date.now()).toLocaleDateString("ar-EG")}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(
                            payout.status,
                          )}`}
                        >
                          {payout.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        {payout.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setPayoutDialogOpen(true);
                            }}
                          >
                            <Edit className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab 2: Settings */}
        {activeTab === 2 && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">إعدادات برنامج ونِسَب الشركاء</h2>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                تحديد نِسَب العمولات يؤثر مباشرة على جميع عمليات الاشتراك والتجديد الجديدة فور الحفظ.
                المدفوعات والعمولات المحسوبة مسبقاً لن تتأثر.
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">نِسَب العمولات لمستويات الإحالة (Tier System)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { key: "level1Rate", label: "المستوى الأول (L1)", desc: "الشريك المباشر" },
                  { key: "level2Rate", label: "المستوى الثاني (L2)", desc: "رتبة Senior Partner" },
                  { key: "level3Rate", label: "المستوى الثالث (L3)", desc: "رتبة Master Partner" },
                  { key: "level4Rate", label: "المستوى الرابع (L4)", desc: "رتبة Executive" },
                ].map((level) => (
                  <div key={level.key} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <p className="text-xs font-semibold text-foreground">{level.label}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">{level.desc}</p>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={settingsForm[level.key as keyof typeof settingsForm]}
                        onChange={(e) =>
                          setSettingsForm((p) => ({ ...p, [level.key]: Number(e.target.value) }))
                        }
                        min={0}
                        max={100}
                        step={0.5}
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-xs font-semibold text-foreground mb-1 block">الحد الأدنى لطلب السحب</Label>
                <div className="flex items-center gap-1.5 max-w-xs">
                  <Input
                    type="number"
                    value={settingsForm.minimumPayoutAmount}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        minimumPayoutAmount: Number(e.target.value),
                      }))
                    }
                    min={0}
                    step={10}
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-xs text-muted-foreground font-mono">ج.م</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground mb-1 block">الشروط والأحكام</Label>
                <Textarea
                  value={settingsForm.termsAndConditions}
                  onChange={(e) =>
                    setSettingsForm((p) => ({ ...p, termsAndConditions: e.target.value }))
                  }
                  rows={2}
                  className="text-xs"
                  placeholder="أدخل شروط وأحكام برنامج الشركاء هنا..."
                />
              </div>
            </div>

            <Button
              className="h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 active:scale-[0.98] transition-transform"
              disabled={savingSettings}
              onClick={async () => {
                try {
                  setSavingSettings(true);
                  const r = await apiClient.put("/platform-partners/admin/settings", settingsForm);
                  if (r.data.status === "success") {
                    toast.success("تم حفظ إعدادات الشركاء بنجاح");
                    fetchData(false);
                  }
                } catch (e: any) {
                  toast.error(e.response?.data?.message || "فشل حفظ الإعدادات");
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              {savingSettings ? <LoadingSpinner size="sm" /> : <Save className="size-3.5" />}
              <span>حفظ الإعدادات</span>
            </Button>
          </div>
        )}
      </div>

      {/* Rank Dialog */}
      <Dialog open={rankDialogOpen} onOpenChange={setRankDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">تعديل رتبة الشريك</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Select value={newTitle} onValueChange={setNewTitle}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="اختر الرتبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTNER">Partner (شريك)</SelectItem>
                <SelectItem value="SENIOR_PARTNER">Senior Partner (شريك متقدم)</SelectItem>
                <SelectItem value="EXECUTIVE_PARTNER">Executive Partner (شريك تنفيذي)</SelectItem>
                <SelectItem value="REGIONAL_DIRECTOR">Regional Director (مدير إقليمي)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              الرتبة تحدد تلقائياً عمق مستويات العمولات المستحقة في شجرة الإحالة.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRankDialogOpen(false)} className="text-xs">
              إلغاء
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={async () => {
                if (!selectedPartner || !newTitle) return;
                try {
                  const r = await apiClient.put(
                    `/platform-partners/admin/partners/${selectedPartner.id}/title`,
                    { title: newTitle },
                  );
                  if (r.data.status === "success") {
                    toast.success("تم تحديث رتبة الشريك بنجاح");
                    setRankDialogOpen(false);
                    fetchData(false);
                  }
                } catch (e: any) {
                  toast.error(e.response?.data?.message || "فشل تحديث الرتبة");
                }
              }}
            >
              حفظ الرتبة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Commission Rate Dialog */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              نسبة عمولة مخصصة — {selectedPartner?.user?.firstName} {selectedPartner?.user?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
              اترك الحقل فارغاً لاستخدام النسبة العامة للمستوى الأول. تطبق النسبة المخصصة على كل اشتراك جديد يجلبه هذا الشريك.
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">نسبة المستوى الأول (L1) %</Label>
              <div className="flex items-center gap-1.5 max-w-xs">
                <Input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  min={0}
                  max={100}
                  step={0.5}
                  placeholder="مثال: 30"
                  className="h-8 text-xs font-mono"
                />
                <span className="text-xs font-mono text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRateDialogOpen(false)} className="text-xs">
              إلغاء
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={async () => {
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
                    fetchData(false);
                  }
                } catch (e: any) {
                  toast.error(e.response?.data?.message || "فشل حفظ النسبة");
                }
              }}
            >
              حفظ النسبة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformPartnerManagement;
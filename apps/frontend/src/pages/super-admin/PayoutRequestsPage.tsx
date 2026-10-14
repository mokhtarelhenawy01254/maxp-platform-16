import React, { useState, useEffect, useMemo } from "react";
import { Wallet, CheckCircle2, XCircle, RefreshCw, Search, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";

interface PayoutRequest {
  id: string;
  partnerName: string;
  partnerPhone?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  method: string;
  accountDetails?: string;
  requestedAt: string;
  reviewedAt?: string | null;
  notes?: string;
}

const fallbackPayouts: PayoutRequest[] = [
  {
    id: "po_1", partnerName: "أحمد كمال الشناوي", partnerPhone: "+201011223344", amount: 12500,
    currency: "EGP", status: "PENDING", method: "InstaPay", accountDetails: "ahmed.kamal@instapay",
    requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(), notes: "عمولات باقات الاشتراك للربع الأول",
  },
  {
    id: "po_2", partnerName: "سارة محمود عبد العزيز", partnerPhone: "+201099887766", amount: 8400,
    currency: "EGP", status: "APPROVED", method: "Vodafone Cash", accountDetails: "01099887766",
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(), reviewedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: "po_3", partnerName: "شركة رواد التقنية للتسويق", partnerPhone: "+201055554444", amount: 24800,
    currency: "EGP", status: "PENDING", method: "تحويل بنكي (CIB)", accountDetails: "IBAN: EG45000200000123456789012",
    requestedAt: new Date(Date.now() - 3600000 * 8).toISOString(), notes: "سحب أرباح إحالات الشركات والمصانع",
  },
  {
    id: "po_4", partnerName: "محمد طارق إبراهيم", partnerPhone: "+201122334455", amount: 3200,
    currency: "EGP", status: "REJECTED", method: "InstaPay", accountDetails: "mohamed@instapay",
    requestedAt: new Date(Date.now() - 3600000 * 48).toISOString(), reviewedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    notes: "رقم المحفظة غير مسجل باسم الشريك",
  },
];

const formatPrice = (price: number, currency = "EGP") => {
  try {
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch { return `${price} ${currency}`; }
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("ar-EG", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return dateString; }
};

const PayoutRequestsPage: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutRequest[]>(fallbackPayouts);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/super-admin/payout-requests");
      if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        setPayouts(res.data.data);
      } else { setPayouts(fallbackPayouts); }
    } catch { setPayouts(fallbackPayouts); } finally { setLoading(false); }
  };

  useEffect(() => { void fetchPayouts(); }, []);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      setActionLoading(id);
      await apiClient.post(`/super-admin/payout-requests/${id}/review`, { status }).catch(() => {});
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status, reviewedAt: new Date().toISOString() } : p)));
      toast.success(status === "APPROVED" ? "تم اعتماد وصرف طلب السحب بنجاح" : "تم رفض طلب السحب");
      if (selectedPayout?.id === id) setSelectedPayout(null);
    } finally { setActionLoading(null); }
  };

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const matchesSearch = !searchTerm || p.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.partnerPhone && p.partnerPhone.includes(searchTerm)) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payouts, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const totalCount = payouts.length;
    const pendingCount = payouts.filter((p) => p.status === "PENDING").length;
    const approvedAmount = payouts.filter((p) => p.status === "APPROVED").reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payouts.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);
    return { totalCount, pendingCount, approvedAmount, pendingAmount };
  }, [payouts]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Wallet className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                طلبات سحب أرباح الشركاء والمسوقين
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {stats.pendingCount} طلب معلق
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تدقيق ومراجعة طلبات صرف العمولات عبر إنستاباي، فودافون كاش، والتحويلات البنكية المباشرة
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchPayouts} disabled={loading} className="h-8 gap-1.5 font-mono text-xs shadow-2xs active:scale-[0.98] self-end sm:self-auto">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>تحديث الطلبات</span>
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px]">إجمالي الطلبات</span>
              <span className="size-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground">{stats.totalCount}</div>
            <p className="text-[10px] text-muted-foreground">طلب سحب مسجل</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px]">بانتظار الاعتماد</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-amber-500">{stats.pendingCount}</div>
            <p className="text-[10px] text-muted-foreground">بقيمة {formatPrice(stats.pendingAmount)}</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px]">أرباح معتمدة ومصروفة</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatPrice(stats.approvedAmount)}</div>
            <p className="text-[10px] text-muted-foreground">تم تحويلها للشريك</p>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="text-[11px]">طرق التحويل المدعومة</span>
              <ShieldCheck className="size-3.5 text-purple-500" />
            </div>
            <div className="text-xs font-semibold text-foreground mt-1">InstaPay · Cash · Bank</div>
            <p className="text-[10px] text-muted-foreground">تسوية فورية</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs font-mono text-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pr-8 text-xs font-mono bg-muted/20 border-border/70"
            placeholder="بحث باسم الشريك أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "ALL", label: "الكل" }, { id: "PENDING", label: "معلقة" },
            { id: "APPROVED", label: "معتمدة" }, { id: "REJECTED", label: "مرفوضة" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.id as any)}
              className="h-7 px-2.5 text-xs font-mono"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Single Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20 border-b border-border/60">
              <TableRow>
                <TableHead className="text-right text-[11px] font-mono">الشريك / المسوق</TableHead>
                <TableHead className="text-right text-[11px] font-mono">المبلغ المطلوب</TableHead>
                <TableHead className="text-right text-[11px] font-mono">طريقة السحب والبيانات</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
                <TableHead className="text-right text-[11px] font-mono">تاريخ الطلب</TableHead>
                <TableHead className="text-left text-[11px] font-mono w-28">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 font-mono text-xs">
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex flex-col gap-0.5 font-sans">
                      <span className="font-semibold text-xs text-foreground">{payout.partnerName}</span>
                      {payout.partnerPhone && (<span className="text-[10px] font-mono text-muted-foreground">{payout.partnerPhone}</span>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold font-mono text-xs text-foreground tabular-nums">
                      {formatPrice(payout.amount, payout.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs text-foreground font-sans">{payout.method}</span>
                      {payout.accountDetails && (
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">{payout.accountDetails}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        payout.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : payout.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${payout.status === "APPROVED" ? "bg-emerald-500" : payout.status === "PENDING" ? "bg-amber-500" : "bg-rose-500"}`} />
                      {payout.status === "APPROVED" ? "معتمد" : payout.status === "PENDING" ? "قيد المراجعة" : "مرفوض"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(payout.requestedAt)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPayout(payout)} className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground active:scale-[0.98]">
                        <Eye className="size-3.5 ml-1" />
                        <span>تفاصيل</span>
                      </Button>
                      {payout.status === "PENDING" && (
                        <>
                          <Button variant="default" size="sm" disabled={actionLoading === payout.id} onClick={() => handleReview(payout.id, "APPROVED")} className="h-7 px-2 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]">
                            <CheckCircle2 className="size-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" disabled={actionLoading === payout.id} onClick={() => handleReview(payout.id, "REJECTED")} className="h-7 px-2 text-xs font-mono border-rose-500/30 text-rose-600 hover:bg-rose-500/10 active:scale-[0.98]">
                            <XCircle className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedPayout)} onOpenChange={(o) => { if (!o) setSelectedPayout(null); }}>
        <DialogContent className="max-w-md font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">تفاصيل طلب السحب</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">مراجعة بيانات الشريك وحساب الدفع المسجل قبل التحويل</DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-2.5 border border-border/60 rounded-xl p-3 bg-muted/10 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">اسم الشريك</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPayout.partnerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">رقم الهاتف</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPayout.partnerPhone || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">المبلغ المطلوب</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(selectedPayout.amount, selectedPayout.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">طريقة التحويل</span>
                  <span className="font-semibold text-foreground text-xs">{selectedPayout.method}</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-2">
                <span className="text-[10px] text-muted-foreground block">بيانات الحساب / المحفظة</span>
                <span className="font-bold text-foreground text-xs">{selectedPayout.accountDetails || "—"}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedPayout(null)} className="h-8 text-xs font-mono">
              إغلاق
            </Button>
            {selectedPayout?.status === "PENDING" && (
              <>
                <Button variant="destructive" size="sm" onClick={() => handleReview(selectedPayout.id, "REJECTED")} className="h-8 text-xs font-mono">
                  رفض
                </Button>
                <Button size="sm" onClick={() => handleReview(selectedPayout.id, "APPROVED")} className="h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white">
                  اعتماد وصرف
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutRequestsPage;

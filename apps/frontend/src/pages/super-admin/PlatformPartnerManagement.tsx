import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Edit, Info, TrendingUp, Users, Wallet, History, Landmark, Settings, Save, Percent } from "lucide-react";

const PlatformPartnerManagement = () => {
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [partners, setPartners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ level1Rate: 20, level2Rate: 5, level3Rate: 3, level4Rate: 1, minimumPayoutAmount: 100, termsAndConditions: "" });
  const [rankDialogOpen, setRankDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutStatus, setPayoutStatus] = useState("COMPLETED");

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    try { setLoading(true); const [statsRes, partnersRes, payoutsRes, settingsRes] = await Promise.all([apiClient.get("/platform-partners/admin/stats"), apiClient.get("/platform-partners/admin/partners"), apiClient.get("/platform-partners/admin/payouts"), apiClient.get("/platform-partners/admin/settings")]); if (statsRes.data.status === "success") setStats(statsRes.data.data.stats); if (partnersRes.data.status === "success") setPartners(partnersRes.data.data.partners); if (payoutsRes.data.status === "success") setPayouts(payoutsRes.data.data.payouts); if (settingsRes.data.status === "success") { const s = settingsRes.data.data.settings; setSettings(s); setSettingsForm({ level1Rate: s.level1Rate, level2Rate: s.level2Rate, level3Rate: s.level3Rate, level4Rate: s.level4Rate, minimumPayoutAmount: Number(s.minimumPayoutAmount), termsAndConditions: s.termsAndConditions || "" }); } } catch { tToast.error("PlatformPartnerManagement.error_load_1fe0"); } finally { setLoading(false); }
  };

  const getStatusColor = (status: string) => { switch (status) { case "ACTIVE": return "success"; case "PENDING": return "warning"; case "COMPLETED": return "success"; case "REJECTED": return "destructive"; default: return "outline"; } };

  if (loading && !stats) return <div className="flex justify-center items-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-1"><h1 className="text-2xl font-black mb-4 text-foreground">إدارة برنامج الشركاء</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[{ label: "إجمالي العمولات", value: formatPrice(stats?.totalCommissionsDistributed || 0), icon: <Wallet className="size-5" />, colorClass: "text-emerald-500 bg-emerald-500/20" }, { label: "إجمالي الشركاء", value: stats?.totalPartners || 0, icon: <Users className="size-5" />, colorClass: "text-blue-500 bg-blue-500/20" }, { label: "مدفوعات معلقة", value: formatPrice(stats?.totalPendingPayouts || 0), icon: <History className="size-5" />, colorClass: "text-amber-500 bg-amber-500/20" }, { label: "نمو الشبكة", value: stats?.activeCompaniesCount || 0, icon: <TrendingUp className="size-5" />, colorClass: "text-purple-500 bg-purple-500/20" }].map((stat, i) => <Card key={i} className="rounded-xl shadow-sm dark:shadow-lg bg-card"><CardContent className="p-3"><div className="flex justify-between items-center"><div><p className="text-xs mb-1 text-muted-foreground">{stat.label}</p><p className="text-lg font-black">{stat.value}</p></div><div className={`size-14 rounded-full flex items-center justify-center ${stat.colorClass}`}>{stat.icon}</div></div></CardContent></Card>)}
      </div>

      <div className="rounded-xl overflow-hidden mb-4 bg-card shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.4)]">
        <div className="flex border-b px-2 pt-2 gap-0">
          {["الشركاء", "طلبات السحب", "الإعدادات"].map((tab, i) => <button key={tab} onClick={() => setActiveTab(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{tab}</button>)}
        </div>

        {activeTab === 0 && <Table><TableHeader className="bg-muted/50 dark:bg-white/[0.02]"><TableRow><TableHead className="font-bold">الشريك</TableHead><TableHead className="font-bold">اللقب (Rank)</TableHead><TableHead className="font-bold">إجمالي الأرباح</TableHead><TableHead className="font-bold">الرصيد المتاح</TableHead><TableHead className="font-bold">الحالة</TableHead><TableHead className="text-center font-bold">الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{partners.map(partner => <TableRow key={partner.id}><TableCell><div className="flex items-center gap-2"><Avatar className="bg-blue-500"><AvatarFallback>{partner.user?.firstName?.charAt(0)}</AvatarFallback></Avatar><div><p className="text-sm font-bold">{partner.user?.firstName} {partner.user?.lastName}</p><p className="text-xs text-muted-foreground">{partner.partnerCode}</p></div></div></TableCell><TableCell><Badge className="font-bold rounded">{partner.title}</Badge><div className="text-xs text-muted-foreground mt-1">{partner.customCommissionRate != null ? `نسبة مخصصة: ${partner.customCommissionRate}%` : "النسبة العامة"}</div></TableCell><TableCell>{formatPrice(partner.totalEarnings)}</TableCell><TableCell className="text-blue-500 font-bold">{formatPrice(partner.pendingEarnings)}</TableCell><TableCell><Badge variant={getStatusColor(partner.status)}>{partner.status}</Badge></TableCell><TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" title="تعديل اللقب" onClick={() => { setSelectedPartner(partner); setNewTitle(partner.title); setRankDialogOpen(true); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon" title="نسبة عمولة مخصصة" onClick={() => { setSelectedPartner(partner); setNewRate(partner.customCommissionRate != null ? String(partner.customCommissionRate) : ""); setRateDialogOpen(true); }}><Percent className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}

        {activeTab === 1 && <Table><TableHeader className="bg-muted/50 dark:bg-white/[0.02]"><TableRow><TableHead className="font-bold">الشريك</TableHead><TableHead className="font-bold">المبلغ</TableHead><TableHead className="font-bold">الطريقة</TableHead><TableHead className="font-bold">التاريخ</TableHead><TableHead className="font-bold">الحالة</TableHead><TableHead className="text-center font-bold">الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{payouts.map(payout => <TableRow key={payout.id}><TableCell><p className="text-sm font-bold">{payout.partner?.user?.firstName} {payout.partner?.user?.lastName}</p><p className="text-xs text-muted-foreground">{payout.partner?.partnerCode}</p></TableCell><TableCell className="font-bold text-red-500">{formatPrice(payout.amount)}</TableCell><TableCell><div className="flex items-center gap-1"><Landmark className="size-4 text-muted-foreground" /><span className="text-sm">{payout.method}</span></div></TableCell><TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell><TableCell><Badge variant={getStatusColor(payout.status)}>{payout.status}</Badge></TableCell><TableCell className="text-center">{payout.status === "PENDING" && <Button variant="ghost" size="icon" onClick={() => { setSelectedPayout(payout); setPayoutDialogOpen(true); }}><Edit className="size-4" /></Button>}</TableCell></TableRow>)}</TableBody></Table>}

        {activeTab === 2 && <div className="p-4">
          <div className="flex items-center gap-2 mb-3"><Settings className="size-5 text-purple-500" /><h2 className="text-base font-bold">إعدادات برنامج الشركاء</h2></div>
          <Alert className="mb-4 rounded-lg"><Info className="size-4" /><AlertDescription>تحديد نِسَب العمولات يؤثر على جميع المدفوعات الجديدة فور الحفظ. المدفوعات السابقة لن تتأثر.</AlertDescription></Alert>
          <p className="text-sm font-bold mb-2 text-muted-foreground">نِسَب العمولات لكل مستوى إحالة</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[{ key: "level1Rate", label: "المستوى الأول", desc: "الشريك المباشر", borderClass: "border-blue-500/25 bg-blue-500/5", labelClass: "text-blue-500" }, { key: "level2Rate", label: "المستوى الثاني", desc: "يتطلب SENIOR_PARTNER", borderClass: "border-purple-500/25 bg-purple-500/5", labelClass: "text-purple-500" }, { key: "level3Rate", label: "المستوى الثالث", desc: "يتطلب MASTER_PARTNER", borderClass: "border-amber-500/25 bg-amber-500/5", labelClass: "text-amber-500" }, { key: "level4Rate", label: "المستوى الرابع", desc: "يتطلب EXECUTIVE_PARTNER", borderClass: "border-emerald-500/25 bg-emerald-500/5", labelClass: "text-emerald-500" }].map(level => <Card key={level.key} className={`rounded-xl border-2 ${level.borderClass}`}><CardContent className="p-2"><p className={`text-xs font-bold ${level.labelClass}`}>{level.label}</p><p className="text-xs text-muted-foreground mb-1">{level.desc}</p><div className="flex items-center gap-1"><Input type="number" value={settingsForm[level.key as keyof typeof settingsForm]} onChange={e => setSettingsForm(p => ({ ...p, [level.key]: Number(e.target.value) }))} min={0} max={100} step={0.5} /><span className="text-sm shrink-0">%</span></div></CardContent></Card>)}
          </div>
          <Separator className="my-3" />
          <p className="text-sm font-bold mb-2 text-muted-foreground">إعدادات المدفوعات</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><Label>الحد الأدنى لطلب السحب</Label><div className="flex items-center gap-1"><Input type="number" value={settingsForm.minimumPayoutAmount} onChange={e => setSettingsForm(p => ({ ...p, minimumPayoutAmount: Number(e.target.value) }))} min={0} step={10} /><span className="text-sm shrink-0">ج.م</span></div></div>
            <div><Label>الشروط والأحكام</Label><Textarea value={settingsForm.termsAndConditions} onChange={e => setSettingsForm(p => ({ ...p, termsAndConditions: e.target.value }))} rows={3} placeholder="أدخل شروط وأحكام برنامج الشركاء هنا..." /></div>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 px-4" disabled={savingSettings} onClick={async () => { try { setSavingSettings(true); const r = await apiClient.put("/platform-partners/admin/settings", settingsForm); if (r.data.status === "success") { tToast.success("PlatformPartnerManagement.success_save_3c98"); fetchData(); } } catch (e: any) { toast.error(e.response?.data?.message || "فشل حفظ الإعدادات"); } finally { setSavingSettings(false); } }}>{savingSettings ? <LoadingSpinner size="sm" /> : <Save className="size-4" />} حفظ الإعدادات</Button>
        </div>}
      </div>

      <Dialog open={rankDialogOpen} onOpenChange={setRankDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل لقب الشريك</DialogTitle></DialogHeader>
          <div className="space-y-3"><Select value={newTitle} onValueChange={setNewTitle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PARTNER">Partner</SelectItem><SelectItem value="SENIOR_PARTNER">Senior Partner</SelectItem><SelectItem value="EXECUTIVE_PARTNER">Executive Partner</SelectItem><SelectItem value="REGIONAL_DIRECTOR">Regional Director</SelectItem></SelectContent></Select><Alert><Info className="size-4" /><AlertDescription>اللقب يحدد عمق العمولات (مستوى 1 إلى 4).</AlertDescription></Alert></div>
          <DialogFooter><Button variant="outline" onClick={() => setRankDialogOpen(false)}>إلغاء</Button><Button onClick={async () => { if (!selectedPartner || !newTitle) return; try { const r = await apiClient.put(`/platform-partners/admin/partners/${selectedPartner.id}/title`, { title: newTitle }); if (r.data.status === "success") { toast.success("Partner rank updated"); setRankDialogOpen(false); fetchData(); } } catch (e: any) { toast.error(e.response?.data?.message || "Failed to update rank"); } }}>حفظ التغييرات</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>نسبة عمولة مخصصة — {selectedPartner?.user?.firstName} {selectedPartner?.user?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Alert><Info className="size-4" /><AlertDescription>اترك الحقل فارغاً لاستخدام النسبة العامة للمستوى الأول. النسبة تطبّق على كل فاتورة اشتراك جديدة لهذا الشريك فقط.</AlertDescription></Alert>
            <div>
              <Label>نسبة المستوى الأول (L1) %</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} min={0} max={100} step={0.5} placeholder="مثال: 35" />
                <span className="text-sm shrink-0">%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialogOpen(false)}>إلغاء</Button>
            <Button onClick={async () => {
              if (!selectedPartner) return;
              const val = newRate === "" ? null : Number(newRate);
              if (val !== null && (isNaN(val) || val < 0 || val > 100)) { toast.error("النسبة يجب أن تكون بين 0 و 100"); return; }
              try {
                const r = await apiClient.put(`/platform-partners/admin/partners/${selectedPartner.id}/commission-rate`, { rate: val });
                if (r.data.status === "success") { toast.success("تم تحديث نسبة العمولة"); setRateDialogOpen(false); fetchData(); }
              } catch (e: any) { toast.error(e.response?.data?.message || "فشل حفظ النسبة"); }
            }}>حفظ النسبة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog></div>
  );
};

export default PlatformPartnerManagement;
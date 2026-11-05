import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  FileEdit,
  Layers,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { apiClient } from "../../../../services/apiClient";
import { AgencyProposal, ProposalAuditItem, ProposalPackage } from "../types";

interface AgencyProposalEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: AgencyProposal | null;
  onSaved: (updated: AgencyProposal) => void;
}

export const AgencyProposalEditorModal: React.FC<AgencyProposalEditorModalProps> = ({
  open,
  onOpenChange,
  proposal,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<"basic" | "funnel" | "audit" | "packages">("basic");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<AgencyProposal>>({});

  useEffect(() => {
    if (proposal) {
      setForm(JSON.parse(JSON.stringify(proposal)));
    }
  }, [proposal]);

  if (!proposal) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await apiClient.put<{
        success: boolean;
        message: string;
        data: AgencyProposal;
      }>(`/agency/proposals/${proposal.id}`, form);

      if (res.data?.success) {
        toast.success("تم حفظ وتحديث الخطة في قاعدة البيانات بنجاح!");
        onSaved(res.data.data);
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Error updating proposal:", err);
      toast.error(err?.response?.data?.message || "فشل حفظ التعديلات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl" dir="rtl">
        {/* Header */}
        <div className="p-5 border-b border-border/60 bg-muted/30 flex items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-base font-black flex items-center gap-2 text-foreground">
              <FileEdit className="size-4 text-primary" />
              <span>محرر الخطة التفاعلية المباشر (Live Proposal Editor)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              أي تعديل تحفظه هنا ينعكس فوراً عبر الـ API في رابط الخطة العام دون الحاجة لتعديل الكود أو إعادة الرفع.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="h-8 text-xs font-bold gap-1 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>حفظ وتحديث الصفحة فوراً</span>
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-1 border-b border-border/50 flex gap-2 text-xs font-bold bg-background">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "basic"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            البيانات الأساسية والعميل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("funnel")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "funnel"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            حاسبة النمو والميزانية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "audit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            فجوات الرصد (Audit)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "packages"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            باقات الاستثمار والأسعار
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "basic" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عنوان الخطة الرئيسي</label>
                  <Input
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">اسم العميل والبراند</label>
                  <Input
                    value={form.clientName || ""}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الموجه إليه (الشخص المسؤول)</label>
                  <Input
                    value={form.contactPerson || ""}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="مثال: م. باسم فخري"
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">رقم الهاتف / واتساب</label>
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">قطاع النشاط</label>
                  <Input
                    value={form.industry || ""}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">الملخص التنفيذي وفرضية النمو</label>
                <Textarea
                  rows={3}
                  value={form.executiveSummary || ""}
                  onChange={(e) => setForm({ ...form, executiveSummary: e.target.value })}
                  className="text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">موقع العميل الإلكتروني</label>
                  <Input
                    value={form.website || ""}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="text-xs h-9 font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">صفحة فيسبوك</label>
                  <Input
                    value={form.facebookUrl || ""}
                    onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                    className="text-xs h-9 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "funnel" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                هذه المعايير تغذي الحاسبة التفاعلية في صفحة العرض وتقوم بحساب التدفق المالي آلياً عند تحريك سلايدر الميزانية.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الميزانية الافتراضية (ج.م)</label>
                  <Input
                    type="number"
                    value={form.funnelConfig?.defaultBudget || 15000}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          defaultBudget: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">تكلفة النقرة CPC المقدرة (ج.م)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={form.funnelConfig?.costPerClick || 6.5}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          costPerClick: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">سعر المستوى التدريبي (ج.م)</label>
                  <Input
                    type="number"
                    value={form.funnelConfig?.averageCoursePrice || 2200}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          averageCoursePrice: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نسبة التحويل لحجز (مثال: 0.045 = 4.5%)</label>
                  <Input
                    type="number"
                    step="0.005"
                    value={form.funnelConfig?.leadConversionRate || 0.045}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          leadConversionRate: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نسبة حضور الورشة بالمقر (0.60 = 60%)</label>
                  <Input
                    type="number"
                    step="0.05"
                    value={form.funnelConfig?.showUpRate || 0.60}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          showUpRate: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نسبة تحويل المشتركين المدفوعين (0.35)</label>
                  <Input
                    type="number"
                    step="0.05"
                    value={form.funnelConfig?.enrollmentRate || 0.35}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        funnelConfig: {
                          ...form.funnelConfig!,
                          enrollmentRate: Number(e.target.value),
                        },
                      })
                    }
                    className="text-xs h-9 tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-3">
              {(form.auditItems || []).map((item, idx) => (
                <div key={item.id || idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-primary">ثغرة رقم {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = [...(form.auditItems || [])];
                        next.splice(idx, 1);
                        setForm({ ...form, auditItems: next });
                      }}
                      className="h-6 text-destructive hover:bg-destructive/10 px-2"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const next = [...(form.auditItems || [])];
                      next[idx].title = e.target.value;
                      setForm({ ...form, auditItems: next });
                    }}
                    placeholder="عنوان الثغرة"
                    className="text-xs h-8"
                  />
                  <Textarea
                    rows={2}
                    value={item.finding}
                    onChange={(e) => {
                      const next = [...(form.auditItems || [])];
                      next[idx].finding = e.target.value;
                      setForm({ ...form, auditItems: next });
                    }}
                    placeholder="الملاحظة والرصد الميداني"
                    className="text-xs"
                  />
                  <Input
                    value={item.impact}
                    onChange={(e) => {
                      const next = [...(form.auditItems || [])];
                      next[idx].impact = e.target.value;
                      setForm({ ...form, auditItems: next });
                    }}
                    placeholder="الأثر المالي المترتب"
                    className="text-xs h-8 text-destructive"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === "packages" && (
            <div className="space-y-3">
              {(form.packages || []).map((pkg, idx) => (
                <div key={pkg.id || idx} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold">اسم الباقة</label>
                      <Input
                        value={pkg.name}
                        onChange={(e) => {
                          const next = [...(form.packages || [])];
                          next[idx].name = e.target.value;
                          setForm({ ...form, packages: next });
                        }}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold">السعر الشهري (ج.م)</label>
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={(e) => {
                          const next = [...(form.packages || [])];
                          next[idx].price = Number(e.target.value);
                          setForm({ ...form, packages: next });
                        }}
                        className="text-xs h-8 tabular-nums font-bold text-primary"
                      />
                    </div>
                  </div>
                  <Input
                    value={pkg.tagline}
                    onChange={(e) => {
                      const next = [...(form.packages || [])];
                      next[idx].tagline = e.target.value;
                      setForm({ ...form, packages: next });
                    }}
                    placeholder="الوصف الموجز للباقة"
                    className="text-xs h-8"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

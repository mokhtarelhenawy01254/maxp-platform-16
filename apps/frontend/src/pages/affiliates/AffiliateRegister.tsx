import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  UserPlus,
  Wallet,
  ShieldCheck,
  Building2,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function AffiliateRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paymentMethod: "",
    paymentDetails: {
      bankAccount: "",
      phoneNumber: "",
      bankName: "",
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paymentMethod) {
      toast.error("يرجى اختيار طريقة الدفع لاستلام الأرباح");
      return;
    }
    try {
      setLoading(true);
      const response = await apiClient.post<ApiSuccess<unknown>, typeof formData>(
        "/affiliates/register",
        formData
      );

      if (response.data.success) {
        tToast.success("AffiliateRegister.msg_564e");
        navigate("/affiliates/dashboard");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء تسجيل حساب المسوق");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <UserPlus className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              تسجيل حساب مسوق جديد
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Affiliate Onboarding
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            انضم إلى شبكة المسوقين وابدأ في تحصيل العمولات من كل عملية بيع ناجحة
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98] self-end sm:self-auto"
        >
          <ArrowRight className="size-3.5" />
          <span>العودة</span>
        </Button>
      </div>

      {/* Main Single-Surface Form Chassis */}
      <div className="rounded-lg border border-border/70 bg-card p-4 sm:p-6 shadow-xs space-y-6">
        {/* Info Banner */}
        <div className="rounded-md border border-border/70 bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5 font-mono">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            تحدد الشركة نسبة العمولة وسياسة الاستحقاق والحد الأدنى للسحب من إعدادات برنامج المسوقين.
            يتم هنا تسجيل وتأمين بيانات وسيلة تحويل الأرباح الخاصة بك.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">طريقة الدفع واستلام الأرباح *</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full bg-background border border-border/80 rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="">اختر وسيلة التحويل المفضلة...</option>
              <option value="INSTAPAY">إنستاباي (InstaPay)</option>
              <option value="VODAFONE_CASH">فودافون كاش (Vodafone Cash)</option>
              <option value="ORANGE_CASH">أورنج كاش (Orange Cash)</option>
              <option value="BANK_TRANSFER">تحويل بنكي مباشر (Bank Account)</option>
            </select>
          </div>

          {/* Conditional Payment Details */}
          {formData.paymentMethod && (
            <div className="space-y-3 p-3.5 rounded-md border border-border/70 bg-muted/20">
              <div className="flex items-center gap-2">
                <Wallet className="size-3.5 text-primary" />
                <h3 className="text-xs font-semibold text-foreground font-mono">
                  بيانات الحساب للتحويل
                </h3>
              </div>

              {formData.paymentMethod === "BANK_TRANSFER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">اسم البنك</label>
                    <Input
                      type="text"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentDetails: { ...formData.paymentDetails, bankName: e.target.value },
                        })
                      }
                      placeholder="مثال: البنك الأهلي المصري"
                      className="h-8 text-xs font-mono bg-background border-border/70"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">رقم الحساب / الآيبان (IBAN)</label>
                    <Input
                      type="text"
                      value={formData.paymentDetails.bankAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentDetails: { ...formData.paymentDetails, bankAccount: e.target.value },
                        })
                      }
                      placeholder="EG..."
                      className="h-8 text-xs font-mono bg-background border-border/70"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {(formData.paymentMethod === "VODAFONE_CASH" ||
                formData.paymentMethod === "ORANGE_CASH" ||
                formData.paymentMethod === "INSTAPAY") && (
                <div className="space-y-1 max-w-sm">
                  <label className="text-[11px] text-muted-foreground">
                    {formData.paymentMethod === "INSTAPAY"
                      ? "عنوان الدفع اللحظي (IPA) أو رقم الهاتف"
                      : "رقم المحفظة الإلكترونية"}
                  </label>
                  <Input
                    type="text"
                    value={formData.paymentDetails.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentDetails: { ...formData.paymentDetails, phoneNumber: e.target.value },
                      })
                    }
                    placeholder="01XXXXXXXXX"
                    className="h-8 text-xs font-mono bg-background border-border/70"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          )}

          {/* Program Terms Chassis */}
          <div className="rounded-md border border-border/70 bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" />
              <h3 className="text-xs font-semibold text-foreground font-mono">
                شروط وضوابط برنامج العمولات
              </h3>
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside font-mono leading-relaxed">
              <li>تصبح العمولات مستحقة للسحب فور استلام العميل للطلب وتأكيد التسليم.</li>
              <li>يمكن تقديم طلب سحب الأرباح عند بلوغ الحد الأدنى المحدد من إدارة المتجر.</li>
              <li>تتم مراجعة التحويلات المالية وتسجيل السداد بصورة فورية وموثقة في سجل المسوق.</li>
            </ul>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <Button
              type="submit"
              disabled={loading}
              className="h-8 px-4 text-xs font-mono gap-1 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              <span>تأكيد تسجيل حساب المسوق</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-8 px-3 text-xs font-mono border-border/70"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { AffiliateProductVisibility, ProductFormData } from "../../types";
import { apiClient } from "../../../../services/apiClient";
import {
  Coins,
  Settings2,
  Eye,
  Users,
} from "lucide-react";

type AffiliateOption = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  status?: string;
};

interface CommissionTabProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  displayCurrency: string;
}

export const CommissionTab: React.FC<CommissionTabProps> = ({
  formData,
  setFormData,
  handleInputChange,
  displayCurrency,
}) => {
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAffiliates = async () => {
      try {
        setLoadingAffiliates(true);
        const response = await apiClient.get("/affiliates/list");
        if (isMounted && response.data?.success && Array.isArray(response.data.data)) {
          setAffiliates(response.data.data);
        }
      } catch {
        if (isMounted) {
          setAffiliates([]);
        }
      } finally {
        if (isMounted) {
          setLoadingAffiliates(false);
        }
      }
    };

    fetchAffiliates();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeAffiliates = useMemo(
    () =>
      affiliates.filter((affiliate) => !affiliate.status || affiliate.status === "ACTIVE"),
    [affiliates],
  );

  const selectedAffiliateIds = formData.affiliateVisibleAffiliateIds || [];

  const handleVisibilityChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextVisibility = e.target.value as AffiliateProductVisibility;
    setFormData((prev) => ({
      ...prev,
      affiliateVisibility: nextVisibility,
      affiliateVisibleAffiliateIds:
        nextVisibility === "SELECTED" ? prev.affiliateVisibleAffiliateIds : [],
    }));
  };

  const toggleAffiliate = (affiliateId: string) => {
    setFormData((prev) => {
      const currentIds = prev.affiliateVisibleAffiliateIds || [];
      const isSelected = currentIds.includes(affiliateId);

      return {
        ...prev,
        affiliateVisibleAffiliateIds: isSelected
          ? currentIds.filter((id) => id !== affiliateId)
          : [...currentIds, affiliateId],
      };
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-xs text-right">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <div className="p-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg">
          <Coins className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            إعدادات عمولة المسوقين
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            تخصيص العمولة التي يحصل عليها المسوق عند بيع هذا المنتج وقواعد الظهور
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
            نوع العمولة
          </label>
          <select
            name="commissionType"
            value={formData.commissionType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
          >
            <option value="PERCENTAGE">نسبة مئوية (%)</option>
            <option value="FIXED">مبلغ ثابت (Fixed)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
            {formData.commissionType === "PERCENTAGE"
              ? "نسبة العمولة (%)"
              : "قيمة العمولة"}
          </label>
          <input
            type="number"
            name="affiliateCommission"
            value={formData.affiliateCommission}
            onChange={handleInputChange}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
            placeholder="0.0"
          />
        </div>
      </div>

      <div className="bg-muted/20 p-3.5 rounded-lg border border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              السماح بإضافة هامش ربح (Markup)
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              إذا تم التفعيل، سيتمكن المسوق من زيادة سعر المنتج لنفسه والحصول على الفرق كربح إضافي.
            </p>
          </div>
          <input
            type="checkbox"
            name="allowAffiliateMarkup"
            checked={formData.allowAffiliateMarkup}
            onChange={handleInputChange}
            className="h-4 w-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/50 p-3.5 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary border border-primary/20 shrink-0">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              ظهور المنتج للمسوقين
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              تحكم هل المنتج يظهر لكل المسوقين، يختفي عنهم، أو يظهر لمجموعة محددة فقط.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
              حالة الظهور
            </label>
            <select
              name="affiliateVisibility"
              value={formData.affiliateVisibility}
              onChange={handleVisibilityChange}
              className="w-full px-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
            >
              <option value="ALL">يظهر لكل المسوقين</option>
              <option value="HIDDEN">مخفي عن كل المسوقين</option>
              <option value="SELECTED">مسوقين محددين فقط</option>
            </select>
          </div>

          <div className="rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground border border-border/40 md:col-span-2 flex items-center">
            {formData.affiliateVisibility === "ALL" && (
              <span>المنتج سيظهر في تجهيز الطلب لجميع المسوقين النشطين.</span>
            )}
            {formData.affiliateVisibility === "HIDDEN" && (
              <span>المنتج لن يظهر لأي مسوق، وسيتم رفضه لو حاول مسوق إنشاء طلب به.</span>
            )}
            {formData.affiliateVisibility === "SELECTED" && (
              <span>المنتج سيظهر فقط للمسوقين المختارين أدناه، مع منع الطلبات من غيرهم.</span>
            )}
          </div>
        </div>

        {formData.affiliateVisibility === "SELECTED" && (
          <div className="mt-3 rounded-lg border border-border/70 bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>المسوقين المسموح لهم</span>
              </div>
              <span className="font-mono text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {selectedAffiliateIds.length} محدد
              </span>
            </div>

            {loadingAffiliates ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                جاري تحميل المسوقين...
              </div>
            ) : activeAffiliates.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                لا يوجد مسوقين نشطين للاختيار.
              </div>
            ) : (
              <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {activeAffiliates.map((affiliate) => {
                  const name =
                    `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() ||
                    affiliate.user?.email ||
                    "مسوق بدون اسم";
                  const isSelected = selectedAffiliateIds.includes(affiliate.id);

                  return (
                    <label
                      key={affiliate.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/50 bg-background/50 hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAffiliate(affiliate.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-0"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {name}
                        </span>
                        {affiliate.user?.email && (
                          <span className="block truncate text-[10px] text-muted-foreground font-mono">
                            {affiliate.user.email}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5 bg-muted/20 rounded-lg border border-border/60">
        <div className="flex items-start gap-2.5">
          <Settings2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground space-y-1">
            <p className="font-semibold text-muted-foreground mb-1">توضيح حول حساب الأرباح:</p>
            <p>
              سعر التاجر (التكلفة):{" "}
              <span className="font-mono tabular-nums font-semibold text-primary">
                {formData.cost || 0}
              </span>{" "}
              {displayCurrency}
            </p>
            <p>
              سعر البيع للجمهور:{" "}
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {formData.price || 0}
              </span>{" "}
              {displayCurrency}
            </p>
            <p>
              صافي عمولة المسوق:{" "}
              <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                {formData.commissionType === "PERCENTAGE"
                  ? `${(((formData.price || 0) * (formData.affiliateCommission || 0)) / 100).toFixed(2)} (${formData.affiliateCommission}%)`
                  : `${formData.affiliateCommission || 0} مبلغ ثابت`}
              </span>{" "}
              {displayCurrency}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionTab;

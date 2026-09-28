import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Loader2,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsStatusAlert,
} from "./components/SettingsPagePrimitives";
import {
  getApiErrorMessage,
  getNumericValue,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";

interface DeliveryOption {
  id: string;
  name: string;
  description: string | null;
  deliveryTime: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  icon: string | null;
  sortOrder: number;
}

type DeliveryOptionFormState = {
  name: string;
  description: string;
  deliveryTime: string;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

type DeliveryMessageState = {
  type: "success" | "error";
  text: string;
};

const createDefaultFormData = (sortOrder = 0): DeliveryOptionFormState => ({
  name: "",
  description: "",
  deliveryTime: "",
  price: 0,
  isDefault: false,
  isActive: true,
  sortOrder,
});

const DeliveryOptions: React.FC = () => {
  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOption | null>(null);
  const [message, setMessage] = useState<DeliveryMessageState | null>(null);
  const [formData, setFormData] = useState<DeliveryOptionFormState>(
    createDefaultFormData(),
  );

  const sortedOptions = useMemo(
    () =>
      [...options].sort((firstOption, secondOption) => {
        const sortDifference = firstOption.sortOrder - secondOption.sortOrder;
        if (sortDifference !== 0) {
          return sortDifference;
        }

        return firstOption.name.localeCompare(secondOption.name, "ar");
      }),
    [options],
  );

  const activeCount = useMemo(
    () => options.filter((option) => option.isActive).length,
    [options],
  );

  const defaultCount = useMemo(
    () => options.filter((option) => option.isDefault).length,
    [options],
  );

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/delivery-options");

      if (response.data.success) {
        setOptions(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      console.error("Error fetching delivery options:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في جلب خيارات التوصيل"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const openCreateDialog = useCallback(() => {
    setEditingOption(null);
    setFormData(createDefaultFormData(options.length));
    setDialogOpen(true);
  }, [options.length]);

  const openEditDialog = useCallback((option: DeliveryOption) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      description: option.description || "",
      deliveryTime: option.deliveryTime,
      price: getNumericValue(option.price),
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    });
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingOption(null);
    setFormData(createDefaultFormData(options.length));
  }, [options.length]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim() || !formData.deliveryTime.trim()) {
      setMessage({
        type: "error",
        text: "اسم الخيار ووقت التوصيل مطلوبان قبل الحفظ.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      if (editingOption) {
        await apiClient.put(`/delivery-options/${editingOption.id}`, formData);
        setMessage({
          type: "success",
          text: "تم تحديث خيار التوصيل بنجاح",
        });
      } else {
        await apiClient.post("/delivery-options", formData);
        setMessage({
          type: "success",
          text: "تمت إضافة خيار التوصيل بنجاح",
        });
      }

      handleCloseDialog();
      await loadOptions();
    } catch (error) {
      console.error("Error saving delivery option:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في حفظ خيار التوصيل"),
      });
    } finally {
      setSaving(false);
    }
  }, [editingOption, formData, handleCloseDialog, loadOptions]);

  const handleToggle = useCallback(async (optionId: string) => {
    try {
      setTogglingId(optionId);
      setMessage(null);
      await apiClient.patch(`/delivery-options/${optionId}/toggle`, {});
      await loadOptions();
    } catch (error) {
      console.error("Error toggling delivery option:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في تغيير حالة خيار التوصيل"),
      });
    } finally {
      setTogglingId(null);
    }
  }, [loadOptions]);

  const handleDelete = useCallback(async (optionId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف خيار التوصيل هذا؟")) {
      return;
    }

    try {
      setMessage(null);
      await apiClient.delete(`/delivery-options/${optionId}`);
      setMessage({
        type: "success",
        text: "تم حذف خيار التوصيل بنجاح",
      });
      await loadOptions();
    } catch (error) {
      console.error("Error deleting delivery option:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "فشل في حذف خيار التوصيل"),
      });
    }
  }, [loadOptions]);

  if (loading) {
    return (
      <SettingsLoadingState
        title="جاري تحميل خيارات التوصيل..."
        description="بنرتّب لك أنواع التوصيل المتاحة وأسعارها من نفس السطح الحديث."
      />
    );
  }

  return (
    <>
      <SettingsPageShell>
        <SettingsPageHero
          badgeIcon={Truck}
          badgeLabel="إدارة مسارات التوصيل"
          title="خيارات التوصيل"
          description="أنشئ أنواع التوصيل التي يراها العميل، وحدد السعر ووقت التنفيذ والترتيب الافتراضي لكل خيار من مكان واحد."
          action={
            <Button
              type="button"
              size="lg"
              onClick={openCreateDialog}
              className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus className="size-4" />
              إضافة خيار جديد
            </Button>
          }
          summaryItems={[
            { label: "إجمالي الخيارات", value: options.length },
            { label: "الخيارات النشطة", value: activeCount },
            { label: "الخيارات الافتراضية", value: defaultCount },
          ]}
          gradientClassName="bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_36%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(239,246,255,0.88))]"
        />

        <div className="space-y-6 px-6 py-6">
          <SettingsStatusAlert message={message} />

          {sortedOptions.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                <Package className="size-8" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-slate-100">
                لا توجد خيارات توصيل حتى الآن
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                أضف أول خيار ليظهر للعميل في صفحة الدفع، مثل التوصيل العادي أو
                السريع أو الاستلام خلال نفس اليوم.
              </p>
              <Button
                type="button"
                onClick={openCreateDialog}
                className="mt-6 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Plus className="size-4" />
                إضافة أول خيار
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedOptions.map((option) => (
                <section
                  key={option.id}
                  className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
                          {option.name}
                        </h2>
                        {option.isDefault ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            <Star className="size-3.5 fill-current" />
                            الافتراضي
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className={cn(
                            option.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400",
                          )}
                        >
                          {option.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </div>

                      <p className="max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                        {option.description?.trim()
                          ? option.description
                          : "لا يوجد وصف مختصر لهذا الخيار حتى الآن."}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            وقت التوصيل
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-slate-100">
                            <Clock3 className="size-4 text-slate-500 dark:text-slate-400" />
                            {option.deliveryTime}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            السعر
                          </p>
                          <div className="mt-2 text-sm font-bold text-slate-950 dark:text-slate-100">
                            {option.price} جنيه
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            ترتيب العرض
                          </p>
                          <div className="mt-2 text-sm font-bold text-slate-950 dark:text-slate-100">
                            #{option.sortOrder}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 xl:min-w-[250px]">
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
                              تفعيل هذا الخيار
                            </p>
                            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                              أوقفه مؤقتًا بدون حذف البيانات أو إعادة الترتيب.
                            </p>
                          </div>
                          <Switch
                            aria-label={`تفعيل ${option.name}`}
                            checked={option.isActive}
                            onCheckedChange={() => {
                              void handleToggle(option.id);
                            }}
                            disabled={togglingId === option.id}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 rounded-2xl"
                          onClick={() => openEditDialog(option)}
                        >
                          <Pencil className="size-4" />
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="rounded-2xl"
                          onClick={() => {
                            void handleDelete(option.id);
                          }}
                          aria-label={`حذف ${option.name}`}
                        >
                          <Trash2 className="size-4" />
                          حذف
                        </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
      </SettingsPageShell>

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => !nextOpen && handleCloseDialog()}
      >
        <DialogContent
          dir="rtl"
          showCloseButton={false}
          className="max-w-2xl gap-0 overflow-hidden rounded-[28px] border border-slate-200/70 bg-white p-0 dark:border-slate-800 dark:bg-slate-950"
        >
          <DialogHeader className="border-b border-slate-200/70 px-6 py-5 text-right dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-950 dark:text-slate-100">
              {editingOption ? "تعديل خيار التوصيل" : "إضافة خيار توصيل جديد"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
              حدّد الاسم الذي يراه العميل، ووقت التوصيل، والسعر، ثم اضبط كونه
              افتراضيًا أو نشطًا.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-option-name" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  اسم الخيار
                </Label>
                <Input
                  id="delivery-option-name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: توصيل عادي أو توصيل سريع"
                  className="h-11 rounded-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-option-time" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  وقت التوصيل
                </Label>
                <Input
                  id="delivery-option-time"
                  value={formData.deliveryTime}
                  onChange={(event) =>
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      deliveryTime: event.target.value,
                    }))
                  }
                  placeholder="مثال: 1-2 يوم أو نفس اليوم"
                  className="h-11 rounded-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-option-description" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                الوصف
              </Label>
              <Textarea
                id="delivery-option-description"
                rows={3}
                value={formData.description}
                onChange={(event) =>
                  setFormData((currentFormData) => ({
                    ...currentFormData,
                    description: event.target.value,
                  }))
                }
                placeholder="وصف مختصر يساعد العميل على فهم هذا الخيار"
                className="min-h-[110px] rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-option-price" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  السعر (جنيه)
                </Label>
                <Input
                  id="delivery-option-price"
                  type="number"
                  min={0}
                  step={5}
                  value={formData.price}
                  onChange={(event) =>
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      price: getNumericValue(event.target.value),
                    }))
                  }
                  className="h-11 rounded-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-option-sort-order" className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  ترتيب العرض
                </Label>
                <Input
                  id="delivery-option-sort-order"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(event) =>
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      sortOrder: Math.max(
                        0,
                        Math.trunc(getNumericValue(event.target.value)),
                      ),
                    }))
                  }
                  className="h-11 rounded-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  الأصغر يظهر أولًا أمام العميل.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
                      جعله الخيار الافتراضي
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      سيظهر كمقترح أول للعميل عند اختيار وسيلة التوصيل.
                    </p>
                  </div>
                  <Switch
                    aria-label="جعله الخيار الافتراضي"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData((currentFormData) => ({
                        ...currentFormData,
                        isDefault: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
                      تفعيل الخيار
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      عند الإيقاف يظل محفوظًا لكنه يختفي من واجهة العميل.
                    </p>
                  </div>
                  <Switch
                    aria-label="تفعيل الخيار"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((currentFormData) => ({
                        ...currentFormData,
                        isActive: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950">
            <Button variant="outline" onClick={handleCloseDialog}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={
                saving ||
                !formData.name.trim() ||
                !formData.deliveryTime.trim()
              }
              className="bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingOption ? "تحديث الخيار" : "إضافة الخيار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryOptions;

import React from "react";
import {
  FieldErrors,
  UseFormHandleSubmit,
  UseFormRegister,
} from "react-hook-form";
import {
  Save,
  ArrowLeft,
  Briefcase,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Card, CardContent } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { PromotionFormData } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface CreatePromotionDetailsFormProps {
  register: UseFormRegister<PromotionFormData>;
  handleSubmit: UseFormHandleSubmit<PromotionFormData>;
  errors: FieldErrors<PromotionFormData>;
  loading: boolean;
  onSubmit: (data: PromotionFormData) => Promise<void>;
  onCancel: () => void;
}

export const CreatePromotionDetailsForm: React.FC<
  CreatePromotionDetailsFormProps
> = ({ register, handleSubmit, errors, loading, onSubmit, onCancel }) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-md overflow-hidden">
          <div className="bg-gray-50/50 p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <Briefcase className="h-5 w-5 text-gray-500" />
              تفاصيل الحركة الوظيفية
            </h2>
          </div>

          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-500 text-xs uppercase tracking-wide">
                    المنصب الحالي
                  </Label>
                  <Input
                    {...register("fromPositionName")}
                    placeholder="اسم المنصب الحالي"
                    className="bg-white border-slate-200 focus-visible:ring-slate-400 font-medium"
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-gray-500 text-xs uppercase tracking-wide">
                    الراتب الحالي
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      {...register("fromSalary", { valueAsNumber: true })}
                      placeholder="0.00"
                      className="pr-9 bg-white border-slate-200 font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex justify-center py-4 md:py-0">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <ArrowLeft className="h-6 w-6" />
                </div>
              </div>

              <div className="md:col-span-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-green-600 text-xs uppercase tracking-wide font-bold">
                    المنصب الجديد
                  </Label>
                  <Input
                    {...register("toPositionName", {
                      required: "المنصب الجديد مطلوب",
                    })}
                    placeholder="اسم المنصب الجديد"
                    className="bg-green-50/50 border-green-200 focus-visible:ring-green-400 font-medium text-green-900"
                  />
                  {errors.toPositionName && (
                    <p className="text-xs text-red-500">
                      {errors.toPositionName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-green-600 text-xs uppercase tracking-wide font-bold">
                    الراتب الجديد
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                    <Input
                      type="number"
                      {...register("toSalary", { valueAsNumber: true })}
                      placeholder="0.00"
                      className="pr-9 bg-green-50/50 border-green-200 text-green-900 font-bold font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  تاريخ الترقية
                </Label>
                <DateInput
                  
                  className="font-mono tabular-nums"
                  {...register("promotionDate", { required: "مطلوب" })}
                />
                {errors.promotionDate && (
                  <p className="text-xs text-red-500">
                    {errors.promotionDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  تاريخ السريان
                </Label>
                <DateInput
                  
                  className="font-mono tabular-nums"
                  {...register("effectiveDate", { required: "مطلوب" })}
                />
                {errors.effectiveDate && (
                  <p className="text-xs text-red-500">
                    {errors.effectiveDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>سبب الترقية / المبررات</Label>
              <Textarea
                {...register("reason", { required: "مطلوب" })}
                className="min-h-[100px]"
                placeholder="اشرح أسباب الترقية بالتفصيل..."
              />
              {errors.reason && (
                <p className="text-xs text-red-500">{errors.reason.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea
                {...register("notes")}
                className="min-h-[80px]"
                placeholder="أي ملاحظات أخرى..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            size="lg"
            className="min-w-[150px]"
            disabled={loading}
          >
            {loading ? (
              "جاري الحفظ..."
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                حفظ الترقية
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

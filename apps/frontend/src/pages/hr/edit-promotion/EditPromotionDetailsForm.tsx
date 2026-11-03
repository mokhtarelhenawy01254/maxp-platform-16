import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { Briefcase, Calendar, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Card, CardContent } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { PromotionFormData } from "./types";
import { EditPromotionMovementSection } from "./EditPromotionMovementSection";
import { DateInput } from '../../../components/ui/DateInput';

interface EditPromotionDetailsFormProps {
  register: UseFormRegister<PromotionFormData>;
  control: Control<PromotionFormData>;
  errors: FieldErrors<PromotionFormData>;
  saving: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onCancel: () => void;
}

export const EditPromotionDetailsForm: React.FC<
  EditPromotionDetailsFormProps
> = ({ register, control, errors, saving, onSubmit, onCancel }) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <form onSubmit={onSubmit}>
        <Card className="shadow-md overflow-hidden">
          <div className="bg-gray-50/50 p-6 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <Briefcase className="h-5 w-5 text-gray-500" />
              تفاصيل الحركة الوظيفية
            </h2>
          </div>

          <CardContent className="p-6 space-y-8">
            <EditPromotionMovementSection
              register={register}
              errors={errors}
            />

            <Separator />

            {/* Dates & Status */}
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

              <div className="space-y-2 md:col-span-2">
                <Label>حالة الطلب</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="حالة الطلب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">
                          معلق (قيد المراجعة)
                        </SelectItem>
                        <SelectItem value="APPROVED">موافق عليه</SelectItem>
                        <SelectItem value="REJECTED">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
            disabled={saving}
          >
            {saving ? (
              "جاري الحفظ..."
            ) : (
              <>
                <Save className="ml-2 h-4 w-4" />
                حفظ التعديلات
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

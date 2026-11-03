import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import { Calendar, CheckCircle2, Clock, Save } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { TrainingFormData } from "./types";
import { TRAINING_STATUS_OPTIONS } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface CreateTrainingScheduleCardProps {
  control: Control<TrainingFormData>;
  register: UseFormRegister<TrainingFormData>;
  errors: FieldErrors<TrainingFormData>;
}

export const CreateTrainingScheduleCard: React.FC<
  CreateTrainingScheduleCardProps
> = ({ control, register, errors }) => {
  return (
    <Card className="border-none shadow-xl ring-1 ring-purple-100/50">
      <CardHeader className="border-b border-gray-50 bg-gray-50/30">
        <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-800">
          <Clock className="h-5 w-5" />
          التوقيت والحالة
        </h3>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold flex items-center gap-2">
                تاريخ البدء <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <DateInput
                  
                  className="h-12 pr-10 border-purple-50 focus:ring-purple-200 rounded-xl font-mono tabular-nums"
                  {...register("startDate", {
                    required: "تاريخ البدء مطلوب",
                  })}
                />
              </div>
              {errors.startDate && (
                <p className="text-xs font-bold text-rose-500 mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold">تاريخ الانتهاء المتوقع</Label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <DateInput
                  
                  className="h-12 pr-10 border-purple-50 focus:ring-purple-200 rounded-xl font-mono tabular-nums"
                  {...register("endDate")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">حالة التدريب</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {TRAINING_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          field.value === opt.value
                            ? `${opt.color} shadow-sm ring-2 ring-offset-1 ring-purple-100`
                            : "bg-white text-gray-500 border-gray-100 hover:border-purple-200"
                        }`}
                      >
                        {field.value === opt.value && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  المدة (ساعة)
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-12 border-purple-50 focus:ring-purple-200 rounded-xl font-mono tabular-nums"
                  {...register("duration")}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <Save className="h-4 w-4 text-purple-400" />
                  الجهة المنظمة
                </Label>
                <Input
                  placeholder="مركز التدريب..."
                  className="h-12 border-purple-50 focus:ring-purple-200 rounded-xl"
                  {...register("provider")}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

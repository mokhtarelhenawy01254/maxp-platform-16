import React from "react";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import {
  AlertCircle,
  Calendar,
  Eye,
  FileText,
  Gavel,
  Save,
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { WarningFormData } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface CreateWarningFormProps {
  employees: any[];
  loading: boolean;
  register: UseFormRegister<WarningFormData>;
  control: Control<WarningFormData>;
  errors: FieldErrors<WarningFormData>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onOpenPreview: () => void;
  onCancel: () => void;
}

export const CreateWarningForm: React.FC<CreateWarningFormProps> = ({
  employees,
  loading,
  register,
  control,
  errors,
  onSubmit,
  onOpenPreview,
  onCancel,
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تفاصيل المخالفة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                الموظف المعني <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="employeeId"
                control={control}
                rules={{ required: "يجب اختيار الموظف" }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-12 bg-background/50">
                      <SelectValue placeholder="بحث عن موظف..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="no-employees" disabled>
                          لا يوجد موظفين متاحين
                        </SelectItem>
                      ) : (
                        employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {emp.firstName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-muted-foreground text-xs font-mono tabular-nums">
                                ({emp.employeeNumber})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employeeId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{" "}
                  {errors.employeeId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Incident Date */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  تاريخ الواقعة <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <DateInput
                    
                    className="h-12 pr-10 bg-background/50 font-mono tabular-nums"
                    {...register("incidentDate", {
                      required: "التاريخ مطلوب",
                    })}
                  />
                </div>
                {errors.incidentDate && (
                  <p className="text-sm text-red-500">
                    {errors.incidentDate.message}
                  </p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  نوع الإجراء <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="h-12 bg-background/50">
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VERBAL">تنبيه شفهي</SelectItem>
                        <SelectItem value="WRITTEN">إنذار كتابي</SelectItem>
                        <SelectItem value="FINAL">إنذار نهائي</SelectItem>
                        <SelectItem value="TERMINATION">
                          قرار فصل / إنهاء خدمات
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Severity & Title */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">درجة الخطورة</Label>
                <Controller
                  name="severity"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="h-12 bg-background/50">
                        <SelectValue placeholder="اختر الشدة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">بسيطة (Low)</SelectItem>
                        <SelectItem value="medium">متوسطة (Medium)</SelectItem>
                        <SelectItem value="major">جسيمة (High)</SelectItem>
                        <SelectItem value="critical">
                          حرجة (Critical)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-base font-semibold">
                  عنوان المخالفة <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="مثال: الغياب المتكرر بدون عذر..."
                  className="h-12 bg-background/50"
                  {...register("title", { required: "العنوان مطلوب" })}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                تفاصيل الواقعة <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="اشرح بوضوح ما حدث، متى، وأين..."
                className="min-h-[120px] bg-background/50 resize-none leading-relaxed"
                {...register("description", {
                  required: "التفاصيل مطلوبة",
                })}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Action Taken */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Gavel className="h-4 w-4" />
                القرارات المتخذة (الجزاءات)
              </Label>
              <Textarea
                placeholder="مثال: خصم يومين من الراتب، الحرمان من العلاوة..."
                className="min-h-[80px] bg-background/50 resize-none"
                {...register("actionTaken")}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end pt-6 border-t gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onOpenPreview}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                معاينة قبل الحفظ
              </Button>
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
                disabled={loading}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white min-w-[150px]"
              >
                {loading ? (
                  "جاري الحفظ..."
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    اعتماد المخالفة
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

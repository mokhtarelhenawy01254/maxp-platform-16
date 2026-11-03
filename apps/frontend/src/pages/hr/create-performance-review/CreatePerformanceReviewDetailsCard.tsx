import React from "react";
import {
  BarChart3,
  Calendar,
  Target,
  Save,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { PerformanceReviewFormData } from "./types";
import { RATING_SCALE_LABELS } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface CreatePerformanceReviewDetailsCardProps {
  isEditing: boolean;
  submitting: boolean;
  formData: PerformanceReviewFormData;
  onChange: (next: PerformanceReviewFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreatePerformanceReviewDetailsCard: React.FC<
  CreatePerformanceReviewDetailsCardProps
> = ({ isEditing, submitting, formData, onChange, onSubmit, onCancel }) => {
  return (
    <div className="lg:col-span-2 space-y-8">
      <Card className="border-none shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            فترة التقييم وبيانات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full space-y-2">
              <Label className="font-bold">عنوان فترة التقييم</Label>
              <Input
                placeholder="مثال: تقييم الربع السنوي الأول 2024"
                value={formData.reviewPeriod}
                onChange={(e) =>
                  onChange({ ...formData, reviewPeriod: e.target.value })
                }
                className="h-12 rounded-xl bg-gray-50/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">بداية الفترة</Label>
              <DateInput
                
                value={formData.periodStart}
                onChange={(e) =>
                  onChange({ ...formData, periodStart: e.target.value })
                }
                className="h-12 rounded-xl bg-gray-50/50 font-mono tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">نهاية الفترة</Label>
              <DateInput
                
                value={formData.periodEnd}
                onChange={(e) =>
                  onChange({ ...formData, periodEnd: e.target.value })
                }
                className="h-12 rounded-xl bg-gray-50/50 font-mono tabular-nums"
              />
            </div>

            <div className="col-span-full space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-lg">
                  التقييم العام المبدئي
                </Label>
                <span className="text-2xl font-black text-primary font-mono tabular-nums">
                  {Number(formData.overallRating).toFixed(1)}
                </span>
              </div>
              <Input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={formData.overallRating}
                onChange={(e) =>
                  onChange({
                    ...formData,
                    overallRating: parseFloat(e.target.value),
                  })
                }
                className="h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                {RATING_SCALE_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          <hr className="my-8" />

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                نقاط القوة
              </Label>
              <Textarea
                placeholder="ما هي أبرز الإنجازات والمهارات التي أظهرها الموظف؟"
                value={formData.strengths}
                onChange={(e) =>
                  onChange({ ...formData, strengths: e.target.value })
                }
                className="min-h-[100px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
              />
            </div>

            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                مجالات التطوير
              </Label>
              <Textarea
                placeholder="ما هي المهارات التي تحتاج إلى تحسين في الفترة القادمة؟"
                value={formData.improvements}
                onChange={(e) =>
                  onChange({ ...formData, improvements: e.target.value })
                }
                className="min-h-[100px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
              />
            </div>

            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                تعليقات المقيّم النهائية
              </Label>
              <Textarea
                placeholder="أي ملاحظات إضافية حول أداء الموظف العام..."
                value={formData.reviewerComments}
                onChange={(e) =>
                  onChange({
                    ...formData,
                    reviewerComments: e.target.value,
                  })
                }
                className="min-h-[120px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
              />
            </div>
          </div>
        </CardContent>

        <div className="p-8 bg-gray-50/50 dark:bg-gray-800/20 border-t flex flex-col md:flex-row gap-4 justify-end rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full md:w-auto h-12 rounded-xl px-8"
          >
            إلغاء
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full md:w-auto h-12 rounded-xl px-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full ml-2" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ml-2" />
                {isEditing ? "حفظ التعديلات" : "حفظ ونشر التقييم"}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

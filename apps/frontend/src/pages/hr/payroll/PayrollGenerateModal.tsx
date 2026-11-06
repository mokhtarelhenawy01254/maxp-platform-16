import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Sparkles, Users, Calendar, ShieldCheck,
  Check, RefreshCw, Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { PayrollSummary, months } from './types';

interface PayrollGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: number;
  selectedYear: number;
  summary: PayrollSummary | null;
  forceRegenerate: boolean;
  setForceRegenerate: (val: boolean) => void;
  generating: boolean;
  onGenerate: () => void;
}

export const PayrollGenerateModal: React.FC<PayrollGenerateModalProps> = ({
  open,
  onOpenChange,
  selectedMonth,
  selectedYear,
  summary,
  forceRegenerate,
  setForceRegenerate,
  generating,
  onGenerate,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0 rounded-2xl border border-border/70 shadow-2xl bg-card">
        {/* Header */}
        <div className="border-b border-border/70 p-6 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">إعداد مسودة الرواتب</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">دورة {months[selectedMonth - 1]} {selectedYear}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-card">
          {/* Process Summary Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Users className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500 font-medium">الموظفين النشطين</p>
                <p className="font-bold text-slate-900 dark:text-white tabular-nums">{summary?.totalEmployees || '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500 font-medium">أيام العمل</p>
                <p className="font-bold text-slate-900 dark:text-white">حسب التقويم</p>
              </div>
            </div>
          </div>

          {/* Checklist Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              مصادر البيانات التي سيتم تحليلها
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'سجلات الحضور اليومي', icon: Check },
                { label: 'طلبات الإجازات المعتمدة', icon: Check },
                { label: 'العطلات الرسمية', icon: Check },
                { label: 'الزيادات والمكافآت', icon: Check },
                { label: 'التأمينات والضرائب', icon: Check },
                { label: 'بدلات الموظفين', icon: Check },
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <item.icon className="h-3.5 w-3.5 text-emerald-500" />
                  {item.label}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Force Regenerate Tooltip-like Warning */}
          <motion.div
            animate={forceRegenerate ? { scale: [1, 1.02, 1], borderColor: '#f97316' } : {}}
            className={`p-4 rounded-xl border-dashed transition-all ${forceRegenerate ? 'bg-orange-50/50 border-2 border-orange-500' : 'bg-slate-50/50 border border-slate-200 dark:border-slate-800'}`}
          >
            <div className="flex gap-3">
              <Checkbox
                id="forceRegenerate"
                checked={forceRegenerate}
                onCheckedChange={(checked) => setForceRegenerate(checked === true)}
                className="mt-1 h-5 w-5 border-slate-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <div className="flex-1">
                <Label htmlFor="forceRegenerate" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold cursor-pointer mb-1 text-sm">
                  <RefreshCw className={`h-3.5 w-3.5 ${forceRegenerate ? 'animate-spin text-orange-600' : 'text-slate-400'}`} />
                  إعادة احتساب الرواتب (Overwrite)
                </Label>
                <p className="text-xs text-slate-500 leading-relaxed">
                  عند تحديد هذا الخيار، سيتم استبدال جميع مسودات الرواتب الحالية لهذا الشهر بالبيانات الجديدة.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl"
            >
              إلغاء العملية
            </Button>
            <Button
              onClick={onGenerate}
              disabled={generating}
              className={`flex-[2] h-11 rounded-xl transition-all ${forceRegenerate ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
            >
              <AnimatePresence mode="wait">
                {generating ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>جاري المعالجة...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{forceRegenerate ? 'بدء إعادة الاحتساب' : 'بدء عملية الإعداد'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        {/* Subtle Footer Info */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-2 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
          <ShieldCheck className="h-3 w-3" />
          Secure Enterprise Calculation Engine v2.0
        </div>
      </DialogContent>
    </Dialog>
  );
};

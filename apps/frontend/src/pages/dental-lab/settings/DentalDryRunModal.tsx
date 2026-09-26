import React, { useState, useEffect } from 'react';
import { 
  Play, CheckCircle2, Clock, User, Layers, DollarSign, Bell, AlertTriangle, RefreshCw, X 
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DryRunModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DentalDryRunModal({ open, onClose }: DryRunModalProps) {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      setLoadingCases(true);
      apiClient.get('/dental-lab/cases?limit=25')
        .then((res) => {
          const payload = res.data?.data;
          const list = Array.isArray(payload) ? payload : (payload?.items || []);
          setCases(list);
          if (list.length > 0) setSelectedCaseId(list[0].id);
        })
        .catch((err) => console.warn('Failed to load cases for dry run:', err))
        .finally(() => setLoadingCases(false));
    }
  }, [open]);

  const handleRunSimulation = async () => {
    if (!selectedCaseId) return;
    setSimulating(true);
    setResult(null);
    try {
      const res = await apiClient.post('/dental-lab/policies/dry-run', { caseId: selectedCaseId });
      setResult(res.data?.data || null);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشلت تجربة المحاكاة');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Play className="size-4 text-primary" />
            محاكي الأتمتة والسياسات (جرّب على حالة - Dry Run)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            اختبر تطبيق سياسات الإسناد والمواعيد والمالية على حالة حقيقية دون أي تعديل في قاعدة البيانات
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Case Selector */}
          <div>
            <Label className="text-xs font-semibold mb-1 block">اختر الحالة للتجربة عليها</Label>
            {loadingCases ? (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                <RefreshCw className="size-3.5 animate-spin" /> جاري تحميل الحالات...
              </div>
            ) : (
              <select
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber || c.id} — {c.patientName || 'مريض'} ({c.workTypeName || 'شغل'}) [
                    {c.status}]
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={handleRunSimulation}
            disabled={!selectedCaseId || simulating}
            className="w-full gap-2"
          >
            {simulating ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
            تشغيل المحاكاة الآن
          </Button>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">نتائج المحاكاة الافتراضية</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                  نجحت التجربة (آمنة 100%)
                </Badge>
              </div>

              {/* 1. Due Date Calculation */}
              <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Clock className="size-3.5 text-blue-500" /> موعد التسليم المحسوب
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold tabular-nums">
                    {result.calculatedDueDate ? new Date(result.calculatedDueDate).toLocaleDateString('ar-EG') : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">{result.leadTimeReason || 'حسب نوع الشغل'}</span>
                </div>
              </div>

              {/* 2. Technician Assignment */}
              <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <User className="size-3.5 text-purple-500" /> الفني المرشح للإسناد
                </div>
                {result.assignedTechnician ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">{result.assignedTechnician.name}</span>
                      <span className="text-xs text-muted-foreground block">
                        الاستراتيجية: {result.assignmentStrategy}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      الحمل الحالي: {result.assignedTechnician.activeCasesCount ?? 0} حالات
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">لم يتم العثور على فني متاح يطابق الشروط أو وضع الإسناد يدوي</p>
                )}
              </div>

              {/* 3. Generated Stages Preview */}
              <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Layers className="size-3.5 text-amber-500" /> مراحل العمل المقترحة ({result.stages?.length || 0})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(result.stages || []).map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <span>{idx + 1}. {s.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.stageWage > 0 ? `أجر: ${s.stageWage} ج.م` : 'أجر قياسي'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Financial Postings Preview */}
              <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <DollarSign className="size-3.5 text-emerald-500" /> الحركات المالية المتوقعة
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>فاتورة الحالة:</span>
                    <Badge variant="outline" className="text-[10px]">
                      وضع الترحيل: {result.financialModes?.caseInvoice || 'CONFIRM'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>خصم مخزون الوصفة (BOM):</span>
                    <Badge variant="outline" className="text-[10px]">
                      وضع الترحيل: {result.financialModes?.caseBomConsumption || 'CONFIRM'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 5. Notification preview */}
              <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Bell className="size-3.5 text-indigo-500" /> التنبيهات
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>• إخطار الطبيب: {result.notifications?.doctorEnabled ? 'مفعّل ✅' : 'معطل ❌'}</p>
                  <p>• إخطار المريض: {result.notifications?.patientEnabled ? 'مفعّل ✅' : 'معطل ❌'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

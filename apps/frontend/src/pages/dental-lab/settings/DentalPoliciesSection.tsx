import React, { useEffect, useState } from 'react';
import { 
  Bot, Clock, UserCheck, Bell, ShieldCheck, Play, 
  RefreshCw, CheckCircle2, AlertTriangle, Save 
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DentalDryRunModal from './DentalDryRunModal';

export default function DentalPoliciesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningEscalation, setRunningEscalation] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);

  const [policies, setPolicies] = useState({
    assignment: {
      mode: 'MANUAL',
      strategy: 'LEAST_LOAD',
      respectWorkingDays: true,
      respectDailyCap: true,
    },
    dueDate: {
      defaultLeadDays: 3,
      urgentReductionDays: 1,
      urgentReductionPercent: 50,
    },
    fields: {
      patientPhoneRequired: false,
    },
    escalation: {
      escalationHours: 24,
      notifyOwnerOnOverdue: true,
    },
    notify: {
      doctorEnabled: true,
      patientEnabled: true,
    },
  });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/dental-lab/policies');
      if (res.data?.data) {
        setPolicies((prev) => ({
          ...prev,
          ...res.data.data,
          assignment: { ...prev.assignment, ...(res.data.data.assignment || {}) },
          dueDate: { ...prev.dueDate, ...(res.data.data.dueDate || {}) },
          fields: { ...prev.fields, ...(res.data.data.fields || {}) },
          escalation: { ...prev.escalation, ...(res.data.data.escalation || {}) },
          notify: { ...prev.notify, ...(res.data.data.notify || {}) },
        }));
      }
    } catch (err) {
      console.warn('Could not load dental policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/dental-lab/policies', policies);
      alert('تم حفظ السياسات وقواعد الأتمتة بنجاح');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'حدث خطأ أثناء حفظ السياسات');
    } finally {
      setSaving(false);
    }
  };

  const handleRunEscalation = async () => {
    setRunningEscalation(true);
    try {
      const res = await apiClient.post('/dental-lab/policies/escalation/run');
      alert(`تم فحص الحالات المتأخرة بنجاح (${res.data?.data?.escalatedCount || 0} حالة متأخرة)`);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'فشل تشغيل فحص التصعيد');
    } finally {
      setRunningEscalation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            الأتمتة والسياسات التشغيلية
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            قواعد إسناد العمل التلقائي ومواعيد التسليم وإشعارات المرضى وتصعيد التأخير
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDryRunOpen(true)} className="gap-1.5">
            <Play className="size-3.5 text-blue-500" />
            جرّب على حالة (Dry-Run)
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            حفظ السياسات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Technician Assignment Rules */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-primary" />
              سياسة إسناد الفنيين
            </h3>
            <Badge variant={policies.assignment.mode === 'AUTO' ? 'default' : 'secondary'} className="text-[10px]">
              {policies.assignment.mode === 'AUTO' ? 'إسناد تلقائي' : 'إسناد يدوي'}
            </Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">وضع الإسناد</Label>
              <select
                className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                value={policies.assignment.mode}
                onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, mode: e.target.value } }))}
              >
                <option value="MANUAL">يدوي (يحدد المستخدم الفني)</option>
                <option value="AUTO">تلقائي (حسب جدول وقدرة الفنيين)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">استراتيجية التوزيع التلقائي</Label>
              <select
                className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                value={policies.assignment.strategy}
                onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, strategy: e.target.value } }))}
              >
                <option value="LEAST_LOAD">الأقل عبئاً (الأقل حالات نشطة)</option>
                <option value="ROUND_ROBIN">توزيع دوري عادل (Round Robin)</option>
                <option value="SPECIALTY_FIRST">حسب التخصص أولاً</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/30">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.assignment.respectWorkingDays}
                  onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, respectWorkingDays: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>مراعاة أيام العمل والإجازات الرسمية للفني</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.assignment.respectDailyCap}
                  onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, respectDailyCap: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>مراعاة الحد الأقصى اليومي للحالات لكل فني (Daily Cap)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. Due Date Calculation Rules */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-4 text-blue-500" />
            قواعد حساب موعد التسليم (Lead Time)
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">مدة التنفيذ القياسية الافتراضية (أيام عمل)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={policies.dueDate.defaultLeadDays}
                onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, defaultLeadDays: parseInt(e.target.value, 10) || 1 } }))}
                className="mt-1"
              />
              <span className="text-[11px] text-muted-foreground">تُطبق عند عدم تخصيص مدة محددة لنوع العمل</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">تخفيض الحالات العاجلة (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="90"
                  value={policies.dueDate.urgentReductionPercent}
                  onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, urgentReductionPercent: parseInt(e.target.value, 10) || 0 } }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">أو خصم أيام ثابتة</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={policies.dueDate.urgentReductionDays}
                  onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, urgentReductionDays: parseInt(e.target.value, 10) || 0 } }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fields Validation & Policies */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            سياسات حقول الإدخال
          </h3>

          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={policies.fields.patientPhoneRequired}
                onChange={(e) => setPolicies(p => ({ ...p, fields: { ...p.fields, patientPhoneRequired: e.target.checked } }))}
                className="rounded border-input text-primary"
              />
              <span className="font-medium">إلزامية رقم هاتف المريض في كل طلب جديد</span>
            </label>
            <p className="text-[11px] text-muted-foreground mr-6">
              عند التفعيل، لن يتم قبول إنشاء طلب بدون إدخال رقم هاتف مصري صحيح للمريض لتسهيل المتابعة وإرسال التنبيهات.
            </p>
          </div>
        </div>

        {/* 4. Escalation & Overdue Monitor */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="size-4 text-rose-500" />
              تصعيد التأخير والتنبيهات
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunEscalation}
              disabled={runningEscalation}
              className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              {runningEscalation ? <RefreshCw className="size-3 animate-spin" /> : <Bell className="size-3" />}
              فحص التأخير الآن
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">ساعات السماح قبل تصعيد التأخير للمدير</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={policies.escalation.escalationHours}
                onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, escalationHours: parseInt(e.target.value, 10) || 24 } }))}
                className="mt-1"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-border/30">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.notify.patientEnabled}
                  onChange={(e) => setPolicies(p => ({ ...p, notify: { ...p.notify, patientEnabled: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>إرسال رسائل WhatsApp للمريض عند استلام وتجهيز الحالة</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.escalation.notifyOwnerOnOverdue}
                  onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, notifyOwnerOnOverdue: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>تنبيه مالك المعمل فور تجاوز موعد التسليم</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dry Run Modal */}
      <DentalDryRunModal open={dryRunOpen} onClose={() => setDryRunOpen(false)} />
    </div>
  );
}

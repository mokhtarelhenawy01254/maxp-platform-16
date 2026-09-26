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
      mode: 'SUGGEST',
      strategy: 'LEAST_LOADED',
      respectSchedule: true,
      dailyCapPerTechnician: 0,
      stageScope: 'STAGE',
      fallbackMode: 'SUGGEST',
    },
    dueDate: {
      fromWorkType: true,
      defaultLeadDays: 5,
      urgentRule: 'PERCENT',
      urgentValue: 50,
      minDays: 1,
    },
    fields: {
      patientPhoneRequired: false,
      requireToothAndShade: false,
    },
    escalation: {
      enabled: true,
      afterHoursInStage: 24,
      target: 'BACKUP_ROLE',
      maxLevels: 2,
      notify: true,
    },
    notify: {
      doctorEnabled: true,
      patientEnabled: false,
    },
  });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/dental-lab/policies');
      const loaded = res.data?.data?.policies || res.data?.data;
      if (loaded) {
        setPolicies((prev) => ({
          ...prev,
          assignment: {
            ...prev.assignment,
            ...(loaded.assignment || {}),
            mode: loaded.assignment?.mode || prev.assignment.mode,
            strategy: loaded.assignment?.strategy || prev.assignment.strategy,
            respectSchedule: loaded.assignment?.respectSchedule !== undefined 
              ? Boolean(loaded.assignment.respectSchedule) 
              : Boolean(loaded.assignment?.respectWorkingDays ?? prev.assignment.respectSchedule),
            dailyCapPerTechnician: Number(loaded.assignment?.dailyCapPerTechnician ?? loaded.assignment?.dailyCap ?? prev.assignment.dailyCapPerTechnician) || 0,
          },
          dueDate: {
            ...prev.dueDate,
            ...(loaded.dueDate || {}),
            defaultLeadDays: Number(loaded.dueDate?.defaultLeadDays) || prev.dueDate.defaultLeadDays,
            urgentRule: loaded.dueDate?.urgentRule || prev.dueDate.urgentRule,
            urgentValue: Number(loaded.dueDate?.urgentValue ?? loaded.dueDate?.urgentReductionPercent ?? prev.dueDate.urgentValue) || 50,
            minDays: Number(loaded.dueDate?.minDays) || prev.dueDate.minDays,
          },
          fields: {
            ...prev.fields,
            ...(loaded.fields || {}),
            patientPhoneRequired: Boolean(loaded.fields?.patientPhoneRequired),
            requireToothAndShade: Boolean(loaded.fields?.requireToothAndShade),
          },
          escalation: {
            ...prev.escalation,
            ...(loaded.escalation || {}),
            enabled: loaded.escalation?.enabled !== false,
            afterHoursInStage: Number(loaded.escalation?.afterHoursInStage ?? loaded.escalation?.escalationHours ?? prev.escalation.afterHoursInStage) || 24,
            target: loaded.escalation?.target || prev.escalation.target,
            notify: loaded.escalation?.notify !== undefined 
              ? Boolean(loaded.escalation.notify) 
              : Boolean(loaded.escalation?.notifyOwnerOnOverdue ?? prev.escalation.notify),
          },
          notify: {
            ...prev.notify,
            ...(loaded.notify || {}),
            patientEnabled: Boolean(loaded.notify?.patientEnabled),
            doctorEnabled: loaded.notify?.doctorEnabled !== false,
          },
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
      await loadPolicies();
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
      alert(`تم فحص الحالات المتأخرة بنجاح (${res.data?.data?.escalatedCount || 0} مرحلة تم تصعيدها)`);
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

  const getModeBadge = () => {
    if (policies.assignment.mode === 'AUTO') return <Badge className="bg-emerald-600 text-white text-[10px]">إسناد تلقائي فوري</Badge>;
    if (policies.assignment.mode === 'SUGGEST') return <Badge variant="secondary" className="text-[10px]">اقتراح ذكي (يدوي)</Badge>;
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>;
  };

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
            قواعد إسناد العمل التلقائي ومواعيد التسليم وإشعارات المرضى وتصعيد التأخير المربوطة بمحرك المعمل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDryRunOpen(true)} className="gap-1.5">
            <Play className="size-3.5 text-blue-500" />
            محاكاة حالة (Dry-Run)
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
            {getModeBadge()}
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">وضع الإسناد (Assignment Mode)</Label>
              <select
                className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                value={policies.assignment.mode}
                onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, mode: e.target.value as any } }))}
              >
                <option value="SUGGEST">اقتراح ذكي (ترشيح الفني الأنسب مع اعتماد المستخدم)</option>
                <option value="AUTO">إسناد تلقائي فوري (حسب جدول وقدرة الفنيين)</option>
                <option value="OFF">معطّل (إدخال يدوي دون اقتراح آلي)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">استراتيجية توزيع الحالات (Distribution Strategy)</Label>
              <select
                className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                value={policies.assignment.strategy}
                onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, strategy: e.target.value as any } }))}
              >
                <option value="LEAST_LOADED">الأقل عبئاً (أقل عدد مراحل نشطة حالياً)</option>
                <option value="ROUND_ROBIN">توزيع دوري عادل (Round Robin - من لم يُسند له عمل لأطول فترة)</option>
                <option value="BY_ROLE_MATCH">أولوية مطابقة الدور التخصصي أولاً (Specialty Match)</option>
                <option value="OLDEST_WAITING">الأقدم انتظاراً (الأطول تفرغاً)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">سقف الحالات اليومي الافتراضي لكل فني (Daily Cap)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={policies.assignment.dailyCapPerTechnician}
                onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, dailyCapPerTechnician: Math.max(0, parseInt(e.target.value, 10) || 0) } }))}
                className="mt-1 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">0 تعني غير محدود (ويمكن تخصيص سقف منفصل لكل فني من صفحة الفنيين)</span>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/30">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.assignment.respectSchedule}
                  onChange={(e) => setPolicies(p => ({ ...p, assignment: { ...p.assignment, respectSchedule: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span className="font-medium">مراعاة جدول عمل الفنيين (عدم إسناد الحالات في أيام العطلات والإجازات)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. Due Date Calculation Rules */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-4 text-blue-500" />
            قواعد حساب موعد التسليم (Lead Time & Due Date)
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">مدة التنفيذ القياسية الافتراضية (أيام عمل)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={policies.dueDate.defaultLeadDays}
                onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, defaultLeadDays: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                className="mt-1 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">تُطبق كمهلة افتراضية عند عدم تحديد مدة خاصة لنوع العمل</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">قاعدة الحالات المستعجلة (Urgent Rule)</Label>
                <select
                  className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                  value={policies.dueDate.urgentRule}
                  onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, urgentRule: e.target.value as any } }))}
                >
                  <option value="PERCENT">نسبة مئوية (%)</option>
                  <option value="FIXED_DAYS">عدد أيام ثابت</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">
                  {policies.dueDate.urgentRule === 'PERCENT' ? 'النسبة المئوية (%)' : 'عدد الأيام'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={policies.dueDate.urgentRule === 'PERCENT' ? 90 : 10}
                  value={policies.dueDate.urgentValue}
                  onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, urgentValue: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">الحد الأدنى لأيام التسليم (Min Days)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={policies.dueDate.minDays}
                onChange={(e) => setPolicies(p => ({ ...p, dueDate: { ...p.dueDate, minDays: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                className="mt-1 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">يمنع النظام احتساب مدة أقل من هذا الحد مهما كانت نسبة الاستعجال</span>
            </div>
          </div>
        </div>

        {/* 3. Fields Validation & Policies */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            سياسات حقول الإدخال الإلزامية
          </h3>

          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={policies.fields.patientPhoneRequired}
                onChange={(e) => setPolicies(p => ({ ...p, fields: { ...p.fields, patientPhoneRequired: e.target.checked } }))}
                className="rounded border-input text-primary"
              />
              <span className="font-medium">إلزامية رقم هاتف المريض في كل طلب جديد (P7)</span>
            </label>
            <p className="text-[11px] text-muted-foreground mr-6">
              يمنع إنشاء الطلب بدون إدخال رقم هاتف محمول صحيح للمريض لإرسال تنبيهات المتابعة والبحث السريع.
            </p>

            <label className="flex items-center gap-2 text-xs cursor-pointer pt-2 border-t border-border/30">
              <input
                type="checkbox"
                checked={policies.fields.requireToothAndShade}
                onChange={(e) => setPolicies(p => ({ ...p, fields: { ...p.fields, requireToothAndShade: e.target.checked } }))}
                className="rounded border-input text-primary"
              />
              <span className="font-medium">إلزامية تحديد موضع السن واللون في ويزارد الطلب</span>
            </label>
            <p className="text-[11px] text-muted-foreground mr-6">
              يضمن عدم تسجيل أي حالة تركيبات بدون رقم السن أو لون الـ VITA المطابق.
            </p>
          </div>
        </div>

        {/* 4. Escalation & Overdue Monitor */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="size-4 text-rose-500" />
              تصعيد التأخير التلقائي (Automated Escalation)
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunEscalation}
              disabled={runningEscalation}
              className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              {runningEscalation ? <RefreshCw className="size-3 animate-spin" /> : <Bell className="size-3" />}
              فحص التصعيد الآن
            </Button>
          </div>

          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={policies.escalation.enabled}
                onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, enabled: e.target.checked } }))}
                className="rounded border-input text-primary"
              />
              <span className="font-medium">تفعيل نظام التصعيد التلقائي للمراحل المتأخرة</span>
            </label>

            <div>
              <Label className="text-xs">ساعات السماح بالمرحلة قبل تصعيدها (SLA Hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={policies.escalation.afterHoursInStage}
                onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, afterHoursInStage: Math.max(1, parseInt(e.target.value, 10) || 24) } }))}
                className="mt-1 font-mono"
              />
              <span className="text-[11px] text-muted-foreground">عند تجاوز المرحلة لهذه المهلة، يُعاد إسنادها تلقائيًا للبديل المفضل أو فني زميل</span>
            </div>

            <div>
              <Label className="text-xs">جهة التصعيد المستهدفة (Escalation Target)</Label>
              <select
                className="w-full mt-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
                value={policies.escalation.target}
                onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, target: e.target.value as any } }))}
              >
                <option value="BACKUP_ROLE">الفني الاحتياطي المفضل ثم زميل مطابق للدور</option>
                <option value="SUPERVISOR">إشعار المشرف المباشر وتوزيعها يدوياً</option>
              </select>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/30">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.escalation.notify}
                  onChange={(e) => setPolicies(p => ({ ...p, escalation: { ...p.escalation, notify: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>تنبيه مالك المعمل والمشرف فور تصعيد أو تعثر أي مرحلة متأخرة</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.notify.patientEnabled}
                  onChange={(e) => setPolicies(p => ({ ...p, notify: { ...p.notify, patientEnabled: e.target.checked } }))}
                  className="rounded border-input text-primary"
                />
                <span>إرسال رسائل WhatsApp للمريض عند استلام وتجهيز الحالة</span>
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

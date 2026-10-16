import React from 'react';
import { BookOpen } from 'lucide-react';
import { ManufacturingSettings, AccountOption } from '../../manufacturingApi';

interface SettingsGlMappingCardProps {
  settings: ManufacturingSettings;
  accounts: AccountOption[];
  onChange: (field: keyof ManufacturingSettings, value: any) => void;
}

export const SettingsGlMappingCard: React.FC<SettingsGlMappingCardProps> = ({
  settings,
  accounts,
  onChange,
}) => {
  return (
    <div className="p-6 rounded-xl bg-card border border-border/70 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>ربط حسابات التصنيع بدليل الحسابات العام (GL Account Mapping)</span>
        </h4>
        <span className="text-[11px] text-muted-foreground">
          تحديد أرقام الحسابات يضمن ترحيل قيود WIP والتام بدقة 100%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* WIP */}
        <div className="space-y-1">
          <label className="block font-medium text-foreground">
            حساب إنتاج تحت التشغيل WIP (110402)
          </label>
          <select
            value={settings.wipAccountId || ''}
            onChange={(e) => onChange('wipAccountId', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- افتراضي النظام (110402) --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            مدين بالخامات والأجور والأعباء، ودائن عند استلام التام.
          </p>
        </div>

        {/* Raw Materials */}
        <div className="space-y-1">
          <label className="block font-medium text-foreground">
            حساب مخزون الخامات ومستلزمات الإنتاج (110401)
          </label>
          <select
            value={settings.rawMaterialsAccountId || ''}
            onChange={(e) => onChange('rawMaterialsAccountId', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- افتراضي النظام (110401) --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">دائن عند صرف الخامات لأمر التشغيل.</p>
        </div>

        {/* Accrued Wages */}
        <div className="space-y-1">
          <label className="block font-medium text-foreground">
            حساب الأجور ومستحقات العمالة المباشرة (210201)
          </label>
          <select
            value={settings.accruedWagesAccountId || ''}
            onChange={(e) => onChange('accruedWagesAccountId', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- افتراضي النظام (210201) --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            دائن عند تسجيل أجور عمال مراحل الإنتاج.
          </p>
        </div>

        {/* Overhead Applied */}
        <div className="space-y-1">
          <label className="block font-medium text-foreground">
            حساب تكاليف صناعية غير مباشرة محملة MOH (5103)
          </label>
          <select
            value={settings.overheadAppliedAccountId || ''}
            onChange={(e) => onChange('overheadAppliedAccountId', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- افتراضي النظام (5103) --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            دائن عند تحميل الأعباء الإضافية على أمر الإنتاج.
          </p>
        </div>

        {/* Finished Goods */}
        <div className="space-y-1">
          <label className="block font-medium text-foreground">
            حساب مخزون الإنتاج التام الجاهز للبيع (110403)
          </label>
          <select
            value={settings.finishedGoodsAccountId || ''}
            onChange={(e) => onChange('finishedGoodsAccountId', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- افتراضي النظام (110403) --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            مدين عند استلام البضاعة التامة في المستودع.
          </p>
        </div>
      </div>
    </div>
  );
};

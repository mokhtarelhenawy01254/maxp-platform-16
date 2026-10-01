import React, { useState } from 'react';
import { AVAILABLE_SCOPES, TenantCompany, CreateCredentialInput } from '../types';
import { X, AlertTriangle, ShieldCheck, Key, Globe, Calendar, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCredentialInput) => Promise<void>;
  companies: TenantCompany[];
  submitting: boolean;
}

export const CreateCredentialModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  companies,
  submitting
}) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => {
    // Default 180 days in future
    const d = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [allowedIps, setAllowedIps] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'analytics:read',
    'orders:read',
    'products:read',
    'landing:read',
    'leads:read',
    'subscriptions:read'
  ]);

  if (!isOpen) return null;

  const hasHighPrivilege = selectedScopes.includes('*') || selectedScopes.includes('platform:read');

  const toggleScope = (scopeVal: string) => {
    if (scopeVal === '*') {
      setSelectedScopes((prev) => (prev.includes('*') ? [] : ['*']));
      return;
    }

    setSelectedScopes((prev) => {
      const withoutWildcard = prev.filter((s) => s !== '*');
      if (withoutWildcard.includes(scopeVal)) {
        return withoutWildcard.filter((s) => s !== scopeVal);
      }
      return [...withoutWildcard, scopeVal];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!expiresAt) return;

    await onSubmit({
      name: name.trim(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
      scopes: selectedScopes,
      expiresAt,
      allowedIps: allowedIps.trim() || undefined,
      companyId: companyId.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">إنشاء مفتاح API خارجي جديد</h2>
              <p className="text-xs text-muted-foreground">صلاحيات برمجية موجهة للوكلاء وبوتات التسويق مع سجل تدقيق</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          {/* High Privilege Warning */}
          {hasHighPrivilege && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                تحذير: صلاحيات عليا محددة (Full Access أو Platform-Wide)
              </div>
              <p className="leading-relaxed">
                هذا المفتاح يمنح حق الوصول لقراءة بيانات المنصة بالكامل عبر كافة الشركات. سيتم تدوين كل طلب بدقة في سجل التدقيق ومراقبة عناوين IP.
              </p>
            </div>
          )}

          {/* Key Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                اسم المفتاح <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: Marketing Intelligence Bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">وسم / تسمية (Label)</label>
              <input
                type="text"
                placeholder="مثال: External Agent Team"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Company & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">الشركة المستهدفة (Scope)</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              >
                <option value="">كل الشركات (مستوى المنصة Platform-Wide)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>تاريخ انتهاء الصلاحية <span className="text-rose-500">* (إجباري)</span></span>
              </label>
              <input
                type="datetime-local"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background tabular-nums focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>
          </div>

          {/* IP Allowlist */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>قائمة عناوين IP المسموح بها (اختياري)</span>
              <span className="text-[11px] text-muted-foreground">مفصولة بفواصل أو أسطر</span>
            </label>
            <input
              type="text"
              placeholder="مثال: 197.165.20.12, 102.40.18.5"
              value={allowedIps}
              onChange={(e) => setAllowedIps(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background font-mono text-xs tabular-nums focus:ring-2 focus:ring-primary/40 focus:outline-none"
            />
          </div>

          {/* Scopes Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              السكوبات والصلاحيات الممنوحة <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 rounded-xl border border-border/50 bg-muted/20">
              {AVAILABLE_SCOPES.map((scope) => {
                const isChecked = selectedScopes.includes(scope.value);
                return (
                  <label
                    key={scope.value}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                      isChecked
                        ? scope.isHighPrivilege
                          ? 'border-rose-500/50 bg-rose-500/5'
                          : 'border-primary/50 bg-primary/5'
                        : 'border-transparent hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        {scope.label}
                        {scope.isHighPrivilege && (
                          <span className="text-[10px] text-rose-500 font-bold px-1 rounded bg-rose-500/10">حساس</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border/60 hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || selectedScopes.length === 0}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'جاري التوليد...' : 'توليد المفتاح الآن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

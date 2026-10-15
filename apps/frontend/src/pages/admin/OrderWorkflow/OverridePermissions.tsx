import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Fingerprint,
  AlertTriangle,
  Check,
  ShieldCheck,
  Save,
} from 'lucide-react';
import orderWorkflowService, { OrderWorkflowConfig } from '../../../services/orderWorkflowService';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuthSimple';

const getAvailableRoles = (t: any) => [
  { value: 'OWNER', label: t('orderSettings.k_70') },
  { value: 'SUPER_ADMIN', label: t('orderSettings.k_71') },
  { value: 'COMPANY_ADMIN', label: t('orderSettings.k_72') },
  { value: 'MANAGER', label: t('orderSettings.k_73') },
  { value: 'AGENT', label: t('orderSettings.k_74') },
];

interface Props {
  config: OrderWorkflowConfig | null;
  onUpdate: () => void;
}

const OverridePermissions: React.FC<Props> = ({ config, onUpdate }) => {
  const { t } = useTranslation();
  const AVAILABLE_ROLES = React.useMemo(() => getAvailableRoles(t), [t]);
  const { user } = useAuth();
  const selectedRoles: string[] = config?.overrideRoles
    ? JSON.parse(config.overrideRoles)
    : ['OWNER', 'SUPER_ADMIN'];

  const [draftRoles, setDraftRoles] = useState<string[]>(selectedRoles);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasChanges = JSON.stringify([...draftRoles].sort()) !== JSON.stringify([...selectedRoles].sort());

  useEffect(() => {
    if (user?.companyId) {
      api.get(`/companies/${user.companyId}/users?limit=100`)
        .then(res => {
          if (res.data?.success && res.data?.data?.users) {
            setEmployees(res.data.data.users);
          }
        })
        .catch(err => console.error('Failed to fetch employees', err));
    }
  }, [user?.companyId]);

  const handleToggle = (role: string) => {
    setDraftRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (draftRoles.length === 0) return;
    try {
      setSaving(true);
      await orderWorkflowService.updateConfig({ overrideRoles: JSON.stringify(draftRoles) });
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save override roles', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">{t('orderSettings.k_115')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('orderSettings.k_116')}</p>
        </div>
      </div>

      {/* Allow Override Toggle Card */}
      <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('orderSettings.k_117')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('orderSettings.k_118')}</p>
        </div>
        <button
          onClick={async () => {
            await orderWorkflowService.updateConfig({ allowOverride: !config?.allowOverride });
            onUpdate();
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-hidden ${config?.allowOverride !== false ? 'bg-primary' : 'bg-muted border border-border/70'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.allowOverride !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{t('orderSettings.k_119')}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('orderSettings.k_159')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/70 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {t('orderSettings.k_160')}
            </h3>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map(role => {
                const isSelected = draftRoles.includes(role.value);
                return (
                  <button
                    key={role.value}
                    onClick={() => handleToggle(role.value)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 text-foreground font-semibold'
                        : 'bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Fingerprint className="w-4 h-4 text-primary" />
                      <span>{role.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/80'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Employee-level override selection */}
            {employees.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  {t('orderSettings.k_161')}
                </h4>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto p-1.5 border border-border/60 rounded-lg bg-muted/20">
                  {employees.map(emp => {
                    const isSelected = draftRoles.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => handleToggle(emp.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary/30 text-foreground font-semibold'
                            : 'bg-card border-border/60 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <span>{emp.firstName} {emp.lastName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/80'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {draftRoles.length === 0 && (
              <p className="text-xs text-destructive">{t('orderSettings.k_120')}</p>
            )}

            <button
              onClick={handleSave}
              disabled={!hasChanges || draftRoles.length === 0 || saving}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                !hasChanges || draftRoles.length === 0
                  ? 'bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {saving ? t('orderSettings.k_121') : saved ? t('orderSettings.k_122') : t('orderSettings.k_123')}
            </button>
          </div>
        </div>

        {/* Warning Policy Box */}
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">{t('orderSettings.k_124')}</h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('orderSettings.k_162')}
          </p>
          <div className="space-y-2 pt-2 border-t border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p>{t('orderSettings.k_125')}</p>
            </div>
            <div className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p>{t('orderSettings.k_126')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverridePermissions;

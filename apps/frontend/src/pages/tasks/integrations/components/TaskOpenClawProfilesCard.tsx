import React from 'react';
import type {
  OpenClawProfile,
  OpenClawQuickSetupState,
} from '../types/taskIntegrationTypes';
import {
  formatDateTime,
  toOpenClawQuickSetupState,
} from '../utils/taskIntegrationConstants';

interface TaskOpenClawProfilesCardProps {
  openClawProfiles: OpenClawProfile[];
  currentOpenClawProfile: OpenClawProfile | null;
  hydratingOpenClawProfileId: string | null;
  deletingOpenClawProfileId: string | null;
  onHydrateProfile: (profile: OpenClawProfile) => void;
  onQuickSetupChange: React.Dispatch<React.SetStateAction<OpenClawQuickSetupState>>;
  onDeleteProfile: (profile: OpenClawProfile) => void;
}

export const TaskOpenClawProfilesCard: React.FC<
  TaskOpenClawProfilesCardProps
> = ({
  openClawProfiles,
  currentOpenClawProfile,
  hydratingOpenClawProfileId,
  deletingOpenClawProfileId,
  onHydrateProfile,
  onQuickSetupChange,
  onDeleteProfile,
}) => {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/75 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            الإعدادات المحفوظة للشركة
          </div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            احفظ `local` و`production` مرة واحدة، وبعدها سيُستخدم Hook
            Token المحفوظة تلقائيًا عند الإنشاء أو الاختبار.
          </p>
        </div>
        <div className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
          <span className="tabular-nums font-mono">{openClawProfiles.length}</span> إعداد محفوظ
        </div>
      </div>

      {openClawProfiles.length === 0 ? (
        <div className="mt-3 rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
          لا توجد إعدادات OpenClaw محفوظة بعد لهذه الشركة.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {openClawProfiles.map((profile) => (
            <div
              key={profile.id}
              className={`rounded-2xl border p-4 ${
                currentOpenClawProfile?.id === profile.id
                  ? 'border-secondary/25 bg-secondary/10 shadow-[0_20px_60px_-48px_rgba(34,199,201,0.4)]'
                  : 'border-border/70 bg-background/72'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-foreground">
                  {profile.name}
                </div>
                <span className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-xs font-semibold text-foreground">
                  {profile.environment === 'local' ? 'محلي' : 'إنتاج'}
                </span>
                {currentOpenClawProfile?.id === profile.id && (
                  <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                    البيئة الحالية
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">
                    Base URL:
                  </span>{' '}
                  <span className="font-mono">{profile.baseUrl}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    Hook Token:
                  </span>{' '}
                  <span className="font-mono">
                    {profile.hookTokenMasked || 'محفوظة'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    آخر تحديث:
                  </span>{' '}
                  <span className="tabular-nums font-mono">
                    {formatDateTime(profile.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onHydrateProfile(profile)}
                  disabled={hydratingOpenClawProfileId === profile.id}
                  className="rounded-2xl border border-secondary/20 bg-secondary/8 px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {hydratingOpenClawProfileId === profile.id
                    ? 'جارٍ التحميل...'
                    : 'استخدام الإعداد'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onQuickSetupChange(toOpenClawQuickSetupState(profile))
                  }
                  className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                >
                  تحميل البيانات
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProfile(profile)}
                  disabled={deletingOpenClawProfileId === profile.id}
                  className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/40"
                >
                  {deletingOpenClawProfileId === profile.id
                    ? 'جارٍ الحذف...'
                    : 'حذف'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

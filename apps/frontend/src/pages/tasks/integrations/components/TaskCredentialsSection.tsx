import React from 'react';
import type {
  CredentialFormState,
  TaskCredential,
} from '../types/taskIntegrationTypes';
import { formatDateTime } from '../utils/taskIntegrationConstants';
import { TaskCredentialForm } from './TaskCredentialForm';

interface TaskCredentialsSectionProps {
  credentials: TaskCredential[];
  loading: boolean;
  showCredentialForm: boolean;
  editingCredential: TaskCredential | null;
  credentialForm: CredentialFormState;
  submittingCredential: boolean;
  userOptions: { id: string; label: string }[];
  onFormChange: React.Dispatch<React.SetStateAction<CredentialFormState>>;
  onToggleScope: (scope: string) => void;
  onSubmitCredential: () => void;
  onCancelCredentialForm: () => void;
  onStartEditingCredential: (credential: TaskCredential) => void;
  onRotateCredential: (credential: TaskCredential) => void;
  onToggleActiveState: (credential: TaskCredential) => void;
  onRevokeCredential: (credential: TaskCredential) => void;
}

export const TaskCredentialsSection: React.FC<TaskCredentialsSectionProps> = ({
  credentials,
  loading,
  showCredentialForm,
  editingCredential,
  credentialForm,
  submittingCredential,
  userOptions,
  onFormChange,
  onToggleScope,
  onSubmitCredential,
  onCancelCredentialForm,
  onStartEditingCredential,
  onRotateCredential,
  onToggleActiveState,
  onRevokeCredential,
}) => {
  return (
    <section className="rounded-[28px] border border-border/70 bg-card/72 p-5 shadow-[0_22px_70px_-54px_rgba(15,27,45,0.28)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            مفاتيح الـ API
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums font-mono">{credentials.length}</span>{' '}
            مفتاح نشط أو محفوظ حاليًا للشركة
          </p>
        </div>
      </div>

      {showCredentialForm && (
        <TaskCredentialForm
          editingCredential={editingCredential}
          credentialForm={credentialForm}
          submittingCredential={submittingCredential}
          userOptions={userOptions}
          onFormChange={onFormChange}
          onToggleScope={onToggleScope}
          onSubmit={onSubmitCredential}
          onCancel={onCancelCredentialForm}
        />
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
            جارٍ تحميل المفاتيح...
          </div>
        ) : credentials.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
            لا توجد مفاتيح تكامل حتى الآن.
          </div>
        ) : (
          credentials.map((credential) => (
            <div
              key={credential.id}
              className="rounded-[24px] border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-foreground">
                      {credential.name}
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        credential.isActive
                          ? 'border border-primary/20 bg-primary/8 text-primary'
                          : 'border border-border/60 bg-background/75 text-muted-foreground'
                      }`}
                    >
                      {credential.isActive ? 'نشط' : 'معطل'}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {credential.ownershipType === 'USER'
                        ? 'مفتاح مستخدم'
                        : 'مفتاح شركة'}
                    </span>
                  </div>
                  {credential.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {credential.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onStartEditingCredential(credential)}
                    className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    تحرير
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateCredential(credential)}
                    className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
                  >
                    تدوير المفتاح
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActiveState(credential)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                      credential.isActive
                        ? 'border border-border/60 bg-background/75 text-foreground hover:bg-background'
                        : 'border border-primary/20 bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    {credential.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevokeCredential(credential)}
                    className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/12 dark:text-rose-300"
                  >
                    إلغاء
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                  <div className="text-xs text-muted-foreground">
                    المفتاح الظاهر
                  </div>
                  <div className="mt-1 font-mono text-xs leading-6 text-foreground tabular-nums">
                    {credential.keyPrefixMasked || 'غير متوفر'}
                  </div>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                  <div className="text-xs text-muted-foreground">
                    المستخدم المرتبط
                  </div>
                  <div className="mt-1 text-foreground">
                    {credential.ownershipType === 'USER'
                      ? credential.userName || 'غير محدد'
                      : credential.defaultActingUserName || 'غير محدد'}
                  </div>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                  <div className="text-xs text-muted-foreground">
                    آخر استخدام
                  </div>
                  <div className="mt-1 tabular-nums font-mono text-foreground">
                    {formatDateTime(credential.lastUsedAt)}
                  </div>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                  <div className="text-xs text-muted-foreground">
                    ينتهي في
                  </div>
                  <div className="mt-1 tabular-nums font-mono text-foreground">
                    {formatDateTime(credential.expiresAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {credential.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs font-semibold text-foreground font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

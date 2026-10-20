import React from 'react';
import type {
  CredentialFormState,
  TaskCredential,
} from '../types/taskIntegrationTypes';
import { TASK_SCOPE_OPTIONS } from '../utils/taskIntegrationConstants';

interface TaskCredentialFormProps {
  editingCredential: TaskCredential | null;
  credentialForm: CredentialFormState;
  submittingCredential: boolean;
  userOptions: { id: string; label: string }[];
  onFormChange: React.Dispatch<React.SetStateAction<CredentialFormState>>;
  onToggleScope: (scope: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TaskCredentialForm: React.FC<TaskCredentialFormProps> = ({
  editingCredential,
  credentialForm,
  submittingCredential,
  userOptions,
  onFormChange,
  onToggleScope,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="mt-5 rounded-[24px] border border-primary/15 bg-primary/6 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold text-foreground">
          {editingCredential ? 'تعديل المفتاح' : 'إنشاء مفتاح جديد'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          إلغاء
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">
            اسم المفتاح
          </label>
          <input
            value={credentialForm.name}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
            placeholder="مثال: متجر الشريك - الإنتاج"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-foreground">
            وصف اختياري
          </label>
          <textarea
            value={credentialForm.description}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={3}
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
            placeholder="لأي نظام خارجي سيُستخدم هذا المفتاح؟"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            نوع المفتاح
          </label>
          <div className="flex gap-2">
            {[
              { value: 'COMPANY', label: 'مفتاح شركة' },
              { value: 'USER', label: 'مفتاح مستخدم' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  onFormChange((current) => ({
                    ...current,
                    ownershipType: item.value as 'COMPANY' | 'USER',
                  }))
                }
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  credentialForm.ownershipType === item.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background/75 text-foreground hover:bg-background'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {credentialForm.ownershipType === 'USER'
              ? 'المستخدم المرتبط'
              : 'مستخدم التنفيذ الافتراضي'}
          </label>
          <select
            value={credentialForm.actorUserId}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                actorUserId: event.target.value,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">بدون مستخدم</option>
            {userOptions.map((userOption) => (
              <option key={userOption.id} value={userOption.id}>
                {userOption.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            مطلوب فقط إذا كانت الصلاحيات تشمل الكتابة.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            تاريخ الانتهاء
          </label>
          <input
            type="datetime-local"
            value={credentialForm.expiresAt}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                expiresAt: event.target.value,
              }))
            }
            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={credentialForm.isActive}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          تفعيل المفتاح مباشرة بعد الحفظ
        </label>

        <div className="md:col-span-2">
          <div className="mb-2 text-sm font-medium text-foreground">
            الصلاحيات
          </div>
          <div className="flex flex-wrap gap-2">
            {TASK_SCOPE_OPTIONS.map((scope) => (
              <button
                key={scope.value}
                type="button"
                onClick={() => onToggleScope(scope.value)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  credentialForm.scopes.includes(scope.value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background/75 text-foreground hover:bg-background'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submittingCredential}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submittingCredential
            ? 'جارٍ الحفظ...'
            : editingCredential
              ? 'حفظ التعديلات'
              : 'إصدار المفتاح'}
        </button>
      </div>
    </div>
  );
};

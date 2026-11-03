import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  CustomerBlockAction,
  CustomerBlockActionOption,
  CustomerBlockReasonCode,
  CustomerBlockReasonOption,
  NewRuleState,
} from './types';
import { DateInput } from '../../../components/ui/DateInput';

interface CreateCustomerBlockRuleCardProps {
  newRule: NewRuleState;
  setNewRule: React.Dispatch<React.SetStateAction<NewRuleState>>;
  handleCreateRule: (event: React.FormEvent) => Promise<void>;
  isCreating: boolean;
  actionOptions: CustomerBlockActionOption[];
  reasonOptions: CustomerBlockReasonOption[];
}

export const CreateCustomerBlockRuleCard: React.FC<CreateCustomerBlockRuleCardProps> = ({
  newRule,
  setNewRule,
  handleCreateRule,
  isCreating,
  actionOptions,
  reasonOptions,
}) => {
  const { t } = useTranslation();

  return (
    <aside className="rounded-xl border border-border bg-card p-5 h-fit">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground border-b border-border/50 pb-3">
        <ShieldAlert className="size-5 text-red-500 shrink-0" />
        {t('customerBlocks.k_50', 'إضافة عميل لقائمة الحظر')}
      </h3>

      <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="block-phone" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_51', 'رقم الهاتف')}
          </Label>
          <Input
            id="block-phone"
            type="tel"
            value={newRule.phone}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            dir="ltr"
            placeholder="01xxxxxxxxx"
            className="font-mono tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-email" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_52', 'البريد الإلكتروني')}
          </Label>
          <Input
            id="block-email"
            type="email"
            value={newRule.email}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="customer@example.com"
            dir="ltr"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-action" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_31', 'الإجراء')}
          </Label>
          <select
            id="block-action"
            value={newRule.action}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                action: event.target.value as CustomerBlockAction,
              }))
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-reason" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_32', 'السبب')}
          </Label>
          <select
            id="block-reason"
            value={newRule.reasonCode}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                reasonCode: event.target.value as CustomerBlockReasonCode,
              }))
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {reasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-expires" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_53', 'تاريخ انتهاء الحظر (اختياري)')
          }</Label>
          <DateInput
            id="block-expires"
            
            value={newRule.expiresAt}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                expiresAt: event.target.value,
              }))
            }
            className="font-mono tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-note" className="text-xs font-semibold text-foreground">
            {t('customerBlocks.k_54', 'ملاحظات إضافية')}
          </Label>
          <textarea
            id="block-note"
            value={newRule.reasonNote}
            onChange={(event) =>
              setNewRule((current) => ({
                ...current,
                reasonNote: event.target.value,
              }))
            }
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <Button
          type="submit"
          disabled={isCreating}
          className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 font-semibold"
        >
          {isCreating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Ban className="size-4" />
          )}
          {t('customerBlocks.k_55', 'إضافة للحظر')}
        </Button>
      </form>
    </aside>
  );
};

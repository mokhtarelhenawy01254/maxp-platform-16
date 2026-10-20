import { RefreshCw } from 'lucide-react';
import { useDentalFinancialPolicies } from './financial-policies/hooks/useDentalFinancialPolicies';
import { FinancialPoliciesHeader } from './financial-policies/components/FinancialPoliciesHeader';
import { FinancialDefaultTreasuryCard } from './financial-policies/components/FinancialDefaultTreasuryCard';
import { FinancialPostingModesGrid } from './financial-policies/components/FinancialPostingModesGrid';
import { FinancialPendingPostingsTable } from './financial-policies/components/FinancialPendingPostingsTable';

export default function DentalFinancialPoliciesSection() {
  const {
    loading,
    saving,
    treasuries,
    pendingPostings,
    actionBusyId,
    financialPolicies,
    setFinancialPolicies,
    handleSavePolicies,
    handleConfirmPosting,
    handleVoidPosting,
    isGracePeriodActive,
  } = useDentalFinancialPolicies();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <FinancialPoliciesHeader
        saving={saving}
        isGracePeriodActive={isGracePeriodActive}
        onSave={handleSavePolicies}
      />

      <FinancialDefaultTreasuryCard
        treasuries={treasuries}
        defaultTreasuryId={financialPolicies.defaultTreasuryId}
        setFinancialPolicies={setFinancialPolicies}
      />

      <FinancialPostingModesGrid
        postings={financialPolicies.postings}
        setFinancialPolicies={setFinancialPolicies}
      />

      <FinancialPendingPostingsTable
        pendingPostings={pendingPostings}
        actionBusyId={actionBusyId}
        onConfirm={handleConfirmPosting}
        onVoid={handleVoidPosting}
      />
    </div>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import type {
  ReturnRequest,
  ReturnShippingCompany,
  ReturnType,
} from '../../../services/returnService';
import { ReturnSettlementSummaryBar } from './ReturnSettlementSummaryBar';
import {
  ReturnReasonAndNotesSection,
  type ReturnReasonItem,
  type ReturnCategoryItem,
} from './ReturnReasonAndNotesSection';
import { ReturnShippingSettlementSection } from './ReturnShippingSettlementSection';

export interface ReturnDetailsTabProps {
  request: ReturnRequest;
  responsibleParty: string;
  setResponsibleParty: (val: string) => void;
  responsiblePartyOptions: { value: string; label: string }[];
  reasonId: string;
  setReasonId: (val: string) => void;
  reasons: ReturnReasonItem[];
  categories: ReturnCategoryItem[];
  customerNotes: string;
  setCustomerNotes: (val: string) => void;
  adminNotes: string;
  setAdminNotes: (val: string) => void;
  shippingCompanyId: string;
  handleShippingCompanyChange: (val: string) => void;
  shippingCompanies: ReturnShippingCompany[];
  returnTypeId: string;
  handleReturnTypeChange: (val: string) => void;
  returnTypes: ReturnType[];
  getSuggestedCost: (type: ReturnType | undefined) => number;
  shippingReturnCost: string;
  setShippingReturnCost: (val: string) => void;
  settlementAmount: string;
  setSettlementAmount: (val: string) => void;
}

export const ReturnDetailsTab: React.FC<ReturnDetailsTabProps> = ({
  request,
  responsibleParty,
  setResponsibleParty,
  responsiblePartyOptions,
  reasonId,
  setReasonId,
  reasons,
  categories,
  customerNotes,
  setCustomerNotes,
  adminNotes,
  setAdminNotes,
  shippingCompanyId,
  handleShippingCompanyChange,
  shippingCompanies,
  returnTypeId,
  handleReturnTypeChange,
  returnTypes,
  getSuggestedCost,
  shippingReturnCost,
  setShippingReturnCost,
  settlementAmount,
  setSettlementAmount,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <ReturnSettlementSummaryBar request={request} />

      <div className="bg-white dark:bg-gray-900/50 border-2 border-blue-100 dark:border-blue-900/30 p-4 rounded-lg space-y-4">
        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Shield size={16} /> {t('returns.k_201')}
        </h3>

        <ReturnReasonAndNotesSection
          responsibleParty={responsibleParty}
          setResponsibleParty={setResponsibleParty}
          responsiblePartyOptions={responsiblePartyOptions}
          reasonId={reasonId}
          setReasonId={setReasonId}
          reasons={reasons}
          categories={categories}
          customerNotes={customerNotes}
          setCustomerNotes={setCustomerNotes}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          t={t}
        />

        <ReturnShippingSettlementSection
          request={request}
          shippingCompanyId={shippingCompanyId}
          handleShippingCompanyChange={handleShippingCompanyChange}
          shippingCompanies={shippingCompanies}
          returnTypeId={returnTypeId}
          handleReturnTypeChange={handleReturnTypeChange}
          returnTypes={returnTypes}
          getSuggestedCost={getSuggestedCost}
          shippingReturnCost={shippingReturnCost}
          setShippingReturnCost={setShippingReturnCost}
          settlementAmount={settlementAmount}
          setSettlementAmount={setSettlementAmount}
          t={t}
        />
      </div>
    </div>
  );
};

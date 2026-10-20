export interface FinancialPostingItem {
  id: string;
  sourceType: string;
  sourceId: string;
  account: string;
  direction: 'INCOME' | 'EXPENSE';
  amount: number;
  status: 'PENDING' | 'POSTED' | 'VOID';
  partyName?: string;
  notes?: string;
  createdAt: string;
}

export interface TreasuryAccount {
  id: string;
  name: string;
  balance?: number;
}

export interface FinancialPoliciesState {
  defaultTreasuryId: string;
  postings: {
    caseInvoice: string;
    supplierPayment: string;
    technicianPayout: string;
    caseBomConsumption: string;
    outsourceExpense: string;
  };
  autoEnabledAt: string | null;
}

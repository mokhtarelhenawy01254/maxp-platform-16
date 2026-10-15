import { apiClient } from '../../services/api';

export interface Account {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string | null;
  isGroup: boolean;
  isPostable: boolean;
  isActive: boolean;
  description?: string | null;
  currency: string;
  children?: Account[];
  _count?: {
    journalLines: number;
  };
}

export interface JournalLine {
  id?: string;
  accountId: string;
  debit: number;
  credit: number;
  narration?: string | null;
  costCenter?: string | null;
  account?: Account;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  narration: string;
  sourceType: string;
  sourceId?: string | null;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  postedAt?: string | null;
  postedById?: string | null;
  createdById?: string | null;
  reversalOfId?: string | null;
  createdAt: string;
  lines: JournalLine[];
}

export interface FiscalPeriod {
  id: string;
  companyId: string;
  year: number;
  month: number;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string | null;
  closedById?: string | null;
  isYearEnd: boolean;
}

export interface AccountingSettings {
  id?: string;
  companyId: string;
  fiscalYearStartMonth: number;
  defaultCashAccountId?: string | null;
  defaultBankAccountId?: string | null;
  defaultArAccountId?: string | null;
  defaultApAccountId?: string | null;
  defaultSalesAccountId?: string | null;
  defaultCogsAccountId?: string | null;
  defaultInventoryAccountId?: string | null;
  defaultExpenseAccountId?: string | null;
  defaultRetainedEarningsAccountId?: string | null;
  defaultVatOutputAccountId?: string | null;
  defaultVatInputAccountId?: string | null;
  defaultTaxRate: number;
  autoPostingEnabled: boolean;
}

export interface UnpostedEntry {
  id: string;
  companyId: string;
  sourceType: string;
  sourceId: string;
  documentNo?: string | null;
  amount: number;
  date: string;
  reason: string;
  errorDetails?: string | null;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'DISMISSED';
  createdAt: string;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
}

export interface TrialBalanceReport {
  period: { startDate?: string | null; endDate: string };
  rows: TrialBalanceRow[];
  totals: {
    totalOpeningDebit: number;
    totalOpeningCredit: number;
    totalPeriodDebit: number;
    totalPeriodCredit: number;
    totalEndingDebit: number;
    totalEndingCredit: number;
    isBalanced: boolean;
  };
}

export interface LedgerMovement {
  lineId: string;
  entryId: string;
  entryNumber: string;
  date: string;
  narration: string;
  sourceType: string;
  costCenter?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerReport {
  account: Account;
  period: { startDate?: string | null; endDate: string };
  openingBalance: number;
  movements: LedgerMovement[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    netChange: number;
    closingBalance: number;
  };
}

export interface ProfitLossReport {
  period: { startDate?: string | null; endDate: string };
  revenues: { items: Array<{ code: string; name: string; amount: number }>; total: number };
  cogs: { items: Array<{ code: string; name: string; amount: number }>; total: number };
  grossProfit: number;
  operatingExpenses: { items: Array<{ code: string; name: string; amount: number }>; total: number };
  operatingProfit: number;
  otherRevenues: { items: Array<{ code: string; name: string; amount: number }>; total: number };
  netProfit: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    current: { items: Array<{ code: string; name: string; amount: number }>; total: number };
    fixed: { items: Array<{ code: string; name: string; amount: number }>; total: number };
    total: number;
  };
  liabilities: {
    current: { items: Array<{ code: string; name: string; amount: number }>; total: number };
    longTerm: { items: Array<{ code: string; name: string; amount: number }>; total: number };
    total: number;
  };
  equity: {
    items: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  summary: {
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
    difference: number;
    isBalanced: boolean;
  };
}

export interface VatReport {
  period: { startDate?: string | null; endDate: string };
  taxRate: number;
  outputVatCollected: number;
  inputVatPaid: number;
  netVatPayable: number;
  status: 'DUE_TO_TAX_AUTHORITY' | 'REFUNDABLE_OR_CREDIT';
}

export const accountingApi = {
  // COA
  getChartOfAccounts: async (type?: string): Promise<Account[]> => {
    const res = await apiClient.get('/accounting/coa', { params: { type } });
    return res.data?.data || [];
  },
  seedStandardCOA: async (): Promise<{ count: number }> => {
    const res = await apiClient.post('/accounting/coa/seed');
    return res.data?.data;
  },
  createAccount: async (data: Partial<Account>): Promise<Account> => {
    const res = await apiClient.post('/accounting/accounts', data);
    return res.data?.data;
  },
  updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
    const res = await apiClient.put(`/accounting/accounts/${id}`, data);
    return res.data?.data;
  },
  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounting/accounts/${id}`);
  },

  // Journal Entries
  listEntries: async (params?: {
    status?: string;
    sourceType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ entries: JournalEntry[]; pagination: { total: number; page: number; totalPages: number } }> => {
    const res = await apiClient.get('/accounting/entries', { params });
    return res.data?.data || { entries: [], pagination: { total: 0, page: 1, totalPages: 1 } };
  },
  getEntryById: async (id: string): Promise<JournalEntry> => {
    const res = await apiClient.get(`/accounting/entries/${id}`);
    return res.data?.data;
  },
  createEntry: async (data: {
    date: string;
    narration: string;
    status?: 'DRAFT' | 'POSTED';
    lines: Array<{ accountId: string; debit: number; credit: number; narration?: string }>;
  }): Promise<JournalEntry> => {
    const res = await apiClient.post('/accounting/entries', data);
    return res.data?.data;
  },
  postEntry: async (id: string): Promise<JournalEntry> => {
    const res = await apiClient.post(`/accounting/entries/${id}/post`);
    return res.data?.data;
  },
  voidEntry: async (id: string, reason?: string): Promise<{ voidedEntry: JournalEntry; reversingEntry: JournalEntry }> => {
    const res = await apiClient.post(`/accounting/entries/${id}/void`, { reason });
    return res.data?.data;
  },

  // Reports
  getTrialBalance: async (params?: { startDate?: string; endDate?: string }): Promise<TrialBalanceReport> => {
    const res = await apiClient.get('/accounting/reports/trial-balance', { params });
    return res.data?.data;
  },
  getGeneralLedger: async (params: { accountId: string; startDate?: string; endDate?: string }): Promise<GeneralLedgerReport> => {
    const res = await apiClient.get('/accounting/reports/ledger', { params });
    return res.data?.data;
  },
  getProfitLoss: async (params?: { startDate?: string; endDate?: string }): Promise<ProfitLossReport> => {
    const res = await apiClient.get('/accounting/reports/pnl', { params });
    return res.data?.data;
  },
  getBalanceSheet: async (params?: { asOfDate?: string }): Promise<BalanceSheetReport> => {
    const res = await apiClient.get('/accounting/reports/balance-sheet', { params });
    return res.data?.data;
  },
  getVatReport: async (params?: { startDate?: string; endDate?: string }): Promise<VatReport> => {
    const res = await apiClient.get('/accounting/reports/vat', { params });
    return res.data?.data;
  },

  // Periods
  listPeriods: async (year?: number): Promise<FiscalPeriod[]> => {
    const res = await apiClient.get('/accounting/periods', { params: { year } });
    return res.data?.data || [];
  },
  openPeriod: async (year: number, month: number): Promise<FiscalPeriod> => {
    const res = await apiClient.post('/accounting/periods/open', { year, month });
    return res.data?.data;
  },
  closePeriod: async (year: number, month: number): Promise<FiscalPeriod> => {
    const res = await apiClient.post('/accounting/periods/close', { year, month });
    return res.data?.data;
  },

  // Settings
  getSettings: async (): Promise<AccountingSettings> => {
    const res = await apiClient.get('/accounting/settings');
    return res.data?.data;
  },
  updateSettings: async (data: Partial<AccountingSettings>): Promise<AccountingSettings> => {
    const res = await apiClient.put('/accounting/settings', data);
    return res.data?.data;
  },

  // Unposted Queue
  listUnpostedQueue: async (params?: { status?: string }): Promise<UnpostedEntry[]> => {
    const res = await apiClient.get('/accounting/unposted', { params });
    return res.data?.data || [];
  },
  retryUnpostedEntry: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/accounting/unposted/${id}/retry`);
    return res.data?.data;
  },
  retryAllUnposted: async (): Promise<any> => {
    const res = await apiClient.post('/accounting/unposted/retry-all');
    return res.data?.data;
  },
};

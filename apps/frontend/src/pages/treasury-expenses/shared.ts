import { apiClient } from "../../services/api";

export interface TreasuryAccount {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "WALLET" | "CUSTODY" | string;
  balance: number | string;
  currency: string;
  accountNumber?: string | null;
  bankName?: string | null;
  holderName?: string | null;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    expenses: number;
    transactions: number;
  };
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameEn?: string | null;
  type: "OPEX" | "CAPEX";
  color?: string | null;
  icon?: string | null;
  isSystem: boolean;
  _count?: {
    expenses: number;
  };
}

export interface CompanyExpense {
  id: string;
  expenseNumber: string;
  title: string;
  amount: number | string;
  categoryId?: string | null;
  treasuryAccountId: string;
  type: "OPEX" | "CAPEX" | string;
  beneficiary?: string | null;
  invoiceNumber?: string | null;
  receiptUrl?: string | null;
  paymentDate: string;
  isRecurring: boolean;
  recurringInterval?: "MONTHLY" | "WEEKLY" | "YEARLY" | null;
  nextDueDate?: string | null;
  status: "PAID" | "PENDING" | "CANCELLED" | string;
  notes?: string | null;
  category?: ExpenseCategory | null;
  treasuryAccount?: {
    id: string;
    name: string;
    type: string;
    currency: string;
  } | null;
}

export interface TreasuryTransaction {
  id: string;
  treasuryAccountId: string;
  amount: number | string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT" | "EXPENSE" | string;
  runningBalance: number | string;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  date: string;
  treasuryAccount?: {
    id: string;
    name: string;
    type: string;
    currency: string;
  } | null;
}

export interface CapitalStats {
  totalInjectedCapital: number;
  totalLiquidCash: number;
  totalCapexAssets: number;
  totalOpexExpenses: number;
  totalAllExpenses: number;
  netEquityValue: number;
  depositsCount: number;
}

export interface ExpenseStats {
  currentMonthTotal: number;
  lastMonthTotal: number;
  monthOverMonthDelta: number;
  opexTotal: number;
  capexTotal: number;
  burnRate: number;
  runwayMonths: number;
  liquidCash: number;
  categoryBreakdown: Array<{
    name: string;
    color: string;
    total: number;
  }>;
}

// Format numbers with commas and currency
export function formatMoney(amount: number | string, currency = "ج.م"): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(n)) return `0 ${currency}`;
  const isNeg = n < 0;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return isNeg ? `-${formatted} ${currency}` : `${formatted} ${currency}`;
}

// Export data to CSV
export function exportToCsv(filename: string, rows: Array<Record<string, any>>, headers: Array<{ key: string; label: string }>) {
  if (!rows || rows.length === 0) return;
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(",");
  const rowLines = rows.map((row) => {
    return headers
      .map((h) => {
        const val = row[h.key] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",");
  });
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// API functions
export async function fetchAccounts(): Promise<{ accounts: TreasuryAccount[]; totalBalance: number }> {
  const res = await apiClient.get("/api/v1/treasury/accounts");
  return (res as any)?.data?.data || { accounts: [], totalBalance: 0 };
}

export async function createAccount(data: Partial<TreasuryAccount> & { initialBalance?: number }): Promise<TreasuryAccount> {
  const res = await apiClient.post("/api/v1/treasury/accounts", data);
  return (res as any)?.data?.data;
}

export async function updateAccount(id: string, data: Partial<TreasuryAccount>): Promise<TreasuryAccount> {
  const res = await apiClient.put(`/api/v1/treasury/accounts/${id}`, data);
  return (res as any)?.data?.data;
}

export async function transferBetweenAccounts(payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date?: string;
}): Promise<any> {
  const res = await apiClient.post("/api/v1/treasury/transfer", payload);
  return (res as any)?.data?.data;
}

export async function fetchCapitalStats(): Promise<CapitalStats> {
  const res = await apiClient.get("/api/v1/treasury/capital/stats");
  return (res as any)?.data?.data || {
    totalInjectedCapital: 0,
    totalLiquidCash: 0,
    totalCapexAssets: 0,
    totalOpexExpenses: 0,
    totalAllExpenses: 0,
    netEquityValue: 0,
    depositsCount: 0,
  };
}

export async function depositCapital(payload: {
  treasuryAccountId: string;
  amount: number;
  type?: string;
  investorName?: string;
  referenceNumber?: string;
  notes?: string;
  date?: string;
}): Promise<any> {
  const res = await apiClient.post("/api/v1/treasury/capital/deposit", payload);
  return (res as any)?.data?.data;
}

export async function fetchCategories(): Promise<ExpenseCategory[]> {
  const res = await apiClient.get("/api/v1/treasury/categories");
  return (res as any)?.data?.data || [];
}

export async function createCategory(payload: {
  name: string;
  nameEn?: string;
  type: "OPEX" | "CAPEX";
  color?: string;
  icon?: string;
}): Promise<ExpenseCategory> {
  const res = await apiClient.post("/api/v1/treasury/categories", payload);
  return (res as any)?.data?.data;
}

export async function fetchExpenses(params?: {
  search?: string;
  categoryId?: string;
  treasuryAccountId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  expenses: CompanyExpense[];
  totalCount: number;
  totalAmount: number;
  totalPages: number;
}> {
  const res = await apiClient.get("/api/v1/treasury/expenses", { params });
  return (res as any)?.data?.data || { expenses: [], totalCount: 0, totalAmount: 0, totalPages: 1 };
}

export async function fetchExpenseStats(): Promise<ExpenseStats> {
  const res = await apiClient.get("/api/v1/treasury/expenses/stats");
  return (res as any)?.data?.data || {
    currentMonthTotal: 0,
    lastMonthTotal: 0,
    monthOverMonthDelta: 0,
    opexTotal: 0,
    capexTotal: 0,
    burnRate: 0,
    runwayMonths: 0,
    liquidCash: 0,
    categoryBreakdown: [],
  };
}

export async function createExpense(payload: {
  title: string;
  amount: number;
  categoryId?: string;
  treasuryAccountId: string;
  type?: string;
  beneficiary?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  paymentDate?: string;
  isRecurring?: boolean;
  recurringInterval?: string;
  nextDueDate?: string;
  status?: string;
  notes?: string;
}): Promise<{ expense: CompanyExpense; updatedBalance: number }> {
  const res = await apiClient.post("/api/v1/treasury/expenses", payload);
  return (res as any)?.data?.data;
}

export async function updateExpense(
  id: string,
  payload: {
    title?: string;
    amount?: number;
    categoryId?: string;
    treasuryAccountId?: string;
    type?: string;
    beneficiary?: string;
    invoiceNumber?: string;
    receiptUrl?: string;
    paymentDate?: string;
    isRecurring?: boolean;
    recurringInterval?: string;
    nextDueDate?: string;
    status?: string;
    notes?: string;
  }
): Promise<{ expense: CompanyExpense; updatedBalance: number }> {
  const res = await apiClient.put(`/api/v1/treasury/expenses/${id}`, payload);
  return (res as any)?.data?.data;
}

export async function deleteExpense(id: string): Promise<any> {
  const res = await apiClient.delete(`/api/v1/treasury/expenses/${id}`);
  return res.data;
}

export async function fetchLedger(params?: {
  treasuryAccountId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}): Promise<{
  transactions: TreasuryTransaction[];
  totalCount: number;
  totalPages: number;
}> {
  const res = await apiClient.get("/api/v1/treasury/ledger", { params });
  return (res as any)?.data?.data || { transactions: [], totalCount: 0, totalPages: 1 };
}

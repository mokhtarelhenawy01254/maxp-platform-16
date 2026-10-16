import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AccountingDashboardPage from './AccountingDashboardPage';
import AccountingCoaPage from './AccountingCoaPage';
import AccountingJournalEntriesPage from './AccountingJournalEntriesPage';
import AccountingLedgerPage from './AccountingLedgerPage';
import AccountingTrialBalancePage from './AccountingTrialBalancePage';
import AccountingProfitLossPage from './AccountingProfitLossPage';
import AccountingBalanceSheetPage from './AccountingBalanceSheetPage';
import AccountingPeriodsPage from './AccountingPeriodsPage';
import AccountingVatReportPage from './AccountingVatReportPage';
import AccountingSettingsPage from './AccountingSettingsPage';

export const AccountingRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AccountingDashboardPage />} />
      <Route path="coa" element={<AccountingCoaPage />} />
      <Route path="entries" element={<AccountingJournalEntriesPage />} />
      <Route path="ledger" element={<AccountingLedgerPage />} />
      <Route path="trial-balance" element={<AccountingTrialBalancePage />} />
      <Route path="income-statement" element={<AccountingProfitLossPage />} />
      <Route path="balance-sheet" element={<AccountingBalanceSheetPage />} />
      <Route path="periods" element={<AccountingPeriodsPage />} />
      <Route path="vat-report" element={<AccountingVatReportPage />} />
      <Route path="settings" element={<AccountingSettingsPage />} />
      <Route path="*" element={<Navigate to="/accounting" replace />} />
    </Routes>
  );
};

export default AccountingRoutes;

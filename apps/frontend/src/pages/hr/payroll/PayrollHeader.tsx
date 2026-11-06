import React from 'react';
import { Download, Zap, FileText, Calculator, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { months } from './types';

interface PayrollHeaderProps {
  isMyPayroll: boolean;
  selectedMonth: number;
  selectedYear: number;
  view: 'list' | 'simulator';
  setView: (view: 'list' | 'simulator') => void;
  autoCalculating: boolean;
  onExportBankFile: () => void;
  onOpenGenerateDialog: () => void;
  onAutoCalculate: () => void;
}

export const PayrollHeader: React.FC<PayrollHeaderProps> = ({
  isMyPayroll,
  selectedMonth,
  selectedYear,
  view,
  setView,
  autoCalculating,
  onExportBankFile,
  onOpenGenerateDialog,
  onAutoCalculate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {isMyPayroll ? 'رواتبي' : 'إدارة الرواتب'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono tabular-nums">
          {months[selectedMonth - 1]} {selectedYear}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onExportBankFile} className="gap-1.5 text-xs font-semibold">
          <Download className="h-4 w-4" />
          ملف الصرف
        </Button>
        {!isMyPayroll && (
          <>
            <Button
              size="sm"
              variant={view === 'simulator' ? "default" : "outline"}
              onClick={() => setView(view === 'list' ? 'simulator' : 'list')}
              className="gap-1.5 text-xs font-semibold"
            >
              {view === 'list' ? (
                <>
                  <Zap className="h-4 w-4" />
                  محاكي الرواتب
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  عرض الكشوف
                </>
              )}
            </Button>
            <Button size="sm" onClick={onOpenGenerateDialog} variant="outline" className="gap-1.5 text-xs font-semibold">
              <Calculator className="h-4 w-4" />
              إعداد الرواتب
            </Button>
            <Button
              size="sm"
              onClick={onAutoCalculate}
              disabled={autoCalculating}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              {autoCalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جاري الحساب والخصم الآلي...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  أتمتة وحساب الرواتب والخصومات
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

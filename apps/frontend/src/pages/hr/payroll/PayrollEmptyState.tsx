import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface PayrollEmptyStateProps {
  isMyPayroll: boolean;
  onOpenGenerateDialog: () => void;
}

export const PayrollEmptyState: React.FC<PayrollEmptyStateProps> = ({
  isMyPayroll,
  onOpenGenerateDialog,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-muted/20 rounded-2xl border border-dashed border-border/70 m-4">
      <div className="h-16 w-16 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-center mb-4">
        <Calculator className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1.5">لا توجد بيانات رواتب مُحققة</h3>
      <p className="text-sm text-muted-foreground max-w-sm text-center mb-6 px-4">
        لم يتم توليد أي كشوف رواتب لهذه الفترة حتى الآن. يمكنك بدء الدورة المالية الحالية بضغطة زر واحدة.
      </p>
      {!isMyPayroll && (
        <Button
          onClick={onOpenGenerateDialog}
          className="h-10 px-6 rounded-xl font-medium"
        >
          <Sparkles className="h-4 w-4 ml-2" />
          بدء إعداد الرواتب الآن
        </Button>
      )}
    </div>
  );
};

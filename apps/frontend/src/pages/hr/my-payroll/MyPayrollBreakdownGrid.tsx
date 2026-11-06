import React from "react";
import { TFunction } from "i18next";
import { motion } from "framer-motion";
import {
  AlertCircle,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { PayrollData, SalaryComponent } from "./types";
import { formatCurrency, itemVariants } from "./helpers";

interface MyPayrollBreakdownGridProps {
  t: TFunction;
  payrollData: PayrollData;
  allowances: SalaryComponent[];
  groupedDeductions: SalaryComponent[];
  totalEarningsDisplay: number;
  totalDeductionsDisplay: number;
}

export const MyPayrollBreakdownGrid: React.FC<MyPayrollBreakdownGridProps> = ({
  t,
  payrollData,
  allowances,
  groupedDeductions,
  totalEarningsDisplay,
  totalDeductionsDisplay,
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Earnings */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            {t("employee.payroll.earnings")}
          </h3>
          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-base font-mono tabular-nums">
            +{formatCurrency(totalEarningsDisplay)}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center rounded-xl border border-border/50 bg-muted/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <span className="font-medium text-foreground text-sm">
                {t("employee.payroll.baseSalary")}
              </span>
            </div>
            <span className="font-bold text-foreground text-base font-mono tabular-nums">
              {formatCurrency(
                payrollData.employee?.baseSalary || payrollData.baseSalary,
              )}
            </span>
          </div>

          <div className="space-y-3 px-1">
            {allowances.map((al, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium text-sm">
                  {al.name}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm font-mono tabular-nums">
                  +{formatCurrency(al.amount)}
                </span>
              </div>
            ))}
            {payrollData.overtimeAmount > 0 && (
              <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground font-medium block leading-none mb-1 text-sm">
                    {t("employee.payroll.overtime")}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase font-mono tabular-nums">
                    ({payrollData.overtimeHours}H APPROVED)
                  </span>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm font-mono tabular-nums">
                  +{formatCurrency(payrollData.overtimeAmount)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/70 flex justify-between items-center">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t("employee.payroll.totalEarnings")}
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatCurrency(totalEarningsDisplay)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Deductions */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
            {t("employee.payroll.deductions")}
          </h3>
          <div className="text-destructive font-bold text-base font-mono tabular-nums">
            -{formatCurrency(totalDeductionsDisplay)}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center rounded-xl border border-border/50 bg-muted/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-medium text-foreground text-sm">
                {t("employee.payroll.insurance")}
              </span>
            </div>
            <span className="font-bold text-destructive text-base font-mono tabular-nums">
              -{formatCurrency(payrollData.socialInsurance)}
            </span>
          </div>

          <div className="space-y-3 px-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium text-sm">
                {t("employee.payroll.tax")}
              </span>
              <span className="font-semibold text-destructive text-sm font-mono tabular-nums">
                -{formatCurrency(payrollData.taxAmount)}
              </span>
            </div>
            {groupedDeductions.map((de, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium text-sm">
                  {de.name}
                </span>
                <span className="font-semibold text-destructive text-sm font-mono tabular-nums">
                  -{formatCurrency(de.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border/70 flex justify-between items-center">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {t("employee.payroll.totalDeductions")}
            </span>
            <span className="text-2xl font-bold text-destructive font-mono tabular-nums">
              {formatCurrency(totalDeductionsDisplay)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

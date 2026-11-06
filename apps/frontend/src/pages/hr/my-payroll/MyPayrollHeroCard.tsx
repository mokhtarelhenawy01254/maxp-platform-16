import React from "react";
import { TFunction } from "i18next";
import { motion } from "framer-motion";
import { User as UserIcon } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { PayrollData } from "./types";
import { formatCurrency, itemVariants } from "./helpers";

interface MyPayrollHeroCardProps {
  t: TFunction;
  payrollData: PayrollData;
  originalBaseSalary: number;
}

export const MyPayrollHeroCard: React.FC<MyPayrollHeroCardProps> = ({
  t,
  payrollData,
  originalBaseSalary,
}) => {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div className="flex items-center gap-4 text-right">
          <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <UserIcon className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              {payrollData.employee?.firstName} {payrollData.employee?.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border/70 px-2.5 py-0.5 text-xs font-mono tabular-nums">
                ID: {payrollData.employee?.employeeNumber}
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                {payrollData.employee?.position?.title ||
                  t("employee.payroll.distinguished")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-right sm:text-left space-y-1 border-t sm:border-t-0 sm:border-r border-border/70 pt-4 sm:pt-0 sm:pr-6 w-full sm:w-auto">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {t("employee.payroll.baseContractSalary")}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums text-foreground">
              {formatCurrency(originalBaseSalary)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {t("employee.payroll.egp")}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

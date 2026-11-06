import React from "react";
import { TFunction } from "i18next";
import { motion } from "framer-motion";
import { Printer, ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { MonthOption, PayrollData } from "./types";

interface MyPayrollHeaderProps {
  t: TFunction;
  payrollData: PayrollData | null;
  month: string;
  onMonthChange: (value: string) => void;
  year: string;
  onYearChange: (value: string) => void;
  months: MonthOption[];
  years: string[];
  onPrint: () => void;
}

export const MyPayrollHeader: React.FC<MyPayrollHeaderProps> = ({
  t,
  payrollData,
  month,
  onMonthChange,
  year,
  onYearChange,
  months,
  years,
  onPrint,
}) => {
  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("employee.payroll.subtitle")}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("employee.payroll.welcome", {
              name: payrollData?.employee?.firstName,
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("employee.payroll.detail", {
              month: months.find((m) => m.value === month)?.label,
              year,
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card p-1 shadow-xs">
          <Select value={month} onValueChange={onMonthChange}>
            <SelectTrigger className="border-none w-32 shadow-none focus:ring-0 text-foreground font-medium rounded-lg h-9 text-sm bg-transparent hover:bg-muted/50 transition-colors">
              <SelectValue
                placeholder={t("employee.payroll.monthPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-md">
              {months.map((m) => (
                <SelectItem
                  key={m.value}
                  value={m.value}
                  className="font-medium text-sm py-2 cursor-pointer"
                >
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-5 bg-border/70 my-auto"></div>
          <Select value={year} onValueChange={onYearChange}>
            <SelectTrigger className="border-none w-24 shadow-none focus:ring-0 text-foreground font-medium rounded-lg h-9 text-sm bg-transparent hover:bg-muted/50 transition-colors font-mono tabular-nums">
              <SelectValue
                placeholder={t("employee.payroll.yearPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-md">
              {years.map((y) => (
                <SelectItem
                  key={y}
                  value={y}
                  className="font-medium text-sm py-2 cursor-pointer font-mono tabular-nums"
                >
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {payrollData && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 h-11 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer border-none"
            onClick={onPrint}
          >
            <Printer className="w-4 h-4" />
            {t("employee.payroll.printStatement")}
          </motion.button>
        )}
      </div>
    </div>
  );
};

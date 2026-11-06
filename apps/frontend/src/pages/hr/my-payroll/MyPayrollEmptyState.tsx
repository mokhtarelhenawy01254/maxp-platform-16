import React from "react";
import { TFunction } from "i18next";
import { motion } from "framer-motion";
import { Building2, History } from "lucide-react";

export const MyPayrollSkeleton: React.FC = () => (
  <div className="max-w-[1400px] mx-auto w-full grid md:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-64 bg-muted/40 animate-pulse rounded-2xl border border-border/50"
      />
    ))}
  </div>
);

interface MyPayrollEmptyStateProps {
  t: TFunction;
}

export const MyPayrollEmptyState: React.FC<MyPayrollEmptyStateProps> = ({
  t,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-border/70 bg-card shadow-xs"
  >
    <div className="h-14 w-14 rounded-2xl bg-muted/50 border border-border/70 flex items-center justify-center mb-4 text-muted-foreground">
      <History className="h-7 w-7" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      {t("employee.payroll.noData")}
    </h3>
    <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
      {t("employee.payroll.processing")}
    </p>
  </motion.div>
);

export const MyPayrollFooter: React.FC = () => (
  <div className="max-w-[1400px] mx-auto w-full pt-8 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70 text-xs text-muted-foreground">
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <span className="font-semibold tracking-wider uppercase">
        MaxP Enterprise HR
      </span>
    </div>
    <div className="flex items-center gap-4">
      <span>Security Certified</span>
      <span className="h-1 w-1 bg-muted-foreground/50 rounded-full"></span>
      <span className="font-mono tabular-nums">© 2026 All Rights Reserved</span>
    </div>
  </div>
);

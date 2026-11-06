import React from "react";
import { CreditCard, Zap, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { itemVariants } from "./types";

interface MyPayrollSidebarProps {
  payrollData: any;
}

export const MyPayrollSidebar: React.FC<MyPayrollSidebarProps> = ({
  payrollData,
}) => {
  const { t } = useTranslation();

  return (
    <div className="lg:col-span-4 space-y-6">
      {/* Payment Method Card */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border/70 bg-card shadow-xs p-6 relative overflow-hidden"
      >
        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">
              {t("employee.payroll.paymentDetails")}
            </h3>
            <CreditCard className="size-5 text-primary" />
          </div>

          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
                {t("employee.payroll.bankTransfer")}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center font-bold text-primary text-sm">
                  {payrollData.employee?.bankName?.substring(0, 1) || "B"}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {payrollData.employee?.bankName || "البنك الأهلي التجاري"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {payrollData.employee?.bankAccount
                      ? `•••• ${payrollData.employee.bankAccount.slice(-4)}`
                      : "•••• 8821"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {t("employee.payroll.transferSpeed")}
                </span>
                <span className="font-bold text-emerald-500 font-mono tabular-nums">100%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Secure Info Card */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border/70 bg-card shadow-xs p-6 space-y-4 relative overflow-hidden"
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <ShieldCheck className="size-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {t("employee.payroll.securityNotice")}
          </h3>
        </div>

        <div className="space-y-2.5 relative z-10 text-xs">
          {[
            t("employee.payroll.encryptedData"),
            t("employee.payroll.digitalSignature"),
            t("employee.payroll.keepStatement"),
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0" />
              <p className="text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full rounded-xl text-xs font-semibold"
          onClick={() => window.print()}
        >
          {t("employee.payroll.printStatement")}
        </Button>
      </motion.div>
    </div>
  );
};

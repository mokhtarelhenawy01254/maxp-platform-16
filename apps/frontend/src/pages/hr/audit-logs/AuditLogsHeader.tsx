import React from "react";
import { Button } from "../../../components/ui/button";
import { Shield, Download } from "lucide-react";

interface AuditLogsHeaderProps {
  onExport: () => void;
  disabled: boolean;
}

export const AuditLogsHeader: React.FC<AuditLogsHeaderProps> = ({
  onExport,
  disabled,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Shield className="size-5 sm:size-6 text-primary" />
          سجلات التدقيق
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          سجل التغييرات ومراقبة النظام والعمليات الإدارية
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={onExport}
          disabled={disabled}
        >
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </div>
    </div>
  );
};

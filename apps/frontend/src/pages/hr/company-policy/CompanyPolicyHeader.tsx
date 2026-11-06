import React from "react";
import { Button } from "../../../components/ui/button";
import { Plus } from "lucide-react";

interface CompanyPolicyHeaderProps {
  onNewPolicy: () => void;
}

export const CompanyPolicyHeader: React.FC<CompanyPolicyHeaderProps> = ({
  onNewPolicy,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          سياسات الشركة
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          الدليل الشامل للوائح والقوانين التنظيمية الداخلية
        </p>
      </div>
      <Button
        onClick={onNewPolicy}
      >
        <Plus className="h-4 w-4 ml-2" />
        إضافة سياسة جديدة
      </Button>
    </div>
  );
};

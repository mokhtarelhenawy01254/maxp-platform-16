import { Bot, Play, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import DentalDryRunModal from "./DentalDryRunModal";
import { useDentalPolicies } from "./policies/hooks/useDentalPolicies";
import { PolicyAssignmentCard } from "./policies/components/PolicyAssignmentCard";
import { PolicyDueDateCard } from "./policies/components/PolicyDueDateCard";
import { PolicyFieldsValidationCard } from "./policies/components/PolicyFieldsValidationCard";
import { PolicyEscalationCard } from "./policies/components/PolicyEscalationCard";

export default function DentalPoliciesSection() {
  const {
    loading,
    saving,
    runningEscalation,
    dryRunOpen,
    setDryRunOpen,
    policies,
    setPolicies,
    handleSave,
    handleRunEscalation,
  } = useDentalPolicies();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            الأتمتة والسياسات التشغيلية
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            قواعد إسناد العمل التلقائي ومواعيد التسليم وإشعارات المرضى وتصعيد التأخير المربوطة بمحرك المعمل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDryRunOpen(true)}
            className="gap-1.5"
          >
            <Play className="size-3.5 text-blue-500" />
            محاكاة حالة (Dry-Run)
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            حفظ السياسات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PolicyAssignmentCard
          policies={policies}
          setPolicies={setPolicies}
        />

        <PolicyDueDateCard
          policies={policies}
          setPolicies={setPolicies}
        />

        <PolicyFieldsValidationCard
          policies={policies}
          setPolicies={setPolicies}
        />

        <PolicyEscalationCard
          policies={policies}
          setPolicies={setPolicies}
          runningEscalation={runningEscalation}
          onRunEscalation={handleRunEscalation}
        />
      </div>

      {/* Dry Run Modal */}
      <DentalDryRunModal
        open={dryRunOpen}
        onClose={() => setDryRunOpen(false)}
      />
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

export function AlertBanner({
  urgentEscalationDue, myDueToday, onOpenView,
}: {
  urgentEscalationDue: number;
  myDueToday: number;
  onOpenView: (view: string) => void;
}) {
  if (urgentEscalationDue === 0 && myDueToday === 0) return null;

  return (
    <Alert className={cn(
      "rounded-2xl border",
      urgentEscalationDue > 0
        ? "border-rose-200/80 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
        : "border-sky-200/80 bg-sky-50/90 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
    )}>
      <AlertTriangle className="size-4" />
      <AlertTitle>
        {urgentEscalationDue > 0
          ? `${urgentEscalationDue} حالة تحتاج تصعيدًا عاجلًا`
          : `${myDueToday} متابعة مستحقة اليوم`}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() => onOpenView(urgentEscalationDue > 0 ? "ESCALATION_DUE" : "MY_TODAY")}
        >
          {urgentEscalationDue > 0 ? "فتح التصعيد" : "فتح متابعتي اليوم"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

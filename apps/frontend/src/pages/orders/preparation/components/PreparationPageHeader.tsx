import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

interface PreparationPageHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const PreparationPageHeader = ({
  refreshing,
  onRefresh,
}: PreparationPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <section className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-2.5 text-card-foreground">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t("preparation.pageHeader.title")}</p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all active:scale-[0.98] hover:bg-muted/50 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {t("preparation.pageHeader.refresh")}
      </button>
    </section>
  );
};

export default PreparationPageHeader;

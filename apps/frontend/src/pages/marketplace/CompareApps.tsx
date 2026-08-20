import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompareApps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slugs = searchParams.get("apps")?.split(",").filter(Boolean) || [];

  if (slugs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-muted-foreground/40" />
          <h1 className="text-2xl font-extrabold text-foreground mb-2">{t('marketplace.compareTitle')}</h1>
          <p className="text-muted-foreground mb-6">Add apps from the marketplace to compare them side by side.</p>
          <Link to="/marketplace">
            <Button className="gap-2 rounded-xl"><ArrowRight size={15} />{t('marketplace.browseAll')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-5">
        <button onClick={() => navigate('/marketplace')} className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ChevronRight size={18} />{t('marketplace.browseAll')}
        </button>
        <h1 className="text-2xl font-extrabold text-foreground mt-2">{t('marketplace.compareTitle')}</h1>
        <p className="text-muted-foreground mt-4">Comparing: {slugs.join(", ")}</p>
        <p className="text-sm text-muted-foreground mt-4">Full comparison feature coming soon.</p>
      </div>
    </div>
  );
}

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppWindow, Store, Sparkles, ChevronLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SYSTEM_HUBS } from "@/utils/marketplaceSystems";
import { STARTER_APPS } from "../../types/myAppsTypes";

interface MyAppsEmptyStateProps {
  totalAppsCount: number;
  selectedHub: string;
  hubCounts: Record<string, number>;
  onResetFilters: () => void;
}

export const MyAppsEmptyState: React.FC<MyAppsEmptyStateProps> = ({
  totalAppsCount,
  selectedHub,
  hubCounts,
  onResetFilters,
}) => {
  const navigate = useNavigate();

  // Case 1: Absolutely zero apps installed
  if (totalAppsCount === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-6 sm:p-10 text-center space-y-6">
        <div className="max-w-md mx-auto space-y-2">
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <AppWindow size={32} />
          </div>
          <h2 className="text-xl font-black text-foreground">لم يتم تفعيل أي تطبيقات بعد</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            متجرك جاهز للتوسع. قم بتفعيل الأدوات التي تحتاجها لأتمتة الرسائل، وزيادة المبيعات، ومتابعة الطلبات.
          </p>
          <div className="pt-2">
            <Link to="/marketplace">
              <Button className="rounded-xl font-bold gap-2 px-6">
                <Store size={16} />
                <span>تصفح متجر التطبيقات الآن</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Recommended Starters */}
        <div className="pt-6 border-t border-border/40 text-right">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-sm font-black text-foreground">أدوات أساسية موصى بها لبدء النمو:</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STARTER_APPS.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.slug}
                  className="rounded-2xl border border-border/40 bg-card p-4 flex flex-col justify-between text-right hover:border-primary/40 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ItemIcon size={20} />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20">
                        {item.badge}
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link to={`/marketplace/apps/${item.slug}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl gap-1">
                        <span>استكشاف الأداة</span>
                        <ChevronLeft size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Filter/Search Zero Results
  const currentHub = SYSTEM_HUBS.find((h) => h.id === selectedHub);
  const isSelectedHubEmpty = selectedHub !== "ALL" && (!hubCounts[selectedHub] || hubCounts[selectedHub] === 0);

  return (
    <div className="text-center py-16 px-4 rounded-3xl border border-border/40 bg-card/30 space-y-3">
      <div className="size-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-2">
        <Search size={24} />
      </div>
      {isSelectedHubEmpty ? (
        <>
          <h3 className="text-base font-bold text-foreground">
            لم تقم بتفعيل أي أدوات في {currentHub?.nameAr} بعد
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            تصفح متجر التطبيقات لاكتشاف الأدوات والأنظمة المخصصة لهذا القطاع وتفعيلها لمتجرك.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="gap-1.5 rounded-xl font-bold text-xs shadow-sm"
              onClick={() => navigate(`/marketplace?hub=${selectedHub}`)}
            >
              <Store size={14} />
              <span>استعراض حلول {currentHub?.nameAr} في المتجر</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl font-bold text-xs"
              onClick={onResetFilters}
            >
              <span>عرض كل أدواتي</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-base font-bold text-foreground">لا توجد تطبيقات مطابقة لبحثك</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            لم نعثر على أي أدوات مطابقة لمعايير البحث الحالية. جرّب مسح البحث أو تغيير الفلتر.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl font-bold text-xs"
              onClick={onResetFilters}
            >
              <X size={14} />
              <span>إعادة تعيين الفلاتر</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

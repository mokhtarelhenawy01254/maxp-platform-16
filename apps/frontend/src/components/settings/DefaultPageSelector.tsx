import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  User,
  LayoutGrid,
  BarChart3,
  Users,
  ShoppingCart,
  Package,
  UserCheck,
  Settings,
  Store,
  MessageSquare,
} from "lucide-react";
import type { ElementType } from "react";

export interface DefaultPageOption {
  value: string;
  labelKey: string;
  icon: ElementType<{ className?: string }>;
}

export const DEFAULT_PAGE_OPTIONS: DefaultPageOption[] = [
  { value: "/apps", labelKey: "settings.page_apps", icon: LayoutGrid },
  { value: "/company-dashboard", labelKey: "settings.page_company-dashboard", icon: BarChart3 },
  { value: "/orders", labelKey: "settings.page_orders", icon: ShoppingCart },
  { value: "/products", labelKey: "settings.page_products", icon: Package },
  { value: "/customers", labelKey: "settings.page_customers", icon: Users },
  { value: "/users", labelKey: "settings.page_users", icon: UserCheck },
  { value: "/profile", labelKey: "settings.page_profile", icon: User },
  { value: "/settings", labelKey: "settings.page_settings", icon: Settings },
  { value: "/marketplace", labelKey: "settings.page_marketplace", icon: Store },
  { value: "/whatsapp#chat", labelKey: "settings.page_whatsapp", icon: MessageSquare },
];

interface DefaultPageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DefaultPageSelector({
  value,
  onChange,
  disabled,
}: DefaultPageSelectorProps) {
  const { t } = useTranslation();

  const selectedOption = useMemo(
    () =>
      DEFAULT_PAGE_OPTIONS.find(
        (o) =>
          o.value === value ||
          (o.value.startsWith("/whatsapp") && value.startsWith("/whatsapp")),
      ),
    [value],
  );

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center gap-2">
        {selectedOption && (
          <selectedOption.icon className="w-4 h-4 text-primary shrink-0" />
        )}
        <span className="text-xs font-semibold text-foreground">
          {t("settings.defaultPage", "الصفحة الرئيسية الافتراضية")}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t("settings.defaultPageHint", "الصفحة التي يتم فتحها مباشرة بعد تسجيل الدخول")}
      </p>
      <Select value={value || "/apps"} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all text-xs text-foreground cursor-pointer shadow-2xs">
          <SelectValue placeholder={t("settings.selectDefaultPage", "اختر الصفحة الافتراضية")}>
            {selectedOption && (
              <span className="flex items-center gap-2 text-xs font-medium">
                <selectedOption.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{t(selectedOption.labelKey)}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="border border-border/70 bg-card rounded-2xl shadow-2xl p-1">
          {DEFAULT_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs rounded-lg focus:bg-muted/70 cursor-pointer py-1.5">
              <span className="flex items-center gap-2">
                <option.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{t(option.labelKey)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default DefaultPageSelector;

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
  HomeIcon,
  Squares2X2Icon,
  ChartBarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CubeIcon,
  UsersIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import type { ElementType } from "react";

export interface DefaultPageOption {
  value: string;
  labelKey: string;
  icon: ElementType<{ className?: string }>;
}

export const DEFAULT_PAGE_OPTIONS: DefaultPageOption[] = [
  { value: "/apps", labelKey: "settings.page_apps", icon: Squares2X2Icon },
  { value: "/company-dashboard", labelKey: "settings.page_company-dashboard", icon: ChartBarIcon },
  { value: "/orders", labelKey: "settings.page_orders", icon: ShoppingCartIcon },
  { value: "/products", labelKey: "settings.page_products", icon: CubeIcon },
  { value: "/customers", labelKey: "settings.page_customers", icon: UserGroupIcon },
  { value: "/users", labelKey: "settings.page_users", icon: UsersIcon },
  { value: "/profile", labelKey: "settings.page_profile", icon: HomeIcon },
  { value: "/settings", labelKey: "settings.page_settings", icon: Cog6ToothIcon },
  { value: "/marketplace", labelKey: "settings.page_marketplace", icon: BuildingStorefrontIcon },
  { value: "/whatsapp#chat", labelKey: "settings.page_whatsapp", icon: ChatBubbleLeftRightIcon },
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
    () => DEFAULT_PAGE_OPTIONS.find((o) => o.value === value),
    [value],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {selectedOption && (
          <selectedOption.icon className="size-4 text-violet-500 dark:text-violet-400" />
        )}
        <span className="text-sm font-medium text-foreground">
          {t("settings.defaultPage")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("settings.defaultPageHint")}
      </p>
      <Select value={value || "/apps"} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder={t("settings.selectDefaultPage")}>
            {selectedOption && (
              <span className="flex items-center gap-2">
                <selectedOption.icon className="size-4" />
                {t(selectedOption.labelKey)}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {DEFAULT_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <option.icon className="size-4" />
                {t(option.labelKey)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
import type { ElementType } from "react";

export interface DefaultPageOption {
  value: string;
  label: string;
  icon: ElementType<{ className?: string }>;
}

export const DEFAULT_PAGE_OPTIONS: DefaultPageOption[] = [
  { value: "/apps", label: "التطبيقات", icon: Squares2X2Icon },
  { value: "/company-dashboard", label: "لوحة التحكم", icon: ChartBarIcon },
  { value: "/orders", label: "الطلبات", icon: ShoppingCartIcon },
  { value: "/products", label: "المنتجات", icon: CubeIcon },
  { value: "/customers", label: "العملاء", icon: UserGroupIcon },
  { value: "/users", label: "المستخدمين", icon: UsersIcon },
  { value: "/profile", label: "الملف الشخصي", icon: HomeIcon },
  { value: "/settings", label: "الإعدادات", icon: Cog6ToothIcon },
  { value: "/marketplace", label: "المتجر", icon: BuildingStorefrontIcon },
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
          {t("settings.defaultPage") || "الصفحة الافتراضية بعد تسجيل الدخول"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("settings.defaultPageHint") ||
          "اختر الصفحة التي يفتح عليها النظام بعد تسجيل الدخول"}
      </p>
      <Select value={value || "/apps"} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-11 rounded-2xl">
          <SelectValue placeholder={t("settings.selectDefaultPage") || "اختر الصفحة الافتراضية"}>
            {selectedOption && (
              <span className="flex items-center gap-2">
                <selectedOption.icon className="size-4" />
                {selectedOption.label}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {DEFAULT_PAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <option.icon className="size-4" />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

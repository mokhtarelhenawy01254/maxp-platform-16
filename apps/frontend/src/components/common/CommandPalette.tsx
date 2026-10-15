import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ShoppingBag,
  BarChart3,
  Archive,
  Settings,
  Plus,
  Download,
  CheckCircle2,
  Search,
  Truck,
  Users,
  FileText,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type PaletteShortcut = "navigation" | "create" | "bulk";

export interface PaletteCommand {
  id: string;
  label: string;
  group: "navigation" | "create" | "bulk" | "view";
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onSelect: () => void;
  keywords?: string;
}

export interface CommandPaletteProps {
  showTrigger?: boolean;
  commands?: PaletteCommand[];
  extraCommands?: PaletteCommand[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  showTrigger = true,
  commands,
  extraCommands,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const runAndClose = useCallback((fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 50);
  }, []);

  const shortcutHint = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘ K" : "Ctrl K";
  }, []);

  const defaultCommands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "nav-orders",
        group: "navigation",
        icon: ShoppingBag,
        label: t("palette.navOrders", { defaultValue: "الطلبات" }),
        keywords: t("palette.navOrdersKeywords", { defaultValue: "orders" }),
        onSelect: () => runAndClose(() => navigate("/orders")),
      },
      {
        id: "nav-orders-workspace",
        group: "navigation",
        icon: CheckCircle2,
        label: t("palette.navOrdersWorkspace", {
          defaultValue: "مركز التأكيد والمتابعة",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/workspace")),
      },
      {
        id: "nav-orders-prep",
        group: "navigation",
        icon: Archive,
        label: t("palette.navOrdersPrep", { defaultValue: "تجهيز الطلبات" }),
        onSelect: () => runAndClose(() => navigate("/orders/preparation")),
      },
      {
        id: "nav-analytics",
        group: "navigation",
        icon: BarChart3,
        label: t("palette.navAnalytics", { defaultValue: "تحليلات الطلبات" }),
        onSelect: () => runAndClose(() => navigate("/orders/analytics")),
      },
      {
        id: "nav-products",
        group: "navigation",
        icon: FileText,
        label: t("palette.navProducts", { defaultValue: "المنتجات" }),
        onSelect: () => runAndClose(() => navigate("/products")),
      },
      {
        id: "nav-customers",
        group: "navigation",
        icon: Users,
        label: t("palette.navCustomers", { defaultValue: "العملاء" }),
        onSelect: () => runAndClose(() => navigate("/customers")),
      },
      {
        id: "nav-returns",
        group: "navigation",
        icon: Truck,
        label: t("palette.navReturns", { defaultValue: "مراجعة المرتجعات" }),
        onSelect: () => runAndClose(() => navigate("/returns")),
      },
      {
        id: "nav-settings",
        group: "navigation",
        icon: Settings,
        label: t("palette.navSettings", { defaultValue: "الإعدادات" }),
        onSelect: () => runAndClose(() => navigate("/settings/orders")),
      },
      {
        id: "create-manual",
        group: "create",
        icon: Plus,
        label: t("palette.createManualOrder", {
          defaultValue: "إنشاء طلب يدوي",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/manual")),
      },
      {
        id: "create-bulk",
        group: "create",
        icon: Download,
        label: t("palette.createBulkOrder", {
          defaultValue: "استيراد طلبات جماعية",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/bulk")),
      },
      {
        id: "view-search",
        group: "view",
        icon: Search,
        label: t("palette.viewSearch", { defaultValue: "البحث المجمع" }),
        onSelect: () => runAndClose(() => navigate("/bulk-search")),
      },
      {
        id: "view-invoices",
        group: "view",
        icon: FileText,
        label: t("palette.viewInvoices", { defaultValue: "فواتير الطلبات" }),
        onSelect: () => runAndClose(() => navigate("/orders/invoices")),
      },
    ],
    [navigate, runAndClose, t],
  );

  const items = useMemo(
    () => [...(commands ?? defaultCommands), ...(extraCommands ?? [])],
    [commands, defaultCommands, extraCommands],
  );
  const grouped = useMemo(() => {
    const map = new Map<PaletteCommand["group"], PaletteCommand[]>();
    for (const cmd of items) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const groupLabels: Record<PaletteCommand["group"], string> = {
    navigation: t("palette.groupNavigation", { defaultValue: "التنقل" }),
    create: t("palette.groupCreate", { defaultValue: "إنشاء" }),
    bulk: t("palette.groupBulk", { defaultValue: "إجراءات جماعية" }),
    view: t("palette.groupView", { defaultValue: "عرض" }),
  };

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 text-muted-foreground border-border/70 hover:bg-muted/50 h-8 rounded-lg"
          aria-label={String(t("palette.openPalette", { defaultValue: "فتح لوحة الأوامر" }))}
        >
          <Terminal className="size-3.5 text-primary" />
          <span className="hidden sm:inline text-xs font-medium text-foreground">
            {t("palette.quickSearch", { defaultValue: "بحث سريع" })}
          </span>
          <CommandShortcut className="font-mono tabular-nums text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/60">
            {shortcutHint}
          </CommandShortcut>
        </Button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={String(t("palette.title", { defaultValue: "لوحة الأوامر" }))}
        description={String(
          t("palette.description", {
            defaultValue: "ابحث عن أمر أو انتقل لصفحة",
          }),
        )}
      >
        <CommandInput
          placeholder={String(
            t("palette.placeholder", {
              defaultValue: "اكتب أمراً أو ابحث...",
            }),
          )}
        />
        <CommandList>
          <CommandEmpty>
            {t("palette.noResults", { defaultValue: "لا توجد نتائج" })}
          </CommandEmpty>
          {grouped.map(([group, list], idx) => (
            <React.Fragment key={group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={groupLabels[group]}>
                {list.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <CommandItem
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords ?? ""}`}
                      onSelect={() => cmd.onSelect()}
                    >
                      {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
                      <span className="text-xs font-medium">{cmd.label}</span>
                      {cmd.shortcut && (
                        <CommandShortcut className="font-mono tabular-nums text-[10px]">
                          {cmd.shortcut}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <CommandShortcut>↑↓</CommandShortcut>
            {t("palette.navigate", { defaultValue: "تنقل" })}
          </span>
          <span className="flex items-center gap-1.5">
            <CommandShortcut>↵</CommandShortcut>
            {t("palette.open", { defaultValue: "فتح" })}
          </span>
          <span className="flex items-center gap-1.5">
            <CommandShortcut>esc</CommandShortcut>
            {t("palette.close", { defaultValue: "إغلاق" })}
          </span>
        </div>
      </CommandDialog>
    </>
  );
};

export default CommandPalette;

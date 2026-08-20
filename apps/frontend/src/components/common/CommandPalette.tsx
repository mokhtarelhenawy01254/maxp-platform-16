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
  ShoppingBagIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
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
  /**
   * Render a trigger button somewhere in the page. Pass `false` if you mount
   * the palette via shortcut only (the default keyboard shortcut still works).
   */
  showTrigger?: boolean;
  /**
   * Custom commands to register. If omitted, a default navigation + create
   * set is provided.
   */
  commands?: PaletteCommand[];
  /**
   * Extra commands to append AFTER the default commands. Useful for adding
   * page-specific actions like bulk operations without losing the built-in
   * navigation shortcuts.
   */
  extraCommands?: PaletteCommand[];
}

/**
 * App-wide command palette. Open with `ΓîÿK` (macOS) or `Ctrl+K` (Windows/Linux).
 * Built on top of the shadcn `Command` primitive, which is wired to the
 * shared `OrderModal` Dialog underneath.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  showTrigger = true,
  commands,
  extraCommands,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Global ΓîÿK / Ctrl+K shortcut. Skipped if the user is typing in a form
  // field so we don't hijack browser shortcuts.
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
    // Defer navigation until the dialog close animation kicks in, otherwise
    // the dialog leave animation gets cut off.
    setTimeout(fn, 50);
  }, []);

  const shortcutHint = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return /Mac|iPhone|iPad/i.test(navigator.platform) ? "Γîÿ K" : "Ctrl K";
  }, []);

  const defaultCommands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "nav-orders",
        group: "navigation",
        icon: ShoppingBagIcon,
        label: t("palette.navOrders", { defaultValue: "╪º┘ä╪╖┘ä╪¿╪º╪¬" }),
        keywords: t("palette.navOrdersKeywords", { defaultValue: "orders" }),
        onSelect: () => runAndClose(() => navigate("/orders")),
      },
      {
        id: "nav-orders-workspace",
        group: "navigation",
        icon: CheckCircleIcon,
        label: t("palette.navOrdersWorkspace", {
          defaultValue: "┘à╪▒┘â╪▓ ╪º┘ä╪¬╪ú┘â┘è╪» ┘ê╪º┘ä┘à╪¬╪º╪¿╪╣╪⌐",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/workspace")),
      },
      {
        id: "nav-orders-prep",
        group: "navigation",
        icon: ArchiveBoxIcon,
        label: t("palette.navOrdersPrep", { defaultValue: "╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪╖┘ä╪¿╪º╪¬" }),
        onSelect: () => runAndClose(() => navigate("/orders/preparation")),
      },
      {
        id: "nav-analytics",
        group: "navigation",
        icon: ChartBarIcon,
        label: t("palette.navAnalytics", { defaultValue: "╪¬╪¡┘ä┘è┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬" }),
        onSelect: () => runAndClose(() => navigate("/orders/analytics")),
      },
      {
        id: "nav-products",
        group: "navigation",
        icon: DocumentTextIcon,
        label: t("palette.navProducts", { defaultValue: "╪º┘ä┘à┘å╪¬╪¼╪º╪¬" }),
        onSelect: () => runAndClose(() => navigate("/products")),
      },
      {
        id: "nav-customers",
        group: "navigation",
        icon: UserGroupIcon,
        label: t("palette.navCustomers", { defaultValue: "╪º┘ä╪╣┘à┘ä╪º╪í" }),
        onSelect: () => runAndClose(() => navigate("/customers")),
      },
      {
        id: "nav-returns",
        group: "navigation",
        icon: TruckIcon,
        label: t("palette.navReturns", { defaultValue: "┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä┘à╪▒╪¬╪¼╪╣╪º╪¬" }),
        onSelect: () => runAndClose(() => navigate("/returns")),
      },
      {
        id: "nav-settings",
        group: "navigation",
        icon: Cog6ToothIcon,
        label: t("palette.navSettings", { defaultValue: "╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬" }),
        onSelect: () => runAndClose(() => navigate("/settings/orders")),
      },
      {
        id: "create-manual",
        group: "create",
        icon: PlusIcon,
        label: t("palette.createManualOrder", {
          defaultValue: "╪Ñ┘å╪┤╪º╪í ╪╖┘ä╪¿ ┘è╪»┘ê┘è",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/manual")),
      },
      {
        id: "create-bulk",
        group: "create",
        icon: ArrowDownTrayIcon,
        label: t("palette.createBulkOrder", {
          defaultValue: "╪º╪│╪¬┘è╪▒╪º╪» ╪╖┘ä╪¿╪º╪¬ ╪¼┘à╪º╪╣┘è╪⌐",
        }),
        onSelect: () => runAndClose(() => navigate("/orders/bulk")),
      },
      {
        id: "view-search",
        group: "view",
        icon: MagnifyingGlassIcon,
        label: t("palette.viewSearch", { defaultValue: "╪º┘ä╪¿╪¡╪½ ╪º┘ä┘à╪¼┘à╪╣" }),
        onSelect: () => runAndClose(() => navigate("/bulk-search")),
      },
      {
        id: "view-invoices",
        group: "view",
        icon: DocumentTextIcon,
        label: t("palette.viewInvoices", { defaultValue: "┘ü┘ê╪º╪¬┘è╪▒ ╪º┘ä╪╖┘ä╪¿╪º╪¬" }),
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
    navigation: t("palette.groupNavigation", { defaultValue: "╪º┘ä╪¬┘å┘é┘ä" }),
    create: t("palette.groupCreate", { defaultValue: "╪Ñ┘å╪┤╪º╪í" }),
    bulk: t("palette.groupBulk", { defaultValue: "╪Ñ╪¼╪▒╪º╪í╪º╪¬ ╪¼┘à╪º╪╣┘è╪⌐" }),
    view: t("palette.groupView", { defaultValue: "╪╣╪▒╪╢" }),
  };

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 text-muted-foreground"
          aria-label={String(t("palette.openPalette", { defaultValue: "┘ü╪¬╪¡ ┘ä┘ê╪¡╪⌐ ╪º┘ä╪ú┘ê╪º┘à╪▒" }))}
        >
          <CommandLineIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t("palette.quickSearch", { defaultValue: "╪¿╪¡╪½ ╪│╪▒┘è╪╣" })}
          </span>
          <CommandShortcut>{shortcutHint}</CommandShortcut>
        </Button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={String(t("palette.title", { defaultValue: "┘ä┘ê╪¡╪⌐ ╪º┘ä╪ú┘ê╪º┘à╪▒" }))}
        description={String(
          t("palette.description", {
            defaultValue: "╪º╪¿╪¡╪½ ╪╣┘å ╪ú┘à╪▒ ╪ú┘ê ╪º┘å╪¬┘é┘ä ┘ä╪╡┘ü╪¡╪⌐",
          }),
        )}
      >
        <CommandInput
          placeholder={String(
            t("palette.placeholder", {
              defaultValue: "╪º┘â╪¬╪¿ ╪ú┘à╪▒╪º┘ï ╪ú┘ê ╪º╪¿╪¡╪½...",
            }),
          )}
        />
        <CommandList>
          <CommandEmpty>
            {t("palette.noResults", { defaultValue: "┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼" })}
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
                      {Icon && <Icon className="text-muted-foreground" />}
                      <span>{cmd.label}</span>
                      {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <CommandShortcut>ΓåæΓåô</CommandShortcut>
            {t("palette.navigate", { defaultValue: "╪¬┘å┘é┘ä" })}
          </span>
          <span className="flex items-center gap-2">
            <CommandShortcut>Γå╡</CommandShortcut>
            {t("palette.open", { defaultValue: "┘ü╪¬╪¡" })}
          </span>
          <span className="flex items-center gap-2">
            <CommandShortcut>esc</CommandShortcut>
            {t("palette.close", { defaultValue: "╪Ñ╪║┘ä╪º┘é" })}
          </span>
        </div>
      </CommandDialog>
    </>
  );
};

export default CommandPalette;

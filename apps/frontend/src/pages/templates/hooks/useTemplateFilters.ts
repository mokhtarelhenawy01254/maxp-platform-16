import { useMemo, useState } from "react";
import type {
  FilterChip,
  SortMode,
  StatusWithTemplate,
  TabDef,
  TemplateScopeConfig,
  EventRow,
} from "../types";

function isMetaTemplateBound(tpl?: { metaTemplateName?: string | null } | null): boolean {
  return !!tpl?.metaTemplateName;
}

function isCustomContent(status: StatusWithTemplate): boolean {
  const GENERIC_PATTERN = /تم تغيير حالة طلبك إلى/;
  return !!status.template?.content && !GENERIC_PATTERN.test(status.template.content);
}

export interface UseTemplateFiltersProps {
  statuses: StatusWithTemplate[];
  config: TemplateScopeConfig;
  activeTab: string;
}

export function useTemplateFilters({ statuses, config, activeTab }: UseTemplateFiltersProps) {
  const [showInternal, setShowInternal] = useState(false);
  const [activeChip, setActiveChip] = useState<FilterChip>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>(
    config.features.sortModes.includes("alphabetical") ? "alphabetical" : "statusType",
  );

  const activeTabDef = config.tabs.find((tb) => tb.key === activeTab);

  const filteredStatuses = useMemo(() => {
    if (activeTabDef?.kind === "list" && activeTabDef.filter) {
      return statuses.filter((s) => activeTabDef.filter!(s as EventRow));
    }
    return statuses;
  }, [statuses, activeTabDef]);

  const visibleStatuses = useMemo(
    () => filteredStatuses.filter((s) => showInternal || !s.isNonNotifiable),
    [filteredStatuses, showInternal]
  );

  const internalCount = filteredStatuses.filter((s) => s.isNonNotifiable).length;

  const scheduleCountLabel = useMemo(() => {
    const sched = statuses.filter((s) => {
      const st = String(s.statusType || "").toLowerCase();
      const cat = String(s.category || "").toUpperCase();
      return st !== "occasion" && st !== "products" && cat !== "OCCASION" && cat !== "PRODUCTS";
    });
    const on = sched.filter((s) => s.notifyCustomer).length;
    return `${on}/${sched.length}`;
  }, [statuses]);

  const notifiableCount = useMemo(
    () => statuses.filter((s) => !s.isNonNotifiable).length,
    [statuses]
  );

  const filteredByChipAndSearch = useMemo(() => {
    let result = visibleStatuses;

    if (activeChip === "custom") {
      result = result.filter((s) => {
        if (!s.template?.content && !s.metaTemplate?.content) return false;
        const content = s.template?.content || s.metaTemplate?.content || "";
        return /\{\{|\}\}/.test(content) || isCustomContent(s);
      });
    } else if (activeChip === "meta_bound") {
      result = result.filter((s) => isMetaTemplateBound(s.template) || isMetaTemplateBound(s.metaTemplate));
    } else if (activeChip === "no_template") {
      result = result.filter((s) => !s.hasTemplate);
    } else if (activeChip === "disabled") {
      result = result.filter((s) => !s.notifyCustomer);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    }

    result = [...result];
    if (sortMode === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (sortMode === "statusType") {
      const typeOrder: Record<string, number> = { order: 0, payment: 1, preparation: 2, shipping: 3 };
      result.sort(
        (a, b) => (typeOrder[a.statusType] ?? 9) - (typeOrder[b.statusType] ?? 9) || a.sortOrder - b.sortOrder
      );
    } else if (sortMode === "recent") {
      result.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    }

    return result;
  }, [visibleStatuses, activeChip, searchQuery, sortMode]);

  const { groupedStatuses, groupKeys } = useMemo(() => {
    const groups = new Map<string, StatusWithTemplate[]>();
    for (const s of filteredByChipAndSearch) {
      const key =
        config.features.groupMode === "identity"
          ? s.code
          : s.template?.content?.trim() || s.metaTemplate?.content?.trim() || "__no-template__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return { groupedStatuses: groups, groupKeys: Array.from(groups.keys()) };
  }, [filteredByChipAndSearch, config.features.groupMode]);

  return {
    showInternal,
    setShowInternal,
    activeChip,
    setActiveChip,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    activeTabDef,
    filteredStatuses,
    visibleStatuses,
    internalCount,
    scheduleCountLabel,
    notifiableCount,
    filteredByChipAndSearch,
    groupedStatuses,
    groupKeys,
  };
}

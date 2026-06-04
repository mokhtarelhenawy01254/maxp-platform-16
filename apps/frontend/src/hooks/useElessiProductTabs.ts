import { useMemo, useState } from "react";
import type { ElessiProductTab } from "../data/mockData";

export interface UseElessiProductTabsResult {
  activeTabId: string;
  setActiveTabId: (tabId: string) => void;
  tabs: ElessiProductTab[];
}

export const useElessiProductTabs = (
  sourceTabs: ElessiProductTab[],
  defaultTabId?: string,
): UseElessiProductTabsResult => {
  const fallbackId = sourceTabs[0]?.id || "description";
  const initialTab = defaultTabId || fallbackId;
  const [activeTabId, setActiveTabId] = useState(initialTab);

  const tabs = useMemo(() => sourceTabs, [sourceTabs]);

  return {
    activeTabId,
    setActiveTabId,
    tabs,
  };
};

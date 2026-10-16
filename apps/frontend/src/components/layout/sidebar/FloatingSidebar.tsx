import React from "react";
import ClassicSidebar from "./ClassicSidebar";
import { SidebarSection } from "../../../types/layout";

interface FloatingSidebarProps {
  isCollapsed: boolean;
  mobileMode?: boolean;
  toggleSidebar: () => void;
  sections: SidebarSection[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  currentPath: string;
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = (props) => {
  if (props.mobileMode) {
    return <ClassicSidebar {...props} />;
  }
  return (
    <div className="h-full py-3 px-2 bg-transparent">
      <div className="h-full rounded-2xl shadow-2xs overflow-hidden border border-border/70 bg-card text-foreground">
        <ClassicSidebar {...props} />
      </div>
    </div>
  );
};

export default FloatingSidebar;

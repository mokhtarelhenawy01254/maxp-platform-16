import React from "react";
import ClassicSidebar from "./ClassicSidebar";
import { SidebarSection, SidebarLayoutType } from "../../../types/layout";

// Will import other layouts as they are implemented
import ThreeTierSidebar from "./ThreeTierSidebar";
import HorizontalNav from "./HorizontalNav";
import FloatingSidebar from "./FloatingSidebar";
import MinimalSidebar from "./MinimalSidebar";

interface SidebarLayoutFactoryProps {
  layout: SidebarLayoutType;
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

const SidebarLayoutFactory: React.FC<SidebarLayoutFactoryProps> = (props) => {
  switch (props.layout) {
    case "affiliate-demo":
    case "three-tier":
      return <ThreeTierSidebar {...props} />;
    case "horizontal":
      return <HorizontalNav {...props} />;
    case "floating":
      return <FloatingSidebar {...props} />;
    case "minimal":
      return <MinimalSidebar {...props} />;
    case "app-dashboard":
      return props.mobileMode ? <ThreeTierSidebar {...props} /> : null;
    case "classic":
    default:
      return <ClassicSidebar {...props} />;
  }
};

export default SidebarLayoutFactory;

export type SidebarLayoutType =
  | "classic"
  | "three-tier"
  | "affiliate-demo"
  | "horizontal"
  | "floating"
  | "minimal"
  | "app-dashboard";

export interface SidebarItem {
  to: string;
  icon?: any;
  label: string;
  external?: boolean;
  badge?: string;
  children?: { to: string; label: string; hidden?: boolean; requiredRoles?: string[] }[];
  hidden?: boolean;
  requiredRoles?: string[];
  requiredApps?: string[];
  requiredPermissions?: string[];
  itemId?: string;
}

export interface SidebarSection {
  id: string;
  title: string;
  icon?: any;
  items: SidebarItem[];
  hidden?: boolean;
  requiredRoles?: string[];
  requiredApps?: string[];
  requiredPermissions?: string[];
  sectionId?: string;
}

// Settings stored in DB for dynamic sidebar management
export interface SidebarItemSettings {
  visible: boolean;
  enabled: boolean;
  order: number;
  requiredRoles: string[];
  requiredApps: string[];
  label?: string;
  icon?: string;
}

export interface SidebarSectionSettings {
  visible: boolean;
  order: number;
  requiredRoles: string[];
  requiredApps: string[];
  items: Record<string, SidebarItemSettings>;
}

export interface SidebarManagementData {
  sections: Record<string, SidebarSectionSettings>;
  layout?: string;
  updatedAt?: string;
}

// Per-user sidebar settings (stored in localStorage, optional overlay on company settings)
export interface UserSidebarSettings {
  enabled: boolean;
  sections: Record<string, SidebarSectionSettings>;
  updatedAt?: string;
}

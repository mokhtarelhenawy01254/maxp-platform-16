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

export interface SidebarCustomItem {
  key: string;
  order: number;
  visible: boolean;
  labelAr?: string;
  labelEn?: string;
  iconName?: string;
}

export interface EducationTabSetting {
  id: string;
  key: string;
  defaultLabelAr?: string;
  defaultLabelEn?: string;
  labelAr?: string;
  labelEn?: string;
  order: number;
  visible: boolean;
  locked?: boolean;
  iconName?: string;
}

export interface EducationSettingsData {
  systemTitle?: string;
  systemTitleEn?: string;
  educationMode?: "COURSES" | "ACADEMIC";
  enableSubjects?: boolean;
  tabs?: EducationTabSetting[];
}

export type SidebarManagementData =
  | {
      sections?: Record<string, SidebarSectionSettings>;
      items?: SidebarCustomItem[];
      layout?: string;
      updatedAt?: string;
      educationSettings?: EducationSettingsData | null;
      apps?: Record<string, { customName?: string | null; name?: string | null }>;
    }
  | SidebarCustomItem[];

// Per-user sidebar settings (stored in localStorage, optional overlay on company settings)
export interface UserSidebarSettings {
  enabled: boolean;
  sections: Record<string, SidebarSectionSettings>;
  sidebarLayout?: SidebarLayoutType | null;
  updatedAt?: string;
}

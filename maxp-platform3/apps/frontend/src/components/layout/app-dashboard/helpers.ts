import type { SidebarSection } from '../../../types/layout';

export const sectionHasVisibleItems = (section: SidebarSection): boolean =>
  !section.hidden && section.items.some((item) => !item.hidden);

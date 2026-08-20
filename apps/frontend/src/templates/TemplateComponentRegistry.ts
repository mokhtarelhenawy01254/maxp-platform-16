import React from "react";
import type { TemplateSlotName } from "./TemplateSlot";

export type ComponentRegistry = Partial<Record<TemplateSlotName, React.ComponentType<any>>>;

const LinearSidebar = React.lazy(() => import("./template-2/sidebar"));
const LinearHeader = React.lazy(() => import("./template-2/header"));

export const templateRegistries: Record<string, ComponentRegistry> = {
  "template-1": {},
  "template-2": {
    sidebar: LinearSidebar,
    header: LinearHeader,
  },
};

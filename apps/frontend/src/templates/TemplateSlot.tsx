import React from "react";
import { useTemplate } from "./useTemplate";

export type TemplateSlotName = "sidebar" | "header" | "layoutShell";

interface TemplateSlotProps {
  name: TemplateSlotName;
  props?: Record<string, unknown>;
  children: React.ReactNode;
}

const TemplateSlot: React.FC<TemplateSlotProps> = ({ name, props = {}, children }) => {
  const { registry } = useTemplate();
  const Override = registry[name];

  if (Override) {
    return React.createElement(Override, props);
  }

  return <>{children}</>;
};

export default TemplateSlot;

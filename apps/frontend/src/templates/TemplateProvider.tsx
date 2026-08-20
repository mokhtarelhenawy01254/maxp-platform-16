import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { templateRegistries, type ComponentRegistry } from "./TemplateComponentRegistry";
import { templateMetas, type TemplateMeta } from "../config/templates";

const STORAGE_KEY = "maxp-template";

interface TemplateContextValue {
  templateId: string;
  setTemplate: (id: string) => void;
  registry: ComponentRegistry;
  meta: TemplateMeta;
}

export const TemplateContext = createContext<TemplateContextValue | null>(null);

const normalizeTemplateId = (id: string | null | undefined): string => {
  if (!id) return "template-1";
  return id in templateRegistries ? id : "template-1";
};

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templateId, setTemplateId] = useState<string>(() => {
    if (typeof window === "undefined") return "template-1";
    return normalizeTemplateId(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const normalized = normalizeTemplateId(templateId);
    document.documentElement.setAttribute("data-template", normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  }, [templateId]);

  const setTemplate = useCallback((id: string) => {
    setTemplateId(normalizeTemplateId(id));
  }, []);

  const value = useMemo<TemplateContextValue>(
    () => ({
      templateId: normalizeTemplateId(templateId),
      setTemplate,
      registry: templateRegistries[normalizeTemplateId(templateId)] || {},
      meta: (templateMetas.find((m) => m.id === normalizeTemplateId(templateId)) ?? templateMetas[0]) as TemplateMeta,
    }),
    [templateId, setTemplate],
  );

  return React.createElement(TemplateContext.Provider, { value }, children);
};

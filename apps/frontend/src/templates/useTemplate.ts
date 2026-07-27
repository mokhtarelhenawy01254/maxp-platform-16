import { useContext } from "react";
import { TemplateContext } from "./TemplateProvider";

export const useTemplate = () => {
  const ctx = useContext(TemplateContext);
  if (!ctx) {
    return {
      templateId: "template-1",
      setTemplate: () => {},
      registry: {},
      meta: { id: "template-1", name: "Business OS", colors: { primary: "", secondary: "", background: "" } },
    };
  }
  return ctx;
};

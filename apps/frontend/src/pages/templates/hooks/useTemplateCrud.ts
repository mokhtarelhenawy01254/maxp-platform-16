import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  normalizeVariableSyntax,
  extractLocalVariableOrder,
  buildLocalContentFromMetaBody,
  parseTemplateButtons,
} from "../utils";
import {
  emptyTemplateForm,
  type TemplateScopeConfig,
  type StatusWithTemplate,
  type Template,
  type TemplateButton,
  type TemplateFormState,
  type TemplateSlot,
  type MetaAvailableTemplate,
  type EventRow,
} from "../types";

function getMetaSlotTemplate(status: StatusWithTemplate): Template | null {
  if (status.metaTemplate) return status.metaTemplate;
  if (status.template?.metaTemplateName && String(status.template.channel || "").toUpperCase() !== "META_CLOUD") {
    return status.template;
  }
  return null;
}

export interface UseTemplateCrudProps {
  config: TemplateScopeConfig;
  availableMetaTemplates: MetaAvailableTemplate[];
  fetchData: () => Promise<void>;
  bindMetaTemplate: (templateId: string, metaName: string, metaLang: string) => Promise<void>;
  fetchMetaSessions: () => Promise<void>;
  onDirtyDialog: () => void;
}

export function useTemplateCrud({
  config,
  availableMetaTemplates,
  fetchData,
  bindMetaTemplate,
  fetchMetaSessions,
  onDirtyDialog,
}: UseTemplateCrudProps) {
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusWithTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<TemplateSlot>("regular");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "switch">("create");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm());
  const [originalMetaTemplateName, setOriginalMetaTemplateName] = useState<string>("");

  const initialFormRef = useRef<string | null>(null);
  const isFormDirty = () =>
    initialFormRef.current !== null && initialFormRef.current !== JSON.stringify(templateForm);

  const openCreateDialog = (status: StatusWithTemplate, slot: TemplateSlot) => {
    setSelectedStatus(status);
    setSelectedTemplate(null);
    setDialogSlot(slot);
    setDialogMode("create");
    setOriginalMetaTemplateName("");
    const form: TemplateFormState = {
      name: slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`,
      content: slot === "meta" && status.template?.content ? status.template.content : config.defaultContent,
      isActive: true,
      hasButtons: config.features.enableButtons,
      buttons: config.features.enableButtons
        ? (config.defaultCreateButtons
          ? config.defaultCreateButtons.map((b) => ({ ...b }))
          : [
              { id: "confirm", text: "تأكيد الأوردر", action: "CONFIRMED", type: "QUICK_REPLY" },
              { id: "cancel", text: "إلغاء الأوردر", action: "CANCELLED", type: "QUICK_REPLY" },
            ])
        : [],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: "",
      metaTemplateLanguage: "ar",
      headerFormat: slot === "meta" ? "IMAGE" : "TEXT",
      headerMediaHandle: "",
      headerMediaName: "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage && slot === "meta",
      category: config.features.categoryMode === "manual"
        ? (status.category || config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER")
        : "CUSTOMER",
      metaCategory: String(status.category || "").toUpperCase() === "MARKETING" ? "MARKETING" : "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const openEditDialog = (status: StatusWithTemplate, slot: TemplateSlot = "regular") => {
    setSelectedStatus(status);
    const target = slot === "meta" ? getMetaSlotTemplate(status) : status.template;
    setSelectedTemplate(target);
    setDialogSlot(slot);
    setDialogMode("edit");
    const metaName = target?.metaTemplateName || "";
    setOriginalMetaTemplateName(metaName);
    const form: TemplateFormState = {
      name: target?.name || (slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`),
      content: target?.content || config.defaultContent,
      isActive: target?.isActive ?? true,
      hasButtons: config.features.enableButtons ? (target?.hasButtons ?? true) : false,
      buttons: config.features.enableButtons ? parseTemplateButtons(target?.buttons) : [],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: metaName,
      metaTemplateLanguage: target?.metaTemplateLanguage || "ar",
      headerFormat: target?.headerFormat || (slot === "meta" ? "IMAGE" : "TEXT"),
      headerMediaHandle: target?.headerMediaHandle || "",
      headerMediaName: target?.headerMediaHandle || "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage ? (target?.headerUsesOrderProduct ?? (slot === "meta")) : false,
      category: config.features.categoryMode === "manual"
        ? (status.category || config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER")
        : "CUSTOMER",
      metaCategory: String(status.category || "").toUpperCase() === "MARKETING" ? "MARKETING" : "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const openSwitchDialog = (status: StatusWithTemplate) => {
    const current = getMetaSlotTemplate(status);
    setSelectedStatus(status);
    setSelectedTemplate(current);
    setDialogSlot("meta");
    setDialogMode("switch");
    const metaName = current?.metaTemplateName || "";
    setOriginalMetaTemplateName(metaName);
    const form: TemplateFormState = {
      name: current?.name || `قالب ميتا ${status.name}`,
      content: current?.content || config.defaultContent,
      isActive: current?.isActive ?? true,
      hasButtons: config.features.enableButtons ? (current?.hasButtons ?? true) : false,
      buttons: config.features.enableButtons ? parseTemplateButtons(current?.buttons) : [],
      sendMode: "bind_meta",
      metaTemplateName: metaName,
      metaTemplateLanguage: current?.metaTemplateLanguage || "ar",
      headerFormat: current?.headerFormat || "IMAGE",
      headerMediaHandle: current?.headerMediaHandle || "",
      headerMediaName: current?.headerMediaHandle || "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage ? (current?.headerUsesOrderProduct ?? true) : false,
      category: config.features.categoryMode === "manual" ? (config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER") : "CUSTOMER",
      metaCategory: "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const persistLocalTemplate = useCallback(async (): Promise<string | null> => {
    if (!selectedStatus) return null;
    if (!templateForm.content.trim()) {
      toast.error("محتوى الرسالة مطلوب");
      return null;
    }
    const enableButtons = config.features.enableButtons;
    const saveButtons = enableButtons && templateForm.hasButtons
      ? templateForm.buttons
          .filter((b) => b.text.trim())
          .map((b) => ({
            id: b.id,
            text: b.text.trim(),
            action: b.type === "LINK" ? "LINK" : b.action.toUpperCase(),
            type: b.type || "QUICK_REPLY",
          }))
      : [];
    setSaving(true);
    try {
      const isEdit = !!selectedTemplate?.id;
      const category =
        config.features.categoryMode === "manual"
          ? templateForm.category || "CUSTOMER"
          : config.resolveCategory?.(selectedStatus as EventRow) || "ORDERS";
      const contentOut =
        config.variableSyntax === "single"
          ? normalizeVariableSyntax(templateForm.content, "single")
          : templateForm.content;
      const payload: {
        category: string;
        eventType: string;
        name: string;
        content: string;
        isActive: boolean;
        hasButtons: boolean;
        buttons: { id: string; text: string; action: string; type?: string }[];
        channel?: string;
        headerFormat?: string;
        headerMediaHandle?: string;
        headerUsesOrderProduct?: boolean;
        variables?: string[];
      } = {
        category,
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: contentOut,
        isActive: templateForm.isActive,
        hasButtons: saveButtons.length > 0,
        buttons: saveButtons,
        variables: extractLocalVariableOrder(templateForm.content),
      };
      if (dialogSlot === "meta" && templateForm.headerFormat !== "TEXT") {
        payload.headerFormat = templateForm.headerFormat;
        payload.headerMediaHandle = templateForm.headerMediaHandle || undefined;
        if (config.features.enableHeaderProductImage) {
          payload.headerUsesOrderProduct = templateForm.headerUsesOrderProduct;
        }
      }
      if (!isEdit) {
        payload.channel = dialogSlot === "meta" ? "META_CLOUD" : "AUTO";
      }
      if (isEdit) {
        await apiClient.put(`${config.templateCrudBase}/${selectedTemplate!.id}`, payload);
        toast.success("تم تحديث القالب بنجاح");
        onDirtyDialog();
        return selectedTemplate!.id;
      } else {
        const res = await apiClient.post(config.templateCrudBase, payload);
        const created = (res?.data as { template?: { id?: string } })?.template;
        const newTemplateId = created?.id;
        if (!newTemplateId) {
          toast.error("حدث خطأ في حفظ القالب");
          return null;
        }
        toast.success("تم إنشاء القالب بنجاح");
        onDirtyDialog();
        setSelectedStatus((prev) => {
          if (!prev) return prev;
          const newTpl = {
            id: newTemplateId,
            name: templateForm.name,
            content: templateForm.content,
            eventType: prev.code,
            isActive: templateForm.isActive,
            hasButtons: saveButtons.length > 0,
            buttons: saveButtons.length > 0 ? JSON.stringify(saveButtons) : undefined,
            channel: dialogSlot === "meta" ? "META_CLOUD" : "AUTO",
          };
          return {
            ...prev,
            template: dialogSlot === "meta" ? prev.template : newTpl,
            metaTemplate: dialogSlot === "meta" ? newTpl : prev.metaTemplate,
            hasTemplate: true,
            hasMetaTemplate: dialogSlot === "meta" ? true : !!prev.metaTemplate,
          };
        });
        setSelectedTemplate((prev) =>
          dialogSlot === "meta" || prev ? { id: newTemplateId, name: templateForm.name, content: templateForm.content, eventType: selectedStatus.code, isActive: templateForm.isActive } : null
        );
        return newTemplateId;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "حدث خطأ في حفظ القالب");
      return null;
    } finally {
      setSaving(false);
    }
  }, [selectedStatus, selectedTemplate, templateForm, dialogSlot, config, onDirtyDialog]);

  const handleSave = async () => {
    if (!selectedStatus) return;
    if (dialogSlot === "meta") {
      const templateId = await persistLocalTemplate();
      if (!templateId) return;
      if (templateForm.metaTemplateName) {
        await bindMetaTemplate(templateId, templateForm.metaTemplateName, templateForm.metaTemplateLanguage);
      } else {
        setDialogOpen(false);
        fetchData();
      }
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    setDialogOpen(false);
    fetchData();
  };

  const updateButton = (idx: number, patch: Partial<TemplateButton>) => {
    setTemplateForm((p) => ({
      ...p,
      buttons: p.buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
  };

  const removeButton = (idx: number) => {
    setTemplateForm((p) => ({ ...p, buttons: p.buttons.filter((_, i) => i !== idx) }));
  };

  const addButton = () => {
    setTemplateForm((p) => {
      if (p.buttons.length >= 3) return p;
      return {
        ...p,
        buttons: [...p.buttons, { id: `btn_${Date.now()}`, text: "", action: "CONFIRMED", type: "QUICK_REPLY" }],
      };
    });
  };

  const addLinkButton = () => {
    setTemplateForm((p) => {
      if (p.buttons.length >= 3) return p;
      return {
        ...p,
        buttons: [...p.buttons, { id: `link_${Date.now()}`, text: "صفحتي على المتجر", action: "LINK", type: "LINK" }],
      };
    });
  };

  const metaBindingChanged = dialogSlot === "meta" && templateForm.metaTemplateName !== originalMetaTemplateName;
  const buttonsSignature = (btns: TemplateButton[]): string =>
    JSON.stringify(
      (Array.isArray(btns) ? btns : [])
        .filter((b) => b.text.trim())
        .map((b) => ({
          id: b.id,
          text: b.text.trim(),
          action: b.type === "LINK" ? "LINK" : String(b.action || "").toUpperCase(),
          type: b.type || "QUICK_REPLY",
        }))
    );
  const metaContentChanged =
    dialogSlot === "meta" &&
    !!selectedTemplate?.id &&
    (templateForm.content !== (selectedTemplate?.content || "") ||
      templateForm.hasButtons !== (selectedTemplate?.hasButtons ?? false) ||
      buttonsSignature(templateForm.buttons) !== buttonsSignature(parseTemplateButtons(selectedTemplate?.buttons)));
  const isMetaBound = dialogSlot === "meta" && !!originalMetaTemplateName;

  const metaVariableMismatch = (() => {
    if (dialogSlot !== "meta" || !templateForm.metaTemplateName) return null;
    const metaBody = (() => {
      const sel = availableMetaTemplates.find((m) => m.name === templateForm.metaTemplateName);
      return (sel?.components || []).find((c) => c.type === "BODY")?.text || "";
    })();
    const metaCount = (metaBody.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
    if (metaCount === 0) return null;
    const localCount = extractLocalVariableOrder(templateForm.content).length;
    if (localCount >= metaCount) return null;
    return { metaCount, localCount, missing: metaCount - localCount };
  })();

  const metaDialogTitle = (() => {
    if (dialogMode === "switch") return `تغيير قالب ميتا: ${selectedStatus?.name}`;
    if (dialogSlot !== "meta") {
      return `${selectedTemplate?.id ? "تعديل قالب واتساب" : "إنشاء قالب واتساب"}: ${selectedStatus?.name}`;
    }
    if (dialogMode === "create") return `إنشاء قالب ميتا: ${selectedStatus?.name}`;
    if (isMetaBound && metaContentChanged) return `تحديث محتوى قالب ميتا: ${selectedStatus?.name}`;
    return `تعديل قالب ميتا: ${selectedStatus?.name}`;
  })();

  const handleMetaTemplateSelect = (name: string) => {
    const selected = availableMetaTemplates.find((m) => m.name === name);
    const metaBody = (selected?.components || []).find((c) => c.type === "BODY")?.text || "";

    setTemplateForm((p) => {
      const existingVars = extractLocalVariableOrder(p.content);
      const metaVarCount = (metaBody.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
      const needsFill = metaVarCount > 0 && existingVars.length < metaVarCount;
      if (needsFill) {
        const filled = selected?.boundLocalContent || buildLocalContentFromMetaBody(metaBody, config.metaToLocalDefaultOrder);
        if (filled && filled !== p.content) {
          return { ...p, metaTemplateName: name, content: filled };
        }
      }
      return { ...p, metaTemplateName: name };
    });
  };

  return {
    saving,
    selectedStatus,
    setSelectedStatus,
    dialogOpen,
    setDialogOpen,
    dialogSlot,
    dialogMode,
    selectedTemplate,
    templateForm,
    setTemplateForm,
    originalMetaTemplateName,
    isFormDirty,
    openCreateDialog,
    openEditDialog,
    openSwitchDialog,
    persistLocalTemplate,
    handleSave,
    updateButton,
    removeButton,
    addButton,
    addLinkButton,
    metaBindingChanged,
    metaContentChanged,
    isMetaBound,
    metaVariableMismatch,
    metaDialogTitle,
    handleMetaTemplateSelect,
  };
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18n from "../../i18n";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Languages,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Pencil,
  Image,
  Video,
  File,
  MessageSquare,
  Library,
  History,
  ChevronDown,
  ChevronRight,
  Shield,
  Search,
  MoreHorizontal,
  Copy,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";
import { templateLibrary } from "../../data/metaTemplateLibrary";
import { TEMPLATE_SECTIONS, resolveTemplateSection } from "../../data/templateSectionRegistry";

interface MetaComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string }[];
  example?: { header_handle?: string[] };
}

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  id?: string;
  rejected_reason?: string;
  components?: MetaComponent[];
}

interface TemplateHistoryEntry {
  action: "created" | "edited" | "deleted";
  name: string;
  language: string;
  timestamp: number;
  category?: string;
}

const statusBadge: Record<string, string> = {
  APPROVED: "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08] dark:text-emerald-200",
  PENDING: "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/[0.08] dark:text-amber-200",
  REJECTED: "border-red-300/70 bg-red-500/10 text-red-800 dark:border-red-500/40 dark:bg-red-500/[0.08] dark:text-red-200",
  DISABLED: "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/[0.08] dark:text-slate-300",
  PAUSED: "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/[0.08] dark:text-blue-200",
};

const statusIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  APPROVED: CheckCircle,
  PENDING: Clock,
  REJECTED: XCircle,
  DISABLED: XCircle,
  PAUSED: AlertTriangle,
};

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];

const CATEGORY_STYLE: Record<string, { icon: string; gradient: string; badge: string; sectionBg: string }> = {
  AUTHENTICATION: {
    icon: "🔐",
    gradient: "from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300",
    sectionBg: "bg-gradient-to-b from-violet-50/50 to-transparent dark:from-violet-950/20",
  },
  MARKETING: {
    icon: "📢",
    gradient: "from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
    sectionBg: "bg-gradient-to-b from-rose-50/50 to-transparent dark:from-rose-950/20",
  },
  UTILITY: {
    icon: "🔧",
    gradient: "from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    sectionBg: "bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20",
  },
};

function sanitizeTemplateName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function hasNamedVariables(text: string): boolean {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.some((m) => !/^\{\{\d+\}\}$/.test(m));
}

function isValidButtonUrl(url: string): boolean {
  if (!url) return true;
  return url.startsWith("https://") || url.startsWith("http://");
}

function extractVariableNumbers(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches)].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""));
    const nb = parseInt(b.replace(/\D/g, ""));
    return na - nb;
  });
}

const PROHIBITED_WORDS = [
  "free money", "guaranteed income", "cryptocurrency", "bitcoin", "casino",
  "gambling", "lottery", "prize", "winner", "congratulations you won",
  "click here", "limited time offer!!", "act now!!", "exclusive deal!!",
  "discount!!!", "buy now!!!", "call now", "sex", "adult", "nude",
];

const COMPLIANCE_RULES = [
  { id: "body_required", check: (f: typeof initialForm) => !f.bodyText, message: "محتوى الرسالة (BODY) مطلوب — لا يمكن ترك الحقل فارغاً" },
  { id: "header_text_length", check: (f: typeof initialForm) => f.headerFormat === "TEXT" && f.headerText.length > 60, message: "نص رأس الرسالة (HEADER) يجب ألا يتجاوز 60 حرفاً" },
  { id: "footer_length", check: (f: typeof initialForm) => f.footerText.length > 60, message: "نص التذييل (FOOTER) يجب ألا يتجاوز 60 حرفاً" },
  { id: "body_length", check: (f: typeof initialForm) => f.bodyText.length > 1024, message: "محتوى الرسالة (BODY) يجب ألا يتجاوز 1024 حرفاً" },
  { id: "named_vars_header", check: (f: typeof initialForm) => f.headerFormat === "TEXT" && hasNamedVariables(f.headerText), message: "⚠️ Meta لا يقبل أسماء متغيرات في HEADER. استخدم {{1}}, {{2}} بدلاً من {{name}}" },
  { id: "named_vars_body", check: (f: typeof initialForm) => hasNamedVariables(f.bodyText), message: "⚠️ Meta لا يقبل أسماء متغيرات في BODY. استخدم {{1}}, {{2}} بدلاً من {{name}}" },
  { id: "header_media_required", check: (f: typeof initialForm) => f.headerFormat !== "TEXT" && !f.headerMediaHandle, message: "⚠️ رأس IMAGE/VIDEO/DOCUMENT يتطلب رفع وسيط — ميتا ترفض القالب بدونه (header_handle)" },
  { id: "button_url_invalid", check: (f: typeof initialForm) => f.buttonText && !isValidButtonUrl(f.buttonUrl), message: "رابط الزر (URL) يجب أن يبدأ بـ https:// — مثال: https://example.com/pay" },
  { id: "var_start_body", check: (f: typeof initialForm) => /^\{\{1\}\}/.test(f.bodyText.trim()), message: "⚠️ Meta لا يقبل أن يبدأ محتوى الرسالة (BODY) بمتغير {{1}}. أضف نصاً قبل المتغير.", severity: "warning" },
  { id: "var_end_body", check: (f: typeof initialForm) => /\{\{\d+\}\}$/.test(f.bodyText.trim()), message: "⚠️ Meta لا يقبل أن ينتهي محتوى الرسالة (BODY) بمتغير. أضف نقطة أو نصاً بعد المتغير.", severity: "warning" },
  { id: "prohibited_words", check: (f: typeof initialForm) => {
    const allText = [f.headerText, f.bodyText, f.footerText].filter(Boolean).join(" ").toLowerCase();
    const found = PROHIBITED_WORDS.filter(w => allText.includes(w));
    if (found.length > 0) return true;
    return false;
  }, message: "⚠️ النص يحتوي على كلمات قد تسبب رفض القالب من ميتا (تجنب العبارات التسويقية المبالغ فيها)", severity: "warning" },
  { id: "excessive_punctuation", check: (f: typeof initialForm) => {
    const allText = [f.headerText, f.bodyText, f.footerText].filter(Boolean).join(" ");
    const exclaimMatch = allText.match(/!{3,}/g);
    const questMatch = allText.match(/\?{3,}/g);
    return !!(exclaimMatch?.length || questMatch?.length);
  }, message: "⚠️ تجنب استخدام علامات الترقيم المتكررة (!!!, ???) — قد تسبب رفض القالب", severity: "warning" },
  { id: "all_caps", check: (f: typeof initialForm) => {
    const words = f.bodyText.split(/\s+/).filter(w => w.length > 3);
    const capsWords = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w));
    return capsWords.length > words.length * 0.5;
  }, message: "⚠️ تجنب استخدام الأحرف الكبيرة (CAPS) في معظم النص — قد يُعتبر SPAM", severity: "warning" },
];

type ComplianceResult = { id: string; message: string; severity: "error" | "warning" };

function runComplianceCheck(form: typeof initialForm): ComplianceResult[] {
  const results: ComplianceResult[] = [];
  for (const rule of COMPLIANCE_RULES) {
    try {
      if (rule.check(form)) {
        results.push({ id: rule.id, message: rule.message, severity: (rule as any).severity || "error" });
      }
    } catch { }
  }
  return results;
}

const initialForm = {
  name: "",
  language: "en",
  category: "MARKETING",
  headerFormat: "TEXT" as string,
  headerText: "",
  headerMediaHandle: "",
  headerMediaName: "",
  bodyText: "",
  footerText: "",
  buttonText: "",
  buttonUrl: "",
};

const HISTORY_KEY = "meta_template_history";

function loadHistory(): TemplateHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function addHistory(entry: TemplateHistoryEntry) {
  const history = loadHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

const WhatsAppMetaTemplates: React.FC<{
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}> = ({ companyId, companyName, superAdminMode = false }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [sessions, setSessions] = useState<{ id: string; name?: string; phoneNumber: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState(initialForm);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<MetaTemplate | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<typeof initialForm | null>(null);
  const [editSending, setEditSending] = useState(false);
  const [editComplianceResults, setEditComplianceResults] = useState<ComplianceResult[]>([]);
  const [editShowCompliance, setEditShowCompliance] = useState(false);

  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [templateHistory, setTemplateHistory] = useState<TemplateHistoryEntry[]>([]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [sectionFilter, setSectionFilter] = useState<string>("ALL");

  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [showCompliance, setShowCompliance] = useState(false);

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions", withCompanyConfig());
      const metaSessions = ((res as any).data?.sessions || []).filter(
        (s: any) => s.provider === "META_CLOUD" || s.metaWabaId,
      );
      setSessions(metaSessions);
      if (metaSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(metaSessions[0].id);
      }
    } catch { }
  }, [withCompanyConfig]);

  const fetchTemplates = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/whatsapp-templates/templates?sessionId=${selectedSessionId}`,
        withCompanyConfig(),
      );
      setTemplates((res as any).data?.templates || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId, withCompanyConfig]);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { fetchTemplates(); }, [selectedSessionId]);

  const sanitizedName = useMemo(() => sanitizeTemplateName(form.name), [form.name]);
  const nameValid = sanitizedName.length >= 1 && sanitizedName.length <= 512;
  const headerVarsOk = form.headerFormat !== "TEXT" || !form.headerText || !hasNamedVariables(form.headerText);
  const bodyVarsOk = !form.bodyText || !hasNamedVariables(form.bodyText);
  const buttonUrlOk = isValidButtonUrl(form.buttonUrl);

  const extractedVars = useMemo(() => {
    const allText = [form.headerText, form.bodyText, form.footerText, form.buttonText].filter(Boolean).join(" ");
    return extractVariableNumbers(allText);
  }, [form.headerText, form.bodyText, form.footerText, form.buttonText]);

  const previewText = useMemo(() => {
    let text = "";
    if (form.headerFormat === "TEXT" && form.headerText) {
      text += `🔷 ${form.headerText}\n\n`;
    } else if (form.headerFormat !== "TEXT" && form.headerText) {
      text += `🔷 [${form.headerFormat}] ${form.headerText}\n\n`;
    } else if (form.headerFormat !== "TEXT") {
      text += `🔷 [${form.headerFormat} media]\n\n`;
    }
    if (form.bodyText) text += `${form.bodyText}\n`;
    if (form.footerText) text += `\n${form.footerText}`;
    if (form.buttonText) text += `\n\n[ ${form.buttonText} ]`;
    extractedVars.forEach((v) => {
      const key = v.replace(/\D/g, "");
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), varValues[key] || `{{${key}}}`);
    });
    return text;
  }, [form, extractedVars, varValues]);

  const buildComponents = useCallback((f: typeof initialForm) => {
    const components: any[] = [
      { type: "BODY", text: f.bodyText },
    ];
    if (f.headerFormat === "TEXT" && f.headerText) {
      components.unshift({ type: "HEADER", format: "TEXT", text: f.headerText });
    } else if (f.headerFormat !== "TEXT") {
      const headerComp: any = { type: "HEADER", format: f.headerFormat };
      if (f.headerMediaHandle) headerComp.headerHandle = f.headerMediaHandle;
      components.unshift(headerComp);
    } else if (f.headerText) {
      components.unshift({ type: "HEADER", format: "TEXT", text: f.headerText });
    }
    if (f.footerText) {
      components.push({ type: "FOOTER", text: f.footerText });
    }
    if (f.buttonText) {
      const url = f.buttonUrl || "https://example.com";
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      const buttons: any[] = [{ type: "URL", text: f.buttonText, url: finalUrl }];
      components.push({ type: "BUTTONS", buttons });
    }
    return components;
  }, []);

  const handleComplianceCheck = useCallback((f: typeof initialForm) => {
    const results = runComplianceCheck(f);
    setComplianceResults(results);
    setShowCompliance(true);
    return results.filter(r => r.severity === "error").length === 0;
  }, []);

  const handleCreate = useCallback(async () => {
    if (!sanitizedName || !form.bodyText) {
      tToast.error("WhatsAppMetaTemplates.msg_5d29");
      return;
    }
    if (!nameValid) {
      tToast.error("WhatsAppMetaTemplates.msg_7367");
      return;
    }
    const checkPassed = handleComplianceCheck(form);
    if (!checkPassed) return;
    try {
      setSending(true);
      const components = buildComponents(form);

      await apiClient.post(
        "/whatsapp-templates/templates",
        { sessionId: selectedSessionId, name: sanitizedName, language: form.language, category: form.category, components },
        withCompanyConfig(),
      );
      addHistory({ action: "created", name: sanitizedName, language: form.language, timestamp: Date.now(), category: form.category });
      tToast.success("WhatsAppMetaTemplates.success_create_b7fe");
      setCreateOpen(false);
      setForm({ ...initialForm });
      setVarValues({});
      setShowCompliance(false);
      setComplianceResults([]);
      fetchTemplates();
    } catch (err: any) {
      const metaMsg = err?.response?.data?.error;
      toast.error(metaMsg || i18n.t("WhatsAppMetaTemplates.failed_create_1d9d"), { duration: 8000 });
    } finally {
      setSending(false);
    }
  }, [form, sanitizedName, nameValid, selectedSessionId, withCompanyConfig, fetchTemplates, buildComponents, handleComplianceCheck]);

  const handleEdit = useCallback(async () => {
    if (!editForm || !editForm.name) {
      tToast.error("WhatsAppMetaTemplates.msg_bfc1");
      return;
    }
    const results = runComplianceCheck(editForm);
    setEditComplianceResults(results);
    setEditShowCompliance(true);
    if (results.some(r => r.severity === "error")) {
      tToast.error("WhatsAppMetaTemplates.msg_e04d");
      return;
    }
    try {
      setEditSending(true);
      const components = buildComponents(editForm);

      await apiClient.put(
        "/whatsapp-templates/templates",
        { sessionId: selectedSessionId, templateName: editForm.name, components, language: editForm.language, category: editForm.category },
        withCompanyConfig(),
      );
      addHistory({ action: "edited", name: editForm.name, language: editForm.language, timestamp: Date.now(), category: editForm.category });
      tToast.success("WhatsAppMetaTemplates.success_update_ee74");
      setEditOpen(false);
      setEditForm(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحديث القالب", { duration: 8000 });
    } finally {
      setEditSending(false);
    }
  }, [editForm, selectedSessionId, withCompanyConfig, fetchTemplates, buildComponents]);

  const handleDelete = useCallback(async (templateName: string) => {
    try {
      await apiClient.delete("/whatsapp-templates/templates", {
        data: { sessionId: selectedSessionId, templateName },
        ...withCompanyConfig(),
      });
      addHistory({ action: "deleted", name: templateName, language: "", timestamp: Date.now() });
      tToast.success("WhatsAppMetaTemplates.success_delete_3acd");
      setDeleteConfirm(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل حذف القالب");
    }
  }, [selectedSessionId, withCompanyConfig, fetchTemplates]);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.status !== "DELETED"),
    [templates],
  );

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, MetaTemplate[]> = {};
    for (const t of filteredTemplates) {
      const section = resolveTemplateSection(t.name, t.category);
      if (sectionFilter !== "ALL" && section.id !== sectionFilter) continue;
      if (!groups[t.name]) groups[t.name] = [];
      groups[t.name]!.push(t);
    }
    return groups;
  }, [filteredTemplates, sectionFilter]);

  const sectionFilterOptions = useMemo(() => TEMPLATE_SECTIONS, []);

  // Aggregated counts for the status health banner. We collapse variants of
  // the same template (different languages) into the template-group level so
  // a single failing variant does not double-count the overall health.
  const statusCounts = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0, disabled: 0, paused: 0, total: 0 };
    for (const group of Object.values(groupedTemplates)) {
      counts.total += 1;
      const statuses = new Set(group.map((t) => t.status));
      if (statuses.has("REJECTED")) counts.rejected += 1;
      else if (statuses.has("PENDING")) counts.pending += 1;
      else if (statuses.has("DISABLED")) counts.disabled += 1;
      else if (statuses.has("PAUSED")) counts.paused += 1;
      else if (statuses.has("APPROVED")) counts.approved += 1;
    }
    return counts;
  }, [groupedTemplates]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(p => ({ ...p, [name]: !p[name] }));
  };

  const applyLibraryTemplate = useCallback((libTpl: typeof templateLibrary[number]) => {
    const lang = libTpl.languages[0]!;
    setForm({
      name: libTpl.name,
      language: lang.code,
      category: libTpl.category,
      headerFormat: libTpl.headerFormat || "TEXT",
      headerText: lang.headerText,
      headerMediaHandle: "",
      headerMediaName: "",
      bodyText: lang.bodyText,
      footerText: lang.footerText,
      buttonText: libTpl.buttonText || "",
      buttonUrl: libTpl.buttonUrl || "",
    });
    setLibraryOpen(false);
    setLibrarySearch("");
    setCreateStep(1);
    setCreateOpen(true);
  }, []);

  const uploadHeaderMedia = useCallback(async (
    file: File,
    apply: (handle: string, name: string) => void,
  ) => {
    if (!selectedSessionId) {
      tToast.error("WhatsAppMetaTemplates.msg_5d29");
      return;
    }
    setUploadingHeader(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedSessionId);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, ...withCompanyConfig() },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        apply(data.mediaId, data.fileName || file.name);
        tToast.success("WhatsAppMetaTemplates.success_upload_media");
      } else {
        toast.error(data?.error || "فشل رفع الوسيط");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل رفع الوسيط إلى ميتا");
    } finally {
      setUploadingHeader(false);
    }
  }, [selectedSessionId, withCompanyConfig]);

  const filteredLibrary = useMemo(() => {
    if (!librarySearch) return templateLibrary;
    const q = librarySearch.toLowerCase();
    return templateLibrary.filter(t =>
      t.name.includes(q) ||
      t.description.includes(q) ||
      t.tags.some(tag => tag.includes(q)) ||
      t.category.toLowerCase().includes(q)
    );
  }, [librarySearch]);

  const libraryByCategory = useMemo(() => {
    const groups: Record<string, typeof templateLibrary> = {};
    for (const t of filteredLibrary) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category]!.push(t);
    }
    return groups;
  }, [filteredLibrary]);

  const pageTitle = companyName
    ? `قوالب Meta API · ${companyName}`
    : "قوالب Meta API";

  return (
    <TooltipProvider delayDuration={300}>
      <WhatsAppPageShell
        title={pageTitle}
        description="إدارة قوالب واتساب بزنس المسجلة في Meta Cloud API"
        icon={Globe}
        backHref="/whatsapp"
        backLabel={t("common.back") as string}
        eyebrow={superAdminMode ? `Company: ${companyName}` : "WhatsApp Workspace"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSessionId} onValueChange={(v) => setSelectedSessionId(v ?? '')}>
              <SelectTrigger className="h-10 w-56 rounded-full bg-[color:var(--color-muted)]">
                <SelectValue placeholder="اختر جلسة">
                  {(value: string | null) => {
                    if (!value) return null;
                    const s = sessions.find((x) => x.id === value);
                    if (!s) return value;
                    const isCuid = s.name && s.name.length === 25 && /^[a-z]/.test(s.name);
                    return s.name && !isCuid ? s.name : s.phoneNumber || s.id;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => {
                  const isCuid = s.name && s.name.length === 25 && /^[a-z]/.test(s.name);
                  const displayName = (s.name && !isCuid) ? s.name : s.phoneNumber || s.id;
                  return (
                    <SelectItem key={s.id} value={s.id}>{displayName}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchTemplates}
                  disabled={loading}
                  aria-label="تحديث القوالب"
                  className="size-10 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تحديث القوالب</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => { setTemplateHistory(loadHistory()); setHistoryOpen(true); }}
                  aria-label="فتح سجل العمليات"
                  className="h-10 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95"
                >
                  <History className="size-4" /> السجل
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">سجل آخر عمليات على القوالب</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => { setLibrarySearch(""); setLibraryOpen(true); }}
                  aria-label="فتح مكتبة القوالب الجاهزة"
                  className="h-10 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95"
                >
                  <Library className="size-4" /> قوالب جاهزة
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">قوالب معتمدة جاهزة للنسخ</TooltipContent>
            </Tooltip>
            <Button
              onClick={() => { setCreateStep(1); setCreateOpen(true); }}
              aria-label="إنشاء قالب جديد"
              className="h-11 rounded-full px-5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md"
            >
              <Plus className="size-4" /> قالب جديد
            </Button>
          </div>
        }
      >
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Health banner — surfaces template-approval state so the user does
          not have to read every badge. Hidden when there is nothing to act on. */}
      {!loading && statusCounts.total > 0 && (statusCounts.rejected > 0 || statusCounts.pending > 0) ? (
        <Alert
          className={
            statusCounts.rejected > 0
              ? "border-red-300/70 bg-red-500/[0.06] text-red-800 dark:border-red-500/30 dark:bg-red-500/[0.06] dark:text-red-200"
              : "border-amber-300/70 bg-amber-500/[0.06] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/[0.06] dark:text-amber-200"
          }
        >
          {statusCounts.rejected > 0 ? (
            <XCircle className="size-4" aria-hidden="true" />
          ) : (
            <Clock className="size-4" aria-hidden="true" />
          )}
          <AlertTitle className="text-sm font-semibold">
            {statusCounts.rejected > 0
              ? `${statusCounts.rejected} قالب${statusCounts.rejected === 1 ? "" : "ات"} مرفوض${statusCounts.rejected === 1 ? "" : "ة"} من Meta — يحتاج تعديل`
              : `${statusCounts.pending} قالب${statusCounts.pending === 1 ? "" : "ات"} في انتظار موافقة Meta`}
          </AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            {statusCounts.rejected > 0
              ? "افتح القالب لقراءة سبب الرفض، عدّل المحتوى، ثم أعد إرساله للمراجعة."
              : "عادةً تتم الموافقة خلال بضع دقائق إلى 24 ساعة. اضغط تحديث للتحقق من الحالة."}
            {statusCounts.approved > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  {statusCounts.approved} معتمدة
                </span>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <WhatsAppSurfaceCard
        title="قوالب Meta API"
        description="القوالب المسجلة لدى واتساب بزنس — مجمعة حسب الاسم"
        action={
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[color:var(--color-muted-foreground)] sm:inline">القسم:</span>
            <Select value={sectionFilter} onValueChange={(v) => setSectionFilter(v ?? "ALL")}>
              <SelectTrigger className="h-9 w-44 rounded-full bg-[color:var(--color-muted)] text-xs">
                <SelectValue placeholder="كل الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الأقسام</SelectItem>
                {sectionFilterOptions.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.icon} {sec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : Object.keys(groupedTemplates).length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center text-[color:var(--color-muted-foreground)]">
            <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <FileText className="size-8 text-[color:var(--color-muted-foreground)]" />
            </div>
            <p className="text-sm font-medium">{selectedSessionId ? "لا توجد قوالب بعد" : "اختر جلسة أولاً"}</p>
            <p className="text-xs">{selectedSessionId ? "أنشئ أول قالب لإرسال رسائل واتساب بزنس." : "اختر جلسة واتساب من القائمة أعلاه لعرض القوالب."}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>اللغات</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedTemplates).map(([groupName, groupTemplates]) => {
                const expanded = expandedGroups[groupName] !== false;
                const uniqueStatuses = [...new Set(groupTemplates.map(t => t.status))];
                const bestStatus = uniqueStatuses.includes("APPROVED") ? "APPROVED" : (uniqueStatuses[0] ?? "PENDING");
                const StatusIcon = statusIcon[bestStatus] || AlertTriangle;
                const _languages = groupTemplates.map(t => t.language).join(", ");
                void _languages;
                return (
                  <React.Fragment key={groupName}>
                    <TableRow className="cursor-pointer hover:bg-[var(--color-muted)]" onClick={() => toggleGroup(groupName)}>
                      <TableCell>
                        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{groupName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge[bestStatus] || ""}>
                          <StatusIcon className="ml-1 size-3.5 inline" />
                          {bestStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{groupTemplates[0]?.category}</TableCell>
                      <TableCell>
                        {(() => {
                          const sec = resolveTemplateSection(groupName, groupTemplates[0]?.category);
                          return (
                            <Badge variant="outline" className={`text-[11px] ${sec.badge}`} title={sec.description || sec.label}>
                              <span className="ml-1">{sec.icon}</span>
                              {sec.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(groupTemplates.map(t => t.language))].map(lang => (
                            <Badge key={lang} variant="secondary" className="text-[10px]">{lang}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="معاينة سريعة"
                                onClick={() => {
                                  const tmpl = groupTemplates[0];
                                  if (tmpl) setViewTemplate(tmpl);
                                }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">معاينة سريعة</TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="المزيد من الإجراءات"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">المزيد من الإجراءات</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={() => {
                                  const tmpl = groupTemplates[0]!;
                                  const headerComponent = tmpl.components?.find((c) => c.type === "HEADER");
                                  const bodyComponent = tmpl.components?.find((c) => c.type === "BODY");
                                  const footerComponent = tmpl.components?.find((c) => c.type === "FOOTER");
                                  const buttonsComponent = tmpl.components?.find((c) => c.type === "BUTTONS");
                                  setEditForm({
                                    name: tmpl.name,
                                    language: tmpl.language,
                                    category: tmpl.category,
                                    headerFormat: headerComponent?.format || "TEXT",
                                    headerText: headerComponent?.text || "",
                                    headerMediaHandle: headerComponent?.example?.header_handle?.[0] || "",
                                    headerMediaName: headerComponent?.example?.header_handle?.[0] || "",
                                    bodyText: bodyComponent?.text || "",
                                    footerText: footerComponent?.text || "",
                                    buttonText: buttonsComponent?.buttons?.[0]?.text || "",
                                    buttonUrl: buttonsComponent?.buttons?.[0]?.url || "",
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="ml-2 size-4" />
                                تعديل القالب
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const tmpl = groupTemplates[0];
                                  if (tmpl) setViewTemplate(tmpl);
                                }}
                              >
                                <FileText className="ml-2 size-4" />
                                عرض التفاصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Open a fresh "create" form pre-filled with this template's content.
                                  // Uses the same wiring as `applyLibraryTemplate` so the user can clone
                                  // and tweak instead of editing in place — safer for approved templates
                                  // (Meta disallows edits to APPROVED templates, only deletion + recreate).
                                  const tmpl = groupTemplates[0]!;
                                  const headerComponent = tmpl.components?.find((c) => c.type === "HEADER");
                                  const bodyComponent = tmpl.components?.find((c) => c.type === "BODY");
                                  const footerComponent = tmpl.components?.find((c) => c.type === "FOOTER");
                                  const buttonsComponent = tmpl.components?.find((c) => c.type === "BUTTONS");
                                  setForm({
                                    name: `${tmpl.name}_copy`,
                                    language: tmpl.language,
                                    category: tmpl.category,
                                    headerFormat: headerComponent?.format || "TEXT",
                                    headerText: headerComponent?.text || "",
                                    headerMediaHandle: "",
                                    headerMediaName: "",
                                    bodyText: bodyComponent?.text || "",
                                    footerText: footerComponent?.text || "",
                                    buttonText: buttonsComponent?.buttons?.[0]?.text || "",
                                    buttonUrl: buttonsComponent?.buttons?.[0]?.url || "",
                                  });
                                  setCreateStep(2);
                                  setCreateOpen(true);
                                }}
                              >
                                <Copy className="ml-2 size-4" />
                                تكرار القالب
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(groupName)}
                                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              >
                                <Trash2 className="ml-2 size-4" />
                                حذف القالب
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && groupTemplates.map(t => (
                      <TableRow key={t.name + t.language} className="bg-[var(--color-muted)]">
                        <TableCell></TableCell>
                        <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">
                          <Languages className="ml-1 size-3.5 inline" />
                          {t.language} · ID: {t.id || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge[t.status] || ""}>
                            <StatusIcon className="ml-1 size-3.5 inline" />
                            {t.status}
                          </Badge>
                          {t.rejected_reason && (
                            <p className="mt-1 text-[10px] text-red-500">{t.rejected_reason}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const sec = resolveTemplateSection(t.name, t.category);
                            return (
                              <Badge variant="outline" className={`text-[10px] ${sec.badge}`} title={sec.description}>
                                {sec.icon} {sec.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell colSpan={2}>
                          <div className="text-xs text-[color:var(--color-muted-foreground)]">
                            {t.components?.filter(c => c.type === "BODY" || c.type === "HEADER").map(c => c.text).filter(Boolean).join(" · ") || "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </WhatsAppSurfaceCard>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateStep(1); setShowCompliance(false); setComplianceResults([]); } }}>
        <DialogContent className="max-w-xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>قالب جديد</DialogTitle>
            <DialogDescription>
              أنشئ قالب رسالة جديد في Meta Cloud API. بعد الإنشاء، يمر القالب بمراجعة من ميتا.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-6 flex items-center gap-2" role="group" aria-label="مراحل إنشاء القالب">
            {[
              { step: 1, label: "المعلومات الأساسية" },
              { step: 2, label: "المحتوى" },
              { step: 3, label: "المراجعة" },
            ].map((s, i) => (
              <React.Fragment key={s.step}>
                {i > 0 && <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${createStep >= s.step ? 'bg-[var(--shell-ring)]' : 'bg-[color:var(--shell-control-border)]'}`} />}
                <button
                  type="button"
                  onClick={() => setCreateStep(s.step as 1 | 2 | 3)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                    createStep === s.step
                      ? "bg-[color:var(--shell-ring)] text-white shadow-sm"
                      : "bg-[var(--color-muted)] text-[color:var(--color-muted-foreground)] hover:bg-[var(--shell-overlay-bg)]"
                  }`}
                >
                  <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-transform duration-200 ${
                    createStep === s.step ? "bg-white/20 scale-110" : "bg-[var(--color-muted-foreground)]/10"
                  }`}>
                    {createStep > s.step ? "✓" : s.step}
                  </span>
                  {s.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {createStep === 1 && (
            <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="space-y-2">
                <Label>اسم القالب</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="مثال: payment_request" className="h-11" dir="ltr" />
                {form.name && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[color:var(--color-muted-foreground)]">الاسم في Meta:</span>
                    <code className={`rounded-md px-2 py-0.5 font-mono ${nameValid ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                      {sanitizedName || '(غير صالح)'}
                    </code>
                  </div>
                )}
                <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                  أحرف إنجليزية صغيرة وأرقام و _ فقط. الأحرف العربية والمسافات تُحوَّل تلقائياً.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللغة</Label>
                  <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v ?? '' }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="tr">Türkçe</SelectItem>
                      <SelectItem value="ur">اردو</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v ?? '' }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>رأس الرسالة (اختياري)</Label>
                <div className="flex gap-2">
                  <Select value={form.headerFormat} onValueChange={(v) => setForm((p) => ({ ...p, headerFormat: v ?? '' }))}>
                    <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT"><MessageSquare className="ml-1 size-3.5 inline" /> TEXT</SelectItem>
                      <SelectItem value="IMAGE"><Image className="ml-1 size-3.5 inline" /> IMAGE</SelectItem>
                      <SelectItem value="VIDEO"><Video className="ml-1 size-3.5 inline" /> VIDEO</SelectItem>
                      <SelectItem value="DOCUMENT"><File className="ml-1 size-3.5 inline" /> DOCUMENT</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.headerFormat === "TEXT" && (
                    <Input value={form.headerText} onChange={(e) => setForm((p) => ({ ...p, headerText: e.target.value }))}
                      placeholder="السلام عليكم يا {{1}}" className="h-11 flex-1" />
                  )}
                  {form.headerFormat !== "TEXT" && (
                    <HeaderMediaUploadField
                      handle={form.headerMediaHandle}
                      fileName={form.headerMediaName}
                      format={form.headerFormat}
                      uploading={uploadingHeader}
                      onUpload={(file) => uploadHeaderMedia(file, (handle, name) =>
                        setForm((p) => ({ ...p, headerMediaHandle: handle, headerMediaName: name })))}
                      onRemove={() => setForm((p) => ({ ...p, headerMediaHandle: "", headerMediaName: "" }))}
                    />
                  )}
                </div>
                {form.headerFormat !== "TEXT" && !form.headerMediaHandle && (
                  <p className="text-[11px] text-amber-500 dark:text-amber-400">
                    ⚠️ ارفع وسيطاً (صورة/فيديو/مستند) — ميتا تتطلب sample media في الهيدر لاعتماد القالب
                  </p>
                )}
                {form.headerText && !headerVarsOk && (
                  <p className="text-[11px] text-red-500 dark:text-red-400">
                    ⚠️ استخدم متغيرات مرقمة: {"{{1}}"} بدلاً من {"{{name}}"}. Meta لا يقبل أسماء متغيرات.
                  </p>
                )}
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="space-y-2">
                <Label>محتوى الرسالة *</Label>
                <Textarea value={form.bodyText} onChange={(e) => setForm((p) => ({ ...p, bodyText: e.target.value }))}
                  placeholder={"مرحباً {{1}}\nطلبك رقم {{2}} جاهز للاستلام."}
                  className="min-h-[140px]" />
                {form.bodyText && !bodyVarsOk && (
                  <p className="text-[11px] text-red-500 dark:text-red-400">
                    ⚠️ استخدم متغيرات مرقمة: {"{{1}}"}, {"{{2}}"} بدلاً من أسماء. Meta يتطلب ترقيم المتغيرات.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>تذييل الرسالة (اختياري)</Label>
                <Input value={form.footerText} onChange={(e) => setForm((p) => ({ ...p, footerText: e.target.value }))}
                  placeholder="شكراً لاختيارك متجرنا" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نص الزر (اختياري)</Label>
                  <Input value={form.buttonText} onChange={(e) => setForm((p) => ({ ...p, buttonText: e.target.value }))}
                    placeholder="تتبع الطلب" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>رابط الزر (اختياري)</Label>
                  <Input value={form.buttonUrl} onChange={(e) => setForm((p) => ({ ...p, buttonUrl: e.target.value }))}
                    placeholder="https://example.com/track" className="h-11" dir="ltr" />
                  {form.buttonUrl && !buttonUrlOk && (
                    <p className="text-[11px] text-red-500 dark:text-red-400">
                      ⚠️ الرابط يجب أن يبدأ بـ https://
                    </p>
                  )}
                </div>
              </div>
              {extractedVars.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">اختبار المتغيرات</Label>
                  <div className="flex flex-wrap gap-2">
                    {extractedVars.map((v) => {
                      const key = v.replace(/\D/g, "");
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[color:var(--color-muted-foreground)]">{v}</span>
                          <Input
                            value={varValues[key] || ""}
                            onChange={(e) => setVarValues((p) => ({ ...p, [key]: e.target.value }))}
                            placeholder={`قيمة ${key}`}
                            className="h-8 w-28 text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-muted)] p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">معاينة حية</p>
                <div className="wa-bubble rounded-2xl bg-[#d9fdd3] px-4 py-3 shadow-sm dark:bg-[var(--whatsapp-message-outgoing)]">
                  <p className="whitespace-pre-wrap text-[0.95rem] leading-7 text-[color:var(--color-foreground)]">{previewText || "(لا يوجد محتوى)"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-200">التحقق من التوافق مع سياسات Meta</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowCompliance(!showCompliance)}
                  >
                    {showCompliance ? "إخفاء" : "تشغيل الفحص"}
                  </Button>
                </div>
                {showCompliance && (
                  <div className="mt-2 space-y-1">
                    {complianceResults.length === 0 ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">✅ لا توجد مشاكل توافق — القالب جاهز للإرسال</p>
                    ) : (
                      complianceResults.map(r => (
                        <p key={r.id} className={`text-[11px] ${r.severity === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {r.severity === "error" ? "❌" : "⚠️"} {r.message}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {createStep > 1 && (
              <Button variant="outline" onClick={() => setCreateStep((createStep - 1) as 1 | 2 | 3)} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">
                السابق
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateStep(1); setShowCompliance(false); setComplianceResults([]); }} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">إلغاء</Button>
            {createStep < 3 ? (
              <Button onClick={() => setCreateStep((createStep + 1) as 1 | 2 | 3)} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md">
                التالي
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={sending} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md">
                {sending ? "جاري الإنشاء..." : "إنشاء القالب"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTemplate} onOpenChange={(o) => !o && setViewTemplate(null)}>
        <DialogContent className="sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>
              تفاصيل قالب Meta API
            </DialogDescription>
          </DialogHeader>
          {viewTemplate && (() => {
            const StatusIcon = statusIcon[viewTemplate.status] || AlertTriangle;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">الحالة</p>
                    <Badge variant="outline" className={statusBadge[viewTemplate.status] || ""}>
                      <StatusIcon className="ml-1 size-3.5 inline" />
                      {viewTemplate.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">التصنيف</p>
                    <p className="font-medium">{viewTemplate.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">القسم</p>
                    {(() => {
                      const sec = resolveTemplateSection(viewTemplate.name, viewTemplate.category);
                      return (
                        <Badge variant="outline" className={sec.badge} title={sec.description}>
                          {sec.icon} {sec.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">اللغة</p>
                    <p className="font-medium">{viewTemplate.language}</p>
                  </div>
                </div>
                {viewTemplate.rejected_reason && (
                  <div>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">سبب الرفض</p>
                    <p className="font-medium text-red-500">{viewTemplate.rejected_reason}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">معاينة القالب</p>
                  {viewTemplate.components?.map((c, i) => {
                    if (c.type === "HEADER") {
                      return (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">
                            {(c.format || "TEXT") === "TEXT" ? "رأس الرسالة" : `رأس (${c.format})`}
                          </p>
                          <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-sm font-medium">{c.text || "(بدون نص)"}</p>
                        </div>
                      );
                    }
                    if (c.type === "BODY") {
                      return (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">محتوى الرسالة</p>
                          <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-sm whitespace-pre-wrap">{c.text || "(بدون نص)"}</p>
                        </div>
                      );
                    }
                    if (c.type === "FOOTER") {
                      return (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">تذييل</p>
                          <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-xs text-[color:var(--color-muted-foreground)]">{c.text || "(بدون نص)"}</p>
                        </div>
                      );
                    }
                    if (c.type === "BUTTONS") {
                      return (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">أزرار</p>
                          <div className="flex flex-wrap gap-2">
                            {c.buttons?.map((b, bi) => (
                              <span key={bi} className="rounded-full border border-[color:var(--shell-control-border)] bg-[var(--shell-overlay-bg)] px-3 py-1 text-xs">
                                {b.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  {(!viewTemplate.components || viewTemplate.components.length === 0) && (
                    <p className="py-4 text-center text-sm text-[color:var(--color-muted-foreground)]">لا توجد تفاصيل للمكونات</p>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplate(null)} className="rounded-full">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditForm(null); } }}>
        <DialogContent className="max-w-xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>تعديل القالب</DialogTitle>
            <DialogDescription>
              تعديل قالب "{editForm?.name}". بعد التعديل، يمر القالب بمراجعة جديدة من ميتا.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm((p) => p ? { ...p, category: v ?? '' } : null)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اللغة</Label>
                <Select value={editForm.language} onValueChange={(v) => setEditForm((p) => p ? { ...p, language: v ?? '' } : null)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>رأس الرسالة (اختياري)</Label>
                <div className="flex gap-2">
                  <Select value={editForm.headerFormat} onValueChange={(v) => setEditForm((p) => p ? { ...p, headerFormat: v ?? '' } : null)}>
                    <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">TEXT</SelectItem>
                      <SelectItem value="IMAGE">IMAGE</SelectItem>
                      <SelectItem value="VIDEO">VIDEO</SelectItem>
                      <SelectItem value="DOCUMENT">DOCUMENT</SelectItem>
                    </SelectContent>
                  </Select>
                  {editForm.headerFormat === "TEXT" ? (
                    <Input value={editForm.headerText} onChange={(e) => setEditForm((p) => p ? { ...p, headerText: e.target.value } : null)}
                      placeholder="نص الرأس" className="h-11 flex-1" />
                  ) : (
                    <HeaderMediaUploadField
                      handle={editForm.headerMediaHandle}
                      fileName={editForm.headerMediaName}
                      format={editForm.headerFormat}
                      uploading={uploadingHeader}
                      onUpload={(file) => uploadHeaderMedia(file, (handle, name) =>
                        setEditForm((p) => p ? { ...p, headerMediaHandle: handle, headerMediaName: name } : null))}
                      onRemove={() => setEditForm((p) => p ? { ...p, headerMediaHandle: "", headerMediaName: "" } : null)}
                    />
                  )}
                </div>
                {editForm.headerFormat !== "TEXT" && !editForm.headerMediaHandle && (
                  <p className="text-[11px] text-amber-500 dark:text-amber-400">
                    ⚠️ ارفع وسيطاً للهيدر — ميتا تتطلب sample media
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>محتوى الرسالة *</Label>
                <Textarea value={editForm.bodyText} onChange={(e) => setEditForm((p) => p ? { ...p, bodyText: e.target.value } : null)}
                  className="min-h-[120px]" />
              </div>
              <div className="space-y-2">
                <Label>تذييل الرسالة (اختياري)</Label>
                <Input value={editForm.footerText} onChange={(e) => setEditForm((p) => p ? { ...p, footerText: e.target.value } : null)}
                  placeholder="شكراً" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نص الزر (اختياري)</Label>
                  <Input value={editForm.buttonText} onChange={(e) => setEditForm((p) => p ? { ...p, buttonText: e.target.value } : null)}
                    placeholder="تتبع الطلب" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>رابط الزر (اختياري)</Label>
                  <Input value={editForm.buttonUrl} onChange={(e) => setEditForm((p) => p ? { ...p, buttonUrl: e.target.value } : null)}
                    placeholder="https://example.com" className="h-11" dir="ltr" />
                </div>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200">التحقق من التوافق مع سياسات Meta</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEditShowCompliance(!editShowCompliance)}
              >
                {editShowCompliance ? "إخفاء" : "تشغيل الفحص"}
              </Button>
            </div>
            {editShowCompliance && (
              <div className="mt-2 space-y-1">
                {editComplianceResults.length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">✅ لا توجد مشاكل توافق — القالب جاهز للإرسال</p>
                ) : (
                  editComplianceResults.map(r => (
                    <p key={r.id} className={`text-[11px] ${r.severity === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {r.severity === "error" ? "❌" : "⚠️"} {r.message}
                    </p>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditForm(null); setEditComplianceResults([]); setEditShowCompliance(false); }} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">إلغاء</Button>
            <Button onClick={handleEdit} disabled={editSending} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md">
              {editSending ? "جاري التحديث..." : "تحديث القالب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">
                <Trash2 className="size-5 text-red-500" />
              </div>
              <div>
                <DialogTitle>حذف القالب</DialogTitle>
                <DialogDescription>
                  هل أنت متأكد من حذف القالب <strong>{deleteConfirm}</strong>؟
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            سيتم حذف جميع ترجمات هذا القالب. هذا الإجراء لا يمكن التراجع عنه.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl sm:rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-sm">
                <Library className="size-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">قوالب جاهزة</DialogTitle>
                <DialogDescription>
                  اختر قالباً لبدء الإنشاء. يتم تعبئة الحقول تلقائياً — يمكنك تعديلها قبل الإرسال.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
            <Input
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="ابحث بالاسم، الوصف، التصنيف..."
              className="h-11 px-9 rounded-2xl border-[color:var(--shell-control-border)] bg-[var(--color-muted)] transition-all duration-200 focus:scale-[1.01]"
            />
            {librarySearch && (
              <button
                onClick={() => setLibrarySearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted-foreground)] transition-all duration-200 hover:scale-110 hover:text-[color:var(--color-foreground)]"
                aria-label="مسح البحث"
              >
                <XCircle className="size-4" />
              </button>
            )}
          </div>
          <div className="mt-4 max-h-[420px] space-y-6 overflow-y-auto">
            {filteredLibrary.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="size-10 text-[color:var(--color-muted-foreground)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">لا توجد نتائج للبحث</p>
                <button onClick={() => setLibrarySearch("")} className="text-xs text-[var(--shell-ring)] underline-offset-2 hover:underline">مسح البحث</button>
              </div>
            ) : (
              Object.entries(libraryByCategory).map(([category, templates]) => {
                const style = CATEGORY_STYLE[category]!;
                return (
                  <section key={category}>
                    <div className={`sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-2xl p-2.5 ${style.sectionBg} backdrop-blur-sm`}>
                      <span className="flex size-8 items-center justify-center rounded-xl bg-white text-base shadow-sm dark:bg-[var(--shell-overlay-bg)]">
                        {style.icon}
                      </span>
                      <span className={`bg-gradient-to-r ${style.gradient} bg-clip-text text-sm font-bold text-transparent`}>
                        {category === "AUTHENTICATION" ? "المصادقة" : category === "MARKETING" ? "تسويق" : "خدمات"}
                      </span>
                      <span className="mr-auto text-[11px] text-[color:var(--color-muted-foreground)]">{templates.length} قالب</span>
                    </div>
                    <div className="space-y-2">
                      {templates.map((libTpl, idx) => (
                        <button
                          key={libTpl.id}
                          onClick={() => applyLibraryTemplate(libTpl)}
                          style={{ animationDelay: `${idx * 50}ms` }}
                          className="group w-full rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] p-4 text-right transition-all duration-200 hover:scale-[1.01] hover:border-[color:var(--shell-ring)] hover:shadow-md hover:bg-[var(--shell-overlay-bg)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{libTpl.name}</span>
                                <Badge variant="outline" className={`text-[10px] ${style.badge}`}>{style.icon} {libTpl.category}</Badge>
                              </div>
                              <p className="mt-1.5 text-xs leading-5 text-[color:var(--color-muted-foreground)]">{libTpl.description}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <div className="flex -space-x-1">
                                  {libTpl.languages.slice(0, 4).map(l => (
                                    <span key={l.code} className="flex size-5 items-center justify-center rounded-full border-2 border-[var(--color-muted)] bg-[var(--shell-overlay-bg)] text-[9px] font-medium uppercase text-[color:var(--color-muted-foreground)] shadow-sm">
                                      {l.code}
                                    </span>
                                  ))}
                                  {libTpl.languages.length > 4 && (
                                    <span className="flex size-5 items-center justify-center rounded-full border-2 border-[var(--color-muted)] bg-[var(--color-muted)] text-[9px] text-[color:var(--color-muted-foreground)]">
                                      +{libTpl.languages.length - 4}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                                  {libTpl.languages.length} {libTpl.languages.length > 1 ? "لغات" : "لغة"}
                                </span>
                                <span className="mx-1 text-[10px] text-[color:var(--color-muted-foreground)]">·</span>
                                {libTpl.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="rounded-full bg-[var(--shell-overlay-bg)] px-2 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)]">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0 self-center rounded-xl border border-[color:var(--shell-control-border)] bg-[var(--shell-overlay-bg)] p-2 transition-all duration-200 group-hover:scale-110 group-hover:border-[color:var(--shell-ring)]">
                              <Plus className="size-4 text-[color:var(--color-muted-foreground)] transition-colors group-hover:text-[var(--shell-ring)]" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLibraryOpen(false); setLibrarySearch(""); }} className="rounded-full transition-all duration-200 hover:scale-[1.02]">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>سجل التعديلات</DialogTitle>
            <DialogDescription>
              آخر 100 عملية إنشاء وتعديل وحذف للقوالب — مخزنة محلياً في المتصفح
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] space-y-1 overflow-y-auto">
            {templateHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <History className="size-6 text-[color:var(--color-muted-foreground)]" />
                </div>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">لا يوجد سجل بعد</p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">أنشئ أو عدّل قالباً ليظهر هنا.</p>
              </div>
            ) : (
              templateHistory.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.01] hover:bg-[var(--color-muted)]" style={{ animationDelay: `${i * 30}ms` }}>
                  {entry.action === "created" && <CheckCircle className="size-4 text-emerald-500" />}
                  {entry.action === "edited" && <Pencil className="size-4 text-amber-500" />}
                  {entry.action === "deleted" && <Trash2 className="size-4 text-red-500" />}
                  <span className="font-medium">{entry.name}</span>
                  {entry.language && <Badge variant="secondary" className="text-[10px]">{entry.language}</Badge>}
                  {entry.category && <span className="text-[10px] text-[color:var(--color-muted-foreground)]">{entry.category}</span>}
                  <span className="mr-auto text-[10px] text-[color:var(--color-muted-foreground)]">
                    {new Date(entry.timestamp).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { localStorage.removeItem(HISTORY_KEY); setTemplateHistory([]); }} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">
              مسح السجل
            </Button>
            <Button variant="outline" onClick={() => setHistoryOpen(false)} className="rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
    </TooltipProvider>
  );
};

/**
 * حقل رفع وسيط رأس القالب (IMAGE/VIDEO/DOCUMENT):
 * يرفع الملف عبر /whatsapp-templates/templates/upload-media ويعرض الـ handle الناتج
 * مع إمكانية الإزالة. الـ handle يُستخدم لاحقاً في example.header_handle (الإنشاء)
 * أو كـ header parameter (الإرسال).
 */
function HeaderMediaUploadField({
  handle,
  fileName,
  format,
  uploading,
  onUpload,
  onRemove,
}: {
  handle: string;
  fileName: string;
  format: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaLabel = format === "VIDEO" ? "فيديو" : format === "DOCUMENT" ? "مستند" : "صورة";

  return (
    <div className="flex h-11 flex-1 items-center gap-2">
      {handle ? (
        <div className="flex h-full flex-1 items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] px-3">
          <FileText className="ml-1 size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
          <span className="flex-1 truncate text-sm text-[color:var(--color-muted-foreground)]" dir="ltr">
            {fileName || handle}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={onRemove}
            title="إزالة الوسيط"
          >
            <Trash2 className="size-4 text-red-500 dark:text-red-400" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <RefreshCw className="ml-2 size-4 animate-spin" />
              جاري الرفع إلى ميتا...
            </>
          ) : (
            <>اختر {mediaLabel} للرأس</>
          )}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={format === "VIDEO" ? "video/*" : format === "DOCUMENT" ? "application/pdf" : "image/*"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default WhatsAppMetaTemplates;

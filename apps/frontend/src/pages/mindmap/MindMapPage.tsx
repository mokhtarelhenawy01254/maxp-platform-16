import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  GitBranch,
  Play,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Scan,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Tag,
  MessageSquare,
  Bot,
  ShoppingCart,
  GripVertical,
  Boxes,
  ArrowDownCircle,
  Trash2,
  Video,
  MousePointerClick,
  PlayCircle,
  X,
  FileText,
  Calculator,
  TrendingUp,
  DollarSign,
  PackageOpen,
  RotateCcw,
  ExternalLink,
  Layers,
  BarChart3,
  Flame,
  Zap,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Map as MapIcon,
  ListTree,
  Eye,
  Maximize2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import { handleInsufficientWalletBalance } from "../../utils/marketplaceWalletHelper";

export interface MapNode {
  id: string;
  parentId?: string;
  stepOrder: number;
  title: string;
  subtitle: string;
  category: "calc" | "creative" | "store" | "ads" | "chat" | "ops" | "finance" | "growth" | "training";
  badge: string;
  x: number;
  y: number;
  color: string;
  iconName: string;
  hasVideo?: boolean;
  liveRoute?: string;
  requiredAppSlug?: string;
  liveMetric?: { label: string; value: string; color: string };
}

export interface WorkflowStage {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  accentBorder: string;
  bgGradient: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// مسارات وحاويات المراحل الخمس الشاملة (Workflow Stage Swimlanes)
export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "stage-plan",
    title: "1. الجدوى والتخطيط وتأهيل الفريق",
    subtitle: "حساب نقطة التعادل، الـ CPA الأقصى، ودليل الـ SOP التدريبي",
    badge: "المرحلة الأولى",
    color: "text-blue-400",
    accentBorder: "border-blue-500/25",
    bgGradient: "from-blue-950/20 via-slate-900/40 to-slate-950/60",
    x: 140,
    y: -100,
    width: 400,
    height: 420
  },
  {
    id: "stage-creative-store",
    title: "2. صناعة المحتوى والمتجر السريع",
    subtitle: "استوديو الصور بالـ AI وصفحة هبوط المنتج وعروض الخصم",
    badge: "المرحلة الثانية",
    color: "text-violet-400",
    accentBorder: "border-violet-500/25",
    bgGradient: "from-violet-950/20 via-slate-900/40 to-slate-950/60",
    x: 580,
    y: 40,
    width: 820,
    height: 280
  },
  {
    id: "stage-ads-chat",
    title: "3. إطلاق الإعلانات والمحادثات",
    subtitle: "إعلانات ميتا وتيك توك، صندوق الرسائل الموحد، وردود واتساب",
    badge: "المرحلة الثالثة",
    color: "text-indigo-400",
    accentBorder: "border-indigo-500/25",
    bgGradient: "from-indigo-950/20 via-slate-900/40 to-slate-950/60",
    x: 1420,
    y: 40,
    width: 380,
    height: 520
  },
  {
    id: "stage-ops-warehouse",
    title: "4. التأكيد والتجهيز واللوجستيات",
    subtitle: "تأكيد الطلبات، طباعة البوالص في المخزن، ومتابعة أسباب المرتجعات",
    badge: "المرحلة الرابعة",
    color: "text-amber-400",
    accentBorder: "border-amber-500/25",
    bgGradient: "from-amber-950/20 via-slate-900/40 to-slate-950/60",
    x: 140,
    y: 330,
    width: 1240,
    height: 230
  },
  {
    id: "stage-finance-growth",
    title: "5. التحصيل المالي والأرباح والنمو",
    subtitle: "تحصيل كاش COD، قائمة الدخل P&L، وحساب الـ CLV للعميل",
    badge: "المرحلة الخامسة",
    color: "text-emerald-400",
    accentBorder: "border-emerald-500/25",
    bgGradient: "from-emerald-950/20 via-slate-900/40 to-slate-950/60",
    x: 140,
    y: 570,
    width: 1240,
    height: 230
  }
];

// القالب الشامل: دورة التجارة الإلكترونية الكاملة (ديناميكي لاسم الشركة وتوافق التطبيقات)
export const createMasterBlueprint = (companyName?: string): MapNode[] => [
  {
    id: "m-step-1",
    stepOrder: 1,
    title: "1. حاسبة المشاريع وتحديد الميزانية",
    subtitle: "حساب نقطة التعادل، الـ CPA الأقصى، وتوزيع ميزانية الإعلانات",
    category: "calc",
    badge: "تخطيط مالي 🧮",
    x: 200,
    y: 180,
    color: "border-blue-500/80 text-blue-300 bg-blue-950/40",
    iconName: "calculator",
    liveRoute: "/break-even",
    requiredAppSlug: "break-even",
    liveMetric: { label: "CPA المستهدف", value: "85 ج", color: "text-blue-400" }
  },
  {
    id: "m-step-2",
    parentId: "m-step-1",
    stepOrder: 2,
    title: "2. استوديو المحتوى والذكاء الاصطناعي",
    subtitle: "تجهيز الصور، صياغة 3 نصوص إعلانية وزوايا بيع (Hooks)",
    category: "creative",
    badge: "صناعة محتوى 🎨",
    x: 620,
    y: 120,
    color: "border-violet-500/80 text-violet-300 bg-violet-950/40",
    iconName: "sparkles",
    liveRoute: "/admin/ai-hub",
    requiredAppSlug: "ai-hub"
  },
  {
    id: "m-step-3",
    parentId: "m-step-2",
    stepOrder: 3,
    title: `3. صفحة هبوط المنتج ${companyName ? `ومتجر ${companyName}` : "والمتجر الإلكتروني"}`,
    subtitle: "تصميم PDP سريع، باقات عروض الخصم (اشترِ 2 واحصل على شحن مجاني)",
    category: "store",
    badge: "المتجر والمنتجات 🛍️",
    x: 1040,
    y: 120,
    color: "border-teal-500/80 text-teal-300 bg-teal-950/40",
    iconName: "shopping-bag",
    liveRoute: "/products",
    requiredAppSlug: "store",
    liveMetric: { label: "معدل التحويل المتوقع", value: "3.8%", color: "text-teal-400" }
  },
  {
    id: "m-step-4",
    parentId: "m-step-3",
    stepOrder: 4,
    title: "4. إطلاق إعلانات فيسبوك وتيك توك",
    subtitle: "ربط Pixel و CAPI، إطلاق حملات التحويل وإعادة الاستهداف",
    category: "ads",
    badge: "حملات ممولة 📢",
    x: 1460,
    y: 120,
    color: "border-indigo-500/80 text-indigo-300 bg-indigo-950/40",
    iconName: "flame",
    liveRoute: "/advertising",
    requiredAppSlug: "advertising",
    liveMetric: { label: "ROAS الحالي", value: "4.2x", color: "text-emerald-400" }
  },
  {
    id: "m-step-5",
    parentId: "m-step-4",
    stepOrder: 5,
    title: "5. صندوق المحادثات الموحد (Unified Inbox)",
    subtitle: "استقبال رسائل واتساب، ماسنجر، وإنستجرام في شاشة واحدة",
    category: "chat",
    badge: "تواصل موحد 💬",
    x: 1460,
    y: 380,
    color: "border-emerald-500/80 text-emerald-300 bg-emerald-950/40",
    iconName: "message-square",
    liveRoute: "/unified-inbox",
    requiredAppSlug: "unified-inbox"
  },
  {
    id: "m-step-6",
    parentId: "m-step-5",
    stepOrder: 6,
    title: "6. تأكيد الطلبات وتتبع الإلغاءات",
    subtitle: "بوت تأكيد واتساب تلقائي + مراقبة نسبة التأكيد والإلغاء لحظياً",
    category: "ops",
    badge: "تأكيد الطلبات ⚡",
    x: 1040,
    y: 380,
    color: "border-amber-500/80 text-amber-300 bg-amber-950/40",
    iconName: "check-square",
    liveRoute: "/orders",
    requiredAppSlug: "whatsapp-business",
    liveMetric: { label: "نسبة التأكيد", value: "86%", color: "text-emerald-400" }
  },
  {
    id: "m-step-7",
    parentId: "m-step-6",
    stepOrder: 7,
    title: "7. تجهيز المستودع وتوزيع الشحنات",
    subtitle: "طباعة البوالص، جرد المخزون، وتسليم شركات الشحن (Turbo)",
    category: "ops",
    badge: "المخزن والشحن 📦",
    x: 620,
    y: 380,
    color: "border-cyan-500/80 text-cyan-300 bg-cyan-950/40",
    iconName: "package-open",
    liveRoute: "/inventory",
    requiredAppSlug: "inventory"
  },
  {
    id: "m-step-8",
    parentId: "m-step-7",
    stepOrder: 8,
    title: "8. تتبع المرتجعات وتحليل الأسباب",
    subtitle: "معرفة أسباب رجوع الشحنات: تأخر المندوب، رفض الاستلام، أو تلف",
    category: "ops",
    badge: "تحليل المرتجعات 🔄",
    x: 200,
    y: 380,
    color: "border-rose-500/80 text-rose-300 bg-rose-950/40",
    iconName: "rotate-ccw",
    liveRoute: "/analytics/orders",
    requiredAppSlug: "cancellation-analytics",
    liveMetric: { label: "نسبة المرتجع", value: "11%", color: "text-rose-400" }
  },
  {
    id: "m-step-9",
    parentId: "m-step-8",
    stepOrder: 9,
    title: "9. تحصيل أموال الشحن (COD Cash Flow)",
    subtitle: "تسوية مبالغ الدفع عند الاستلام من شركات الشحن ومراقبة السيولة",
    category: "finance",
    badge: "التحصيل والكاش 💵",
    x: 200,
    y: 620,
    color: "border-emerald-500/80 text-emerald-300 bg-emerald-950/40",
    iconName: "dollar-sign",
    liveRoute: "/analytics/orders",
    requiredAppSlug: "cod-management"
  },
  {
    id: "m-step-10",
    parentId: "m-step-9",
    stepOrder: 10,
    title: "10. الأرباح والخسائر الشهرية (P&L)",
    subtitle: "خصم تكلفة البضاعة، الإعلانات، الشحن، والمصاريف = صافي الربح",
    category: "finance",
    badge: "القوائم المالية 📊",
    x: 620,
    y: 620,
    color: "border-emerald-500/80 text-emerald-300 bg-emerald-950/40",
    iconName: "bar-chart-3",
    liveRoute: "/marketing/monthly-pnl",
    requiredAppSlug: "monthly-pnl",
    liveMetric: { label: "صافي الأرباح", value: "+54,200 ج", color: "text-emerald-400" }
  },
  {
    id: "m-step-11",
    parentId: "m-step-10",
    stepOrder: 11,
    title: "11. الجروث ماركتنج والسكيلينج (CLV)",
    subtitle: "حاسبة القيمة الدائمة للعميل، إعادة البيع، وزيادة الميزانيات الرابحة",
    category: "growth",
    badge: "جروث وسكيلينج 📈",
    x: 1040,
    y: 620,
    color: "border-purple-500/80 text-purple-300 bg-purple-950/40",
    iconName: "trending-up",
    liveRoute: "/marketing/clv-calculator",
    requiredAppSlug: "clv-calculator"
  },
  {
    id: "m-step-12",
    parentId: "m-step-1",
    stepOrder: 12,
    title: "12. فيديو تدريب وتأهيل الفريق (SOP)",
    subtitle: "دليل تدريبي مدمج بالفيديو لشرح خطوات الدورة للموظفين والشركاء",
    category: "training",
    badge: "شرح وتدريب 🎓",
    x: 200,
    y: -40,
    color: "border-rose-500/80 text-rose-300 bg-rose-950/40",
    iconName: "video",
    hasVideo: true,
    requiredAppSlug: "executable-mindmap"
  }
];

export default function MindMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const companyName = user?.company?.name || "";
  const companyId = user?.company?.id || user?.companyId || "default";

  // فحص قائمة التطبيقات المفعلة للشركة
  const companyActiveApps = useMemo(() => {
    const anyUser = user as any;
    const apps = Array.isArray(anyUser?.company?.activeApps)
      ? anyUser.company.activeApps
      : Array.isArray(anyUser?.activeApps)
        ? anyUser.activeApps
        : [];
    return apps.map((a: any) => String(a?.slug || a).toLowerCase().trim());
  }, [user]);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [installedLocally, setInstalledLocally] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  const isMindmapInstalled = useMemo(() => {
    if (isSuperAdmin || installedLocally) return true;
    return (
      companyActiveApps.includes("executable-mindmap") ||
      companyActiveApps.includes("mindmap")
    );
  }, [companyActiveApps, isSuperAdmin, installedLocally]);

  // تفعيل التطبيق بنقرة واحدة
  const handleInstallMindmap = async () => {
    setIsInstalling(true);
    try {
      await apiClient.post("/marketplace/apps/executable-mindmap/install", {
        pricingModel: "FREE"
      });
      setInstalledLocally(true);
      toast.success(`تم تفعيل تطبيق الخرائط الذهنية بنجاح لشركة ${companyName || ""}`);
      await refreshUser?.();
    } catch (err: any) {
      if (
        handleInsufficientWalletBalance(err, navigate, {
          returnUrl: location.pathname + location.search,
          appName: "الخرائط الذهنية التنفيذية",
          itemType: "app",
        })
      ) {
        return;
      }
      toast.error(err?.response?.data?.message || "تعذر تفعيل التطبيق، يرجى تفعيله من متجر التطبيقات");
    } finally {
      setIsInstalling(false);
    }
  };

  // فحص هل أداة معينة مفعلة في باقة الشركة
  const isToolInstalled = (requiredAppSlug?: string) => {
    if (!requiredAppSlug || isSuperAdmin) return true;
    const slugLower = requiredAppSlug.toLowerCase();
    return companyActiveApps.some(a => a === slugLower || a.includes(slugLower));
  };

  const [nodes, setNodes] = useState<MapNode[]>(() => {
    try {
      const saved = localStorage.getItem(`maxp_mindmap_${companyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return createMasterBlueprint(companyName);
  });
  const [mode, setMode] = useState<"plan" | "train" | "exec">("plan");
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 120 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [trainStepIndex, setTrainStepIndex] = useState<number>(1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [isDropHintVisible, setIsDropHintVisible] = useState<boolean>(false);
  const [draggedToolType, setDraggedToolType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "timeline">(() => {
    return typeof window !== "undefined" && window.innerWidth < 640 ? "timeline" : "canvas";
  });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isMinimapOpen, setIsMinimapOpen] = useState<boolean>(true);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    "stage-plan": true,
    "stage-creative-store": true,
    "stage-ads-chat": true,
    "stage-ops-warehouse": true,
    "stage-finance-growth": true
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const draggingNodeRef = useRef<MapNode | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode switching
  const switchMode = (newMode: "plan" | "train" | "exec") => {
    setMode(newMode);
    if (newMode === "train") {
      setTrainStepIndex(1);
      focusOnStep(1);
      toast.info("تم تفعيل وضع الشرح والتدريب (Presentation Mode)");
    } else if (newMode === "exec") {
      toast.info("تم تفعيل وضع الأتمتة والتنفيذ (n8n Engine)");
    } else {
      toast.info("تم تفعيل وضع التخطيط والعصف الذهني");
    }
  };

  // Focus camera on training step
  const focusOnStep = (stepNum: number) => {
    setTrainStepIndex(stepNum);
    const node = nodes.find((n) => n.stepOrder === stepNum);
    if (node && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const targetZoom = 1.05;
      setZoom(targetZoom);
      setPan({
        x: rect.width / 2 - node.x * targetZoom - 140,
        y: rect.height / 2 - node.y * targetZoom - 90
      });
    }
  };

  const nextTrainStep = () => {
    const maxSteps = Math.max(...nodes.map((n) => n.stepOrder || 1));
    if (trainStepIndex < maxSteps) {
      focusOnStep(trainStepIndex + 1);
    } else {
      toast.success("اكتملت جميع خطوات الشرح في هذا المسار التدريبي!");
    }
  };

  const prevTrainStep = () => {
    if (trainStepIndex > 1) {
      focusOnStep(trainStepIndex - 1);
    }
  };

  // Run execution simulation
  const runExecutionSimulation = () => {
    switchMode("exec");
    setIsExecuting(true);
    const activeCount = nodes.filter(n => isToolInstalled(n.requiredAppSlug)).length;
    const totalCount = nodes.length;
    toast.loading(`جاري تشغيل مسار العمل التنفيذي ومزامنة ${activeCount}/${totalCount} مرحلة نشطة مع أدوات MaxP...`, { id: "exec-toast" });

    setTimeout(() => {
      setIsExecuting(false);
      if (activeCount < totalCount && !isSuperAdmin) {
        toast.success(`اكتمل تشغيل المسار! تم تشغيل ${activeCount} أداة مفعّلة بنجاح. يرجى تفعيل باقي الأدوات (${totalCount - activeCount}) للاستفادة الكاملة من الأتمتة.`, { id: "exec-toast", duration: 5000 });
      } else {
        toast.success("اكتمل تشغيل المسار بنجاح! تم فحص المؤشرات، تحديث الحسابات، وإرسال الإشعارات لكافة المراحل.", { id: "exec-toast" });
      }
    }, 3000);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.35));
  const handleResetZoom = () => {
    setZoom(0.85);
    setPan({ x: 80, y: 120 });
  };

  // Canvas Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".map-node") || (e.target as HTMLElement).closest("#node-actions-bar")) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNodeId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.2));
  };

  // Node Dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: MapNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    draggingNodeRef.current = node;
    dragOffsetRef.current = {
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y
    };

    const onGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingNodeRef.current) return;
      const newX = moveEvent.clientX / zoom - dragOffsetRef.current.x;
      const newY = moveEvent.clientY / zoom - dragOffsetRef.current.y;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeRef.current?.id ? { ...n, x: newX, y: newY } : n))
      );
    };

    const onGlobalMouseUp = () => {
      draggingNodeRef.current = null;
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
  };

  // Drag and Drop from Palette
  const handleToolDragStart = (e: React.DragEvent, toolType: string) => {
    setDraggedToolType(toolType);
    e.dataTransfer.setData("text/plain", toolType);
    e.dataTransfer.effectAllowed = "copy";
    setIsDropHintVisible(true);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDropHintVisible(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDropHintVisible(false);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropHintVisible(false);
    const toolType = e.dataTransfer.getData("text/plain") || draggedToolType;
    if (!toolType || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const dropX = (e.clientX - rect.left - pan.x) / zoom;
    const dropY = (e.clientY - rect.top - pan.y) / zoom;

    addNodeFromPalette(toolType, dropX - 130, dropY - 45);
    setDraggedToolType(null);
  };

  // Add node from Palette
  const addNodeFromPalette = (type: string, customX?: number, customY?: number) => {
    const selected = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
    const newId = "node-" + Date.now();
    const newOrder = nodes.length + 1;

    let newNode: MapNode = {
      id: newId,
      parentId: customX !== undefined ? undefined : (selected ? selected.id : undefined),
      stepOrder: newOrder,
      x: customX !== undefined ? customX : (selected ? selected.x + 380 : 300),
      y: customY !== undefined ? customY : (selected ? selected.y + 40 : 300),
      title: "أداة جديدة",
      subtitle: "إعدادات الأداة في النظام",
      badge: "أداة مضافة",
      color: "border-slate-600 text-slate-300 bg-slate-900",
      iconName: "tool",
      category: "ops"
    };

    // تعيين خصائص كل أداة من الأدوات الـ 17 الحقيقية في MaxP
    if (type === "calc_break_even") {
      newNode.title = "حاسبة المشاريع — نقطة التعادل";
      newNode.subtitle = "حساب التكاليف الثابتة، المتغيرة، وهامش الأمان";
      newNode.badge = "نقطة التعادل 🧮";
      newNode.color = "border-blue-500 text-blue-300 bg-blue-950/40";
      newNode.iconName = "calculator";
      newNode.liveRoute = "/break-even";
      newNode.category = "calc";
    } else if (type === "calc_budget") {
      newNode.title = "مخطط الميزانية الإعلانية";
      newNode.subtitle = "توزيع الميزانيات وتوقع المبيعات وتكلفة الاقتناء";
      newNode.badge = "ميزانية إعلانات 💰";
      newNode.color = "border-blue-500 text-blue-300 bg-blue-950/40";
      newNode.iconName = "dollar-sign";
      newNode.liveRoute = "/marketing/ad-budget-planner";
      newNode.category = "calc";
    } else if (type === "creative_ai") {
      newNode.title = "استوديو الصور والمحتوى (AI Hub)";
      newNode.subtitle = "توليد تصاميم المنتجات وصياغة نصوص إعلانية بالذكاء الاصطناعي";
      newNode.badge = "صناعة محتوى 🎨";
      newNode.color = "border-violet-500 text-violet-300 bg-violet-950/40";
      newNode.iconName = "sparkles";
      newNode.liveRoute = "/admin/ai-hub";
      newNode.category = "creative";
    } else if (type === "store_pdp") {
      newNode.title = "صفحة المنتج (Storefront PDP)";
      newNode.subtitle = "صفحة هبوط سريعة وباقات عروض الخصم التلقائي";
      newNode.badge = "صفحة منتج 🛍️";
      newNode.color = "border-teal-500 text-teal-300 bg-teal-950/40";
      newNode.iconName = "shopping-bag";
      newNode.liveRoute = "/products";
      newNode.category = "store";
    } else if (type === "ads_meta") {
      newNode.title = "إعلانات فيسبوك وانستجرام";
      newNode.subtitle = "إدارة الحملات والـ Pixel وتتبع الأحداث الرسمية";
      newNode.badge = "إعلانات ميتا 📢";
      newNode.color = "border-indigo-500 text-indigo-300 bg-indigo-950/40";
      newNode.iconName = "flame";
      newNode.liveRoute = "/advertising";
      newNode.category = "ads";
    } else if (type === "chat_unified") {
      newNode.title = "صندوق المحادثات الموحد (Unified Inbox)";
      newNode.subtitle = "إدارة واتساب وماسنجر وإنستجرام في شاشة واحدة";
      newNode.badge = "صندوق موحد 💬";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.iconName = "message-square";
      newNode.liveRoute = "/unified-inbox";
      newNode.category = "chat";
    } else if (type === "chat_whatsapp") {
      newNode.title = "بوت واتساب الرسمي (WhatsApp Cloud API)";
      newNode.subtitle = "رد آلي، إرسال فواتير، واسترجاع السلات المتروكة";
      newNode.badge = "واتساب آلي 💬";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.iconName = "message-square";
      newNode.liveRoute = "/whatsapp";
      newNode.category = "chat";
    } else if (type === "ops_confirmation") {
      newNode.title = "تأكيد الطلبات وتتبع الإلغاءات";
      newNode.subtitle = "متابعة نسبة تأكيد الطلبات وأسباب الإلغاء الشائعة";
      newNode.badge = "تأكيد وإلغاء ⚡";
      newNode.color = "border-amber-500 text-amber-300 bg-amber-950/40";
      newNode.iconName = "check-square";
      newNode.liveRoute = "/orders";
      newNode.liveMetric = { label: "نسبة التأكيد", value: "85%", color: "text-emerald-400" };
      newNode.category = "ops";
    } else if (type === "ops_warehouse") {
      newNode.title = "المستودع وتجهيز الشحنات";
      newNode.subtitle = "تتبع المخزون اللحظي وتجهيز طلبات الشحن السريع";
      newNode.badge = "المخزن والشحن 📦";
      newNode.color = "border-cyan-500 text-cyan-300 bg-cyan-950/40";
      newNode.iconName = "package-open";
      newNode.liveRoute = "/inventory";
      newNode.category = "ops";
    } else if (type === "ops_returns") {
      newNode.title = "تحليل المرتجعات وأسبابها";
      newNode.subtitle = "تقارير تفصيلية عن المرتجعات: أسباب الرفض وسرعة المندوب";
      newNode.badge = "تحليل المرتجعات 🔄";
      newNode.color = "border-rose-500 text-rose-300 bg-rose-950/40";
      newNode.iconName = "rotate-ccw";
      newNode.liveRoute = "/analytics/orders";
      newNode.liveMetric = { label: "نسبة المرتجع", value: "12%", color: "text-rose-400" };
      newNode.category = "ops";
    } else if (type === "finance_cod") {
      newNode.title = "أداء تحصيل الدفع عند الاستلام (COD)";
      newNode.subtitle = "متابعة مستحقات شركات الشحن ودورة تدفق الكاش اليومي";
      newNode.badge = "تحصيل COD 💵";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.iconName = "dollar-sign";
      newNode.liveRoute = "/analytics/orders";
      newNode.category = "finance";
    } else if (type === "finance_pnl") {
      newNode.title = "القوائم المالية والأرباح الشهرية (P&L)";
      newNode.subtitle = "صافي الربح، الهامش الإجمالي، وتحليل كافة المصاريف التشغيلية";
      newNode.badge = "الأرباح P&L 📊";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.iconName = "bar-chart-3";
      newNode.liveRoute = "/marketing/monthly-pnl";
      newNode.liveMetric = { label: "صافي الأرباح", value: "مباشر من المتجر", color: "text-emerald-400" };
      newNode.category = "finance";
    } else if (type === "growth_clv") {
      newNode.title = "القيمة الدائمة للعميل (CLV / LTV)";
      newNode.subtitle = "حساب معدل تكرار الشراء واستراتيجيات عروض الـ Upsell";
      newNode.badge = "جروث وسكيلينج 📈";
      newNode.color = "border-purple-500 text-purple-300 bg-purple-950/40";
      newNode.iconName = "trending-up";
      newNode.liveRoute = "/marketing/clv-calculator";
      newNode.category = "growth";
    } else if (type === "growth_conversion") {
      newNode.title = "تحليلات مسار التحويل (Conversion Funnel)";
      newNode.subtitle = "تتبع معدل التحويل في كل خطوة من الإعلان للسلة للشراء";
      newNode.badge = "مسار التحويل 🎯";
      newNode.color = "border-purple-500 text-purple-300 bg-purple-950/40";
      newNode.iconName = "trending-up";
      newNode.liveRoute = "/analytics/orders";
      newNode.category = "growth";
    } else if (type === "training_video") {
      newNode.title = "فيديو شرح وإرشادات الفريق (SOP)";
      newNode.subtitle = "تضمين دروس فيديو تدريبية للمتدربين مع خطوات التطبيق";
      newNode.badge = "شرح وتدريب 🎓";
      newNode.color = "border-rose-500 text-rose-300 bg-rose-950/40";
      newNode.iconName = "video";
      newNode.hasVideo = true;
      newNode.category = "training";
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
    toast.success(`تمت إضافة أداة: ${newNode.title}`);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || selectedNodeId === "m-step-1") {
      toast.error("لا يمكن حذف العقدة الرئيسية");
      return;
    }
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId && n.parentId !== selectedNodeId));
    setSelectedNodeId(null);
    toast.success("تم حذف العقدة وفروعها");
  };

  const aiExpandNode = () => {
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    toast.loading(`يقوم وكيل MaxP الذكي بتحليل: "${node.title}" وتوليد فروع تشغيلية...`, { id: "ai-expand" });

    setTimeout(() => {
      const newId = "ai-" + Date.now();
      const newNode: MapNode = {
        id: newId,
        parentId: node.id,
        stepOrder: nodes.length + 1,
        title: "فرع تشغيلي مقترح بالذكاء الاصطناعي",
        subtitle: "تحسين تكلفة الشحن ومضاعفة باقات الـ Cross-sell",
        badge: "اقتراح ذكي ✨",
        color: "border-violet-500 text-violet-300 bg-violet-950/40",
        iconName: "sparkles",
        category: "growth",
        x: node.x + 380,
        y: node.y - 50
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newId);
      toast.success("تم توليد الفرع الذكي بنجاح!", { id: "ai-expand" });
    }, 1200);
  };

  const handleOpenLiveTool = (route?: string) => {
    if (!route) return;
    navigate(route);
  };

  // إعادة تحميل قالب دورة التجارة الإلكترونية الشاملة
  const handleReloadMasterBlueprint = () => {
    setNodes(createMasterBlueprint(companyName));
    handleResetZoom();
    toast.success("تم تحميل وتحديث قالب دورة التجارة الإلكترونية الشاملة بنجاح!");
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden relative" dir="rtl">
      {/* 2026 Floating Command Island */}
      <header className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-6xl pointer-events-auto">
        <div className="backdrop-blur-2xl bg-slate-900/85 border border-slate-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-2xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-white tracking-wide">الخرائط الذهنية ومسارات العمل</h1>
                {isMindmapInstalled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full shadow-sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>مفعّل لـ {companyName || "الشركة"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full shadow-sm">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>معاينة (غير مفعّل)</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">دورة التجارة المتكاملة (12 مرحلة تنفيذية • 17 أداة حية)</p>
            </div>
          </div>

          {/* Center: Mode Switcher (Pill Style) */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 p-1 rounded-xl backdrop-blur">
            <button
              onClick={() => switchMode("plan")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === "plan" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]" : "text-slate-400 hover:text-white"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>تخطيط</span>
            </button>
            <button
              onClick={() => switchMode("train")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === "train" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02]" : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>تدريب وشرح</span>
            </button>
            <button
              onClick={() => switchMode("exec")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === "exec" ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-[1.02]" : "text-slate-400 hover:text-white"
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>أتمتة وتنفيذ</span>
            </button>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Canvas vs Timeline */}
            <button
              onClick={() => setViewMode(viewMode === "canvas" ? "timeline" : "canvas")}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
              title={viewMode === "canvas" ? "التبديل إلى عرض المسار الزمني (مناسب للموبايل)" : "التبديل إلى الكانفاس التفاعلي"}
            >
              {viewMode === "canvas" ? (
                <>
                  <ListTree className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">مسار زمني</span>
                </>
              ) : (
                <>
                  <MapIcon className="w-3.5 h-3.5 text-violet-400" />
                  <span className="hidden sm:inline">كانفاس</span>
                </>
              )}
            </button>

            {/* Blueprint Template Button */}
            <button
              onClick={handleReloadMasterBlueprint}
              title="تحميل دورة التجارة الكاملة"
              className="hidden md:flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>قالب الدورة</span>
            </button>

            {/* Run Button with Glowing Pulse */}
            <button
              onClick={runExecutionSimulation}
              disabled={isExecuting}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Play className={`w-3.5 h-3.5 fill-slate-950 ${isExecuting ? "animate-spin" : ""}`} />
              <span>{isExecuting ? "جاري المحاكاة..." : "تشغيل المسار"}</span>
            </button>
          </div>
        </div>

        {/* Floating Unactivated Warning Pill */}
        {!isMindmapInstalled && (
          <div className="mt-2 backdrop-blur-2xl bg-amber-950/90 border border-amber-500/40 rounded-2xl px-4 py-2 flex items-center justify-between gap-4 text-xs shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>وضع المعاينة:</strong> تطبيق الخرائط غير مفعّل لشركة <strong>{companyName || "حسابك"}</strong>. فعّل مجاناً لتشغيل الأتمتة الكاملة.
              </span>
            </div>
            <button
              onClick={handleInstallMindmap}
              disabled={isInstalling}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black px-3 py-1 rounded-xl text-xs transition shadow shrink-0 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isInstalling ? "جاري التفعيل..." : "تفعيل مجاناً بنقرة واحدة"}</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Mode Rendering: Timeline View vs Canvas View */}
      {viewMode === "timeline" ? (
        <div className="flex-1 w-full overflow-y-auto pt-36 sm:pt-24 pb-20 px-3 sm:px-4 max-w-4xl mx-auto space-y-4" dir="rtl">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between backdrop-blur">
            <div>
              <h3 className="text-sm font-bold text-white">المسار الزمني التنفيذي لدورة التجارة</h3>
              <p className="text-xs text-slate-400 mt-0.5">عرض متوافق مع الموبايل بنسبة 100% يوضح كافة المراحل والعمليات</p>
            </div>
            <button
              onClick={() => setViewMode("canvas")}
              className="flex items-center gap-1 text-xs text-violet-400 bg-violet-950/50 border border-violet-500/40 px-3 py-1.5 rounded-xl font-bold transition hover:bg-violet-900/50"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>عرض الكانفاس</span>
            </button>
          </div>

          {WORKFLOW_STAGES.map((stage) => {
            const stageNodes = nodes.filter((n) => {
              if (stage.id === "stage-plan") return n.stepOrder === 1 || n.stepOrder === 12 || n.category === "calc" || n.category === "training";
              if (stage.id === "stage-creative-store") return n.stepOrder === 2 || n.stepOrder === 3 || n.category === "creative" || n.category === "store";
              if (stage.id === "stage-ads-chat") return n.stepOrder === 4 || n.stepOrder === 5 || n.category === "ads" || n.category === "chat";
              if (stage.id === "stage-ops-warehouse") return n.stepOrder === 6 || n.stepOrder === 7 || n.stepOrder === 8 || n.category === "ops";
              if (stage.id === "stage-finance-growth") return n.stepOrder === 9 || n.stepOrder === 10 || n.stepOrder === 11 || n.category === "finance" || n.category === "growth";
              return false;
            });

            const isExpanded = expandedStages[stage.id] ?? true;

            return (
              <div key={stage.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur overflow-hidden shadow-xl">
                <div
                  onClick={() => setExpandedStages((prev) => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                  className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition border-b border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl bg-slate-950 border ${stage.accentBorder} ${stage.color}`}>
                      {stage.badge}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{stage.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{stage.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold">{stageNodes.length} أدوات</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 sm:p-4 space-y-3">
                    {stageNodes.map((node) => {
                      const installed = isToolInstalled(node.requiredAppSlug);
                      return (
                        <div
                          key={node.id}
                          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {node.stepOrder}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{node.title}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${installed ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>
                                  {installed ? "مفعّل ✅" : "غير مفعّل 🔒"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1">{node.subtitle}</p>
                              {node.liveMetric && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  <span className="text-slate-400">{node.liveMetric.label}:</span>
                                  <span className={`font-bold ${node.liveMetric.color}`}>{node.liveMetric.value}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {node.liveRoute && (
                              installed ? (
                                <button
                                  onClick={() => handleOpenLiveTool(node.liveRoute)}
                                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition"
                                >
                                  <span>فتح الأداة</span>
                                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    navigate("/marketplace");
                                    toast.info(`الأداة بحاجة لتفعيل من المتجر لشركة ${companyName || ""}`);
                                  }}
                                  className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                >
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>تفعيل</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Main Canvas Area */
        <div
          ref={viewportRef}
          dir="ltr"
          className="relative flex-1 w-full h-full overflow-hidden bg-slate-950"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.22) 0%, rgba(2, 6, 23, 1) 100%), radial-gradient(#334155 1.5px, transparent 1.5px)",
            backgroundSize: "100% 100%, 32px 32px"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {/* Drop Hint Overlay */}
          {isDropHintVisible && (
            <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-violet-500/60 rounded-3xl bg-violet-950/20 z-30 flex items-center justify-center">
              <div className="bg-slate-900/90 border border-violet-500 px-5 py-2.5 rounded-2xl text-xs font-bold text-violet-300 flex items-center gap-2 shadow-2xl">
                <ArrowDownCircle className="w-5 h-5 text-violet-400 animate-bounce" />
                <span>أفلت أداة السيناريو هنا لتثبيتها وربطها بالمسار فوراً!</span>
              </div>
            </div>
          )}

          {/* Presentation Controller */}
          {mode === "train" && (
            <div className="absolute top-20 right-1/2 translate-x-1/2 z-30 bg-slate-900/95 border border-amber-500/50 p-2 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur animate-fade-in" dir="rtl">
              <div className="flex items-center gap-2 px-3 text-amber-400 font-bold text-xs border-l border-slate-800">
                <GraduationCap className="w-4 h-4" />
                <span>
                  خطوة الشرح: {trainStepIndex} من {Math.max(...nodes.map((n) => n.stepOrder || 1))}
                </span>
              </div>
              <button
                onClick={prevTrainStep}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={nextTrainStep}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                <span>الخطوة التالية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Infinite Transform Container */}
          <div
            className="absolute top-0 left-0 w-[5000px] h-[5000px] origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* 2026 Stage Swimlanes Background Containers */}
            <div className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none z-0">
              {WORKFLOW_STAGES.map((st) => (
                <div
                  key={st.id}
                  style={{
                    position: "absolute",
                    left: `${st.x}px`,
                    top: `${st.y}px`,
                    width: `${st.width}px`,
                    height: `${st.height}px`
                  }}
                  className={`rounded-3xl border-2 border-dashed ${st.accentBorder} bg-gradient-to-b ${st.bgGradient} backdrop-blur-sm p-4 flex flex-col justify-between transition-all duration-300 select-none`}
                  dir="rtl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-950/90 border ${st.accentBorder} ${st.color}`}>
                        {st.badge}
                      </span>
                      <h3 className="text-xs font-bold text-slate-200">{st.title}</h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">{st.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SVG Edges with Animated Flow Particles */}
            <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none z-10">
              {nodes.map((node) => {
                if (!node.parentId) return null;
                const parent = nodes.find((n) => n.id === node.parentId);
                if (!parent) return null;

                const pWidth = 304;
                const pHeight = 110;
                const nWidth = 304;
                const nHeight = 110;

                const startX = parent.x + (node.x > parent.x ? pWidth : 0);
                const startY = parent.y + pHeight / 2;
                const endX = node.x + (node.x > parent.x ? 0 : nWidth);
                const endY = node.y + nHeight / 2;

                const deltaX = Math.abs(endX - startX) * 0.5;
                const control1X = node.x > parent.x ? startX + deltaX : startX - deltaX;
                const control2X = node.x > parent.x ? endX - deltaX : endX + deltaX;

                const isEdgeActive = selectedNodeId === node.id || selectedNodeId === parent.id;
                const edgePath = `M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`;

                return (
                  <g key={`edge-group-${parent.id}-${node.id}`}>
                    <path
                      d={edgePath}
                      className={`fill-none transition-all duration-300 ${
                        isExecuting
                          ? "stroke-emerald-400 stroke-[3.5] [stroke-dasharray:8_4] animate-pulse"
                          : isEdgeActive
                          ? "stroke-violet-400 stroke-[3]"
                          : "stroke-slate-700/80 stroke-[2]"
                      }`}
                    />
                    {/* Live Flowing Particle */}
                    {(isExecuting || mode === "exec") && (
                      <circle r="4" fill="#34d399">
                        <animateMotion path={edgePath} dur="2.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive HTML Nodes (2026 Sleek Redesign) */}
            <div className="absolute top-0 left-0 w-[5000px] h-[5000px] z-20 pointer-events-auto">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isSpotlight = mode === "train" && trainStepIndex === node.stepOrder;
                const isDimmed = mode === "train" && trainStepIndex !== node.stepOrder;

                return (
                  <div
                    key={node.id}
                    dir="rtl"
                    className={`map-node absolute rounded-2xl border p-4 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl w-[304px] bg-slate-900/90 cursor-grab active:cursor-grabbing transition-all duration-200 group ${
                      node.color
                    } ${
                      isSelected
                        ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950 shadow-violet-500/25 scale-[1.03] z-30"
                        : "hover:border-slate-600 hover:scale-[1.01]"
                    } ${
                      isSpotlight
                        ? "ring-4 ring-amber-400 shadow-2xl scale-[1.06] z-50 animate-pulse"
                        : ""
                    } ${isDimmed ? "opacity-20 grayscale-[70%] blur-[0.5px]" : ""}`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                  >
                    {/* Left Connection Port (Output Handle) */}
                    <div
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.8)] group-hover:scale-125 transition-transform"
                      title="منفذ المخرجات (Output Port)"
                    />

                    {/* Right Connection Port (Input Handle) */}
                    <div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] group-hover:scale-125 transition-transform"
                      title="منفذ المدخلات (Input Port)"
                    />

                    {/* Top Row: Category badge & step order + App Status */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-black flex items-center justify-center border border-slate-700/80">
                          {node.stepOrder}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60">
                          {node.badge}
                        </span>
                      </div>

                      {node.requiredAppSlug && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition ${
                            isToolInstalled(node.requiredAppSlug)
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {isToolInstalled(node.requiredAppSlug) ? "مفعّل ✅" : "غير مفعّل 🔒"}
                        </span>
                      )}
                    </div>

                    {/* Title and Subtitle */}
                    <div className="text-xs font-black text-white leading-snug tracking-tight group-hover:text-violet-200 transition">
                      {node.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {node.subtitle}
                    </div>

                    {/* Live Metric Badge */}
                    {node.liveMetric && (
                      <div className="mt-2.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span className="text-slate-400 text-[10px]">{node.liveMetric.label}:</span>
                        </div>
                        <span className={`font-black ${node.liveMetric.color}`}>{node.liveMetric.value}</span>
                      </div>
                    )}

                    {/* Bottom Row: Actions */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      {node.liveRoute ? (
                        isToolInstalled(node.requiredAppSlug) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLiveTool(node.liveRoute);
                            }}
                            className="flex items-center gap-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition font-bold border border-slate-700"
                            title="فتح الأداة المفعّلة"
                          >
                            <span>فتح الأداة</span>
                            <ExternalLink className="w-3 h-3 text-emerald-400" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/marketplace");
                              toast.info(`الأداة بحاجة لتفعيل من المتجر لشركة ${companyName || ""}`);
                            }}
                            className="flex items-center gap-1 text-amber-300 hover:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg transition font-bold"
                            title="غير مفعّلة — اضغط للانتقال للمتجر"
                          >
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>تفعيل من المتجر</span>
                          </button>
                        )
                      ) : (
                        <span className="text-slate-500 font-medium">مسار عمليات</span>
                      )}

                      {node.hasVideo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info("تشغيل مشغل الفيديو التعليمي للمتدرب");
                          }}
                          className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-1 rounded-lg font-bold transition"
                        >
                          <Video className="w-3 h-3" />
                          <span>فيديو الشرح</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Node Action Context Bar - floating directly above selected node */}
          {(() => {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (!selectedNode) return null;
            const nodeScreenX = selectedNode.x * zoom + pan.x + (152 * zoom);
            const nodeScreenY = selectedNode.y * zoom + pan.y - 52;

            return (
              <div
                style={{
                  position: "absolute",
                  left: `${nodeScreenX}px`,
                  top: `${Math.max(12, nodeScreenY)}px`,
                  transform: "translateX(-50%)"
                }}
                className="z-30 bg-slate-900/95 border border-violet-500/80 rounded-2xl shadow-2xl p-1.5 flex items-center gap-1.5 backdrop-blur animate-fade-in pointer-events-auto"
                dir="rtl"
              >
                <button
                  onClick={aiExpandNode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>توسيع بالـ AI</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedNode.liveRoute) handleOpenLiveTool(selectedNode.liveRoute);
                    else toast.success("تم تشغيل الأداة واختبار تنفيذها على السيرفر بنجاح");
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تشغيل الأداة</span>
                </button>
                <div className="h-4 w-px bg-slate-800 mx-1"></div>
                <button
                  onClick={deleteSelectedNode}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })()}

          {/* 2026 Floating Bottom Dock */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 backdrop-blur-2xl bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] px-3 py-1.5 flex items-center gap-2 pointer-events-auto" dir="rtl">
            {/* Open Palette Button */}
            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-lg shadow-violet-600/30 active:scale-95"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>أدوات السيناريو (17)</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            {/* Quick Stage Zoom Filter */}
            <div className="hidden lg:flex items-center gap-1 text-[11px]">
              <button
                onClick={() => {
                  handleResetZoom();
                  toast.info("عرض دورة التجارة الكاملة");
                }}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-800 transition font-bold"
              >
                الكل
              </button>
              {WORKFLOW_STAGES.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setZoom(0.95);
                    setPan({ x: 200 - st.x, y: 150 - st.y });
                    toast.info(`التركيز على: ${st.title}`);
                  }}
                  className={`px-2 py-1 rounded-lg transition hover:bg-slate-800 font-bold ${st.color}`}
                >
                  {st.badge}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1"></div>

            {/* Zoom Controls inside Dock */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-slate-400 w-8 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
                title="إعادة ضبط"
              >
                <Scan className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Minimap toggle */}
            <button
              onClick={() => setIsMinimapOpen(!isMinimapOpen)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${isMinimapOpen ? "bg-slate-800 text-violet-400" : "text-slate-500 hover:bg-slate-800"}`}
              title="إظهار/إخفاء الخريطة المصغرة"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2026 Floating Minimap */}
          {isMinimapOpen && (
            <div className="hidden sm:flex flex-col absolute bottom-5 left-5 z-30 w-44 h-28 backdrop-blur-2xl bg-slate-900/90 border border-slate-700/70 rounded-2xl shadow-2xl p-2 select-none pointer-events-auto" dir="rtl">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1 border-b border-slate-800/80 pb-1">
                <span className="flex items-center gap-1">
                  <MapIcon className="w-3 h-3 text-violet-400" />
                  <span>خريطة المسار</span>
                </span>
                <span className="text-[9px] text-slate-500 font-normal">{nodes.length} عقدة</span>
              </div>
              <div className="relative flex-1 w-full bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/60" dir="ltr">
                {/* Mini Stage frames */}
                {WORKFLOW_STAGES.map((st) => (
                  <div
                    key={`mini-${st.id}`}
                    style={{
                      position: "absolute",
                      left: `${(st.x / 2000) * 100}%`,
                      top: `${((st.y + 100) / 900) * 100}%`,
                      width: `${(st.width / 2000) * 100}%`,
                      height: `${(st.height / 900) * 100}%`
                    }}
                    className="border border-slate-700/40 bg-slate-800/20 rounded-[2px]"
                  />
                ))}
                {/* Mini Node dots */}
                {nodes.map((n) => (
                  <div
                    key={`mini-node-${n.id}`}
                    style={{
                      position: "absolute",
                      left: `${(n.x / 2000) * 100}%`,
                      top: `${((n.y + 100) / 900) * 100}%`
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-transform ${selectedNodeId === n.id ? "bg-violet-400 scale-150 ring-2 ring-violet-500" : "bg-slate-400"}`}
                  />
                ))}
                {/* Viewport Camera Indicator */}
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.max(0, Math.min(80, ((-pan.x / zoom) / 2000) * 100))}%`,
                    top: `${Math.max(0, Math.min(70, (((-pan.y / zoom) + 100) / 900) * 100))}%`,
                    width: `${Math.min(100, (800 / zoom / 2000) * 100)}%`,
                    height: `${Math.min(100, (500 / zoom / 900) * 100)}%`
                  }}
                  className="border-2 border-violet-400 bg-violet-500/15 rounded pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side Panel: All 17 Tools Palette */}
      {isSidePanelOpen && (
        <aside className="fixed top-14 left-0 bottom-0 w-84 sm:w-96 bg-slate-900 border-r border-slate-800 shadow-2xl z-40 flex flex-col animate-slide-in-left">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-sm text-white">أدوات السيناريو الكاملة (17 أداة)</h3>
                <p className="text-[11px] text-slate-400">اسحب الأداة وأفلتها في مكانها بالخريطة</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidePanelOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-slate-300 text-[11px] flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-violet-400 shrink-0" />
              <span>
                <strong>سحب وإفلات (Drag & Drop):</strong> اسحب أي أداة بالماوس وأفلتها في اللوحة لتستقر مكان
                الإفلات فوراً وتتصل بالمسار!
              </span>
            </div>

            {/* 1. التخطيط والحاسبات */}
            <div>
              <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-2">
                <Calculator className="w-4 h-4" />
                <span>1. التخطيط والحاسبات المالية</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "calc_break_even")}
                  onClick={() => addNodeFromPalette("calc_break_even")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> حاسبة نقطة التعادل (Break-even)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">حاسبة</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "calc_budget")}
                  onClick={() => addNodeFromPalette("calc_budget")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> مخطط الميزانية الإعلانية
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">ميزانية</span>
                </div>
              </div>
            </div>

            {/* 2. صناعة المحتوى والمتجر */}
            <div>
              <div className="flex items-center gap-1.5 text-violet-400 font-bold mb-2">
                <Sparkles className="w-4 h-4" />
                <span>2. المحتوى وصفحات المنتجات</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "creative_ai")}
                  onClick={() => addNodeFromPalette("creative_ai")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> استوديو الصور والمحتوى (AI Hub)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">AI</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "store_pdp")}
                  onClick={() => addNodeFromPalette("store_pdp")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> صفحة هبوط المنتج (PDP Storefront)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">متجر</span>
                </div>
              </div>
            </div>

            {/* 3. الإعلانات وقنوات التواصل */}
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-2">
                <Flame className="w-4 h-4" />
                <span>3. الإعلانات وقنوات التواصل</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ads_meta")}
                  onClick={() => addNodeFromPalette("ads_meta")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> إعلانات فيسبوك وانستجرام
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">إعلانات</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "chat_unified")}
                  onClick={() => addNodeFromPalette("chat_unified")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> صندوق المحادثات الموحد (Inbox)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">موحد</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "chat_whatsapp")}
                  onClick={() => addNodeFromPalette("chat_whatsapp")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> بوت واتساب الرسمي السحابي
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">واتساب</span>
                </div>
              </div>
            </div>

            {/* 4. العمليات، التأكيد، والمخزن */}
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2">
                <CheckSquare className="w-4 h-4" />
                <span>4. العمليات والتأكيد والمخزن</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ops_confirmation")}
                  onClick={() => addNodeFromPalette("ops_confirmation")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> تأكيد الطلبات ونسبة الإلغاء
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">تأكيد</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ops_warehouse")}
                  onClick={() => addNodeFromPalette("ops_warehouse")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> تجهيز المستودع والشحن
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">مخزن</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ops_returns")}
                  onClick={() => addNodeFromPalette("ops_returns")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> تحليل المرتجعات وأسبابها
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">مرتجعات</span>
                </div>
              </div>
            </div>

            {/* 5. المالية والأرباح P&L */}
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2">
                <DollarSign className="w-4 h-4" />
                <span>5. المالية وتحصيل الكاش P&L</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "finance_cod")}
                  onClick={() => addNodeFromPalette("finance_cod")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> أداء تحصيل الدفع عند الاستلام (COD)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">COD</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "finance_pnl")}
                  onClick={() => addNodeFromPalette("finance_pnl")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> الأرباح والخسائر الشهرية (P&L)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">P&L</span>
                </div>
              </div>
            </div>

            {/* 6. الجروث والسكيلينج */}
            <div>
              <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>6. الجروث ماركتنج والسكيلينج</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "growth_clv")}
                  onClick={() => addNodeFromPalette("growth_clv")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> حاسبة القيمة الدائمة للعميل (CLV)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">CLV</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "growth_conversion")}
                  onClick={() => addNodeFromPalette("growth_conversion")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> مسار التحويل ومؤشرات الأداء
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Funnel</span>
                </div>
              </div>
            </div>

            {/* 7. التدريب والشرح */}
            <div>
              <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-2">
                <GraduationCap className="w-4 h-4" />
                <span>7. التدريب والشرح المدمج</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "training_video")}
                  onClick={() => addNodeFromPalette("training_video")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> عقدة فيديو شرح وتدريب (SOP)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">فيديو</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

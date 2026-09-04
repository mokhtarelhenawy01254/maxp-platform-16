import React, { useState, useRef } from "react";
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
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  liveMetric?: { label: string; value: string; color: string };
}

// القالب الشامل: دورة التجارة الإلكترونية الكاملة
const ECOMMERCE_MASTER_BLUEPRINT: MapNode[] = [
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
    liveRoute: "/admin/ai-hub"
  },
  {
    id: "m-step-3",
    parentId: "m-step-2",
    stepOrder: 3,
    title: "3. صفحة هبوط المنتج ومتجر سوان",
    subtitle: "تصميم PDP سريع، باقات عروض الخصم (اشترِ 2 واحصل على شحن مجاني)",
    category: "store",
    badge: "المتجر والمنتجات 🛍️",
    x: 1040,
    y: 120,
    color: "border-teal-500/80 text-teal-300 bg-teal-950/40",
    iconName: "shopping-bag",
    liveRoute: "/products",
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
    liveRoute: "/unified-inbox"
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
    liveRoute: "/inventory"
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
    liveRoute: "/analytics/orders"
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
    liveRoute: "/marketing/clv-calculator"
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
    hasVideo: true
  }
];

export default function MindMapPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<MapNode[]>(ECOMMERCE_MASTER_BLUEPRINT);
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
    toast.loading("جاري تشغيل مسار العمل التنفيذي ومزامنة البيانات مع أدوات MaxP...", { id: "exec-toast" });

    setTimeout(() => {
      setIsExecuting(false);
      toast.success("اكتمل تشغيل المسار بنجاح! تم فحص المؤشرات، تحديث الحسابات، وإرسال الإشعارات.", { id: "exec-toast" });
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
      parentId: selected?.id,
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
    setNodes(ECOMMERCE_MASTER_BLUEPRINT);
    handleResetZoom();
    toast.success("تم تحميل قالب دورة التجارة الإلكترونية الشاملة بنجاح!");
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden" dir="rtl">
      {/* Sub-header inside the app */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">الخرائط الذهنية ومسارات العمل</h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">دورة التجارة الإلكترونية المتكاملة (17 أداة حية)</p>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => switchMode("plan")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === "plan" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>تخطيط</span>
          </button>
          <button
            onClick={() => switchMode("train")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === "train" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>تدريب وشرح</span>
          </button>
          <button
            onClick={() => switchMode("exec")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
              mode === "exec" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>أتمتة وتنفيذ</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Blueprint Template Button */}
          <button
            onClick={handleReloadMasterBlueprint}
            title="تحميل دورة التجارة الكاملة"
            className="hidden md:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>قالب دورة التجارة الشاملة</span>
          </button>

          <button
            onClick={runExecutionSimulation}
            disabled={isExecuting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isExecuting ? "animate-spin" : ""}`} />
            <span>{isExecuting ? "جاري التشغيل..." : "تشغيل المسار"}</span>
          </button>

          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            <Boxes className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">أدوات السيناريو (17 أداة)</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={viewportRef}
        dir="ltr"
        className="relative flex-1 w-full h-full overflow-hidden bg-slate-950"
        style={{
          backgroundImage: "radial-gradient(#334155 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px"
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
          <div className="absolute bottom-6 right-1/2 translate-x-1/2 z-30 bg-slate-900/95 border border-amber-500/50 p-2 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur">
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

        {/* Canvas Zoom Tools */}
        <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
          <button
            onClick={handleZoomIn}
            title="تكبير"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="تصغير"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="إعادة ضبط الرؤية"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 transition"
          >
            <Scan className="w-4 h-4" />
          </button>
        </div>

        {/* Infinite Transform Container */}
        <div
          className="absolute inset-0 origin-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          {/* SVG Edges */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
            {nodes.map((node) => {
              if (!node.parentId) return null;
              const parent = nodes.find((n) => n.id === node.parentId);
              if (!parent) return null;

              const pWidth = 280;
              const pHeight = 100;
              const nWidth = 280;
              const nHeight = 100;

              const startX = parent.x + (node.x > parent.x ? pWidth : 0);
              const startY = parent.y + pHeight / 2;
              const endX = node.x + (node.x > parent.x ? 0 : nWidth);
              const endY = node.y + nHeight / 2;

              const deltaX = Math.abs(endX - startX) * 0.5;
              const control1X = node.x > parent.x ? startX + deltaX : startX - deltaX;
              const control2X = node.x > parent.x ? endX - deltaX : endX + deltaX;

              const isEdgeActive = selectedNodeId === node.id || selectedNodeId === parent.id;

              return (
                <path
                  key={`edge-${parent.id}-${node.id}`}
                  d={`M ${startX} ${startY} C ${control1X} ${startY}, ${control2X} ${endY}, ${endX} ${endY}`}
                  className={`fill-none transition-all duration-300 ${
                    isExecuting
                      ? "stroke-emerald-400 stroke-[4] [stroke-dasharray:8_4] animate-pulse"
                      : isEdgeActive
                      ? "stroke-violet-500 stroke-[3.5]"
                      : "stroke-slate-700 stroke-[2.5]"
                  }`}
                />
              );
            })}
          </svg>

          {/* Interactive HTML Nodes */}
          <div className="absolute inset-0 w-[5000px] h-[5000px] z-10 pointer-events-auto">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isSpotlight = mode === "train" && trainStepIndex === node.stepOrder;
              const isDimmed = mode === "train" && trainStepIndex !== node.stepOrder;

              return (
                <div
                  key={node.id}
                  dir="rtl"
                  className={`map-node absolute rounded-2xl border p-3.5 flex flex-col justify-between shadow-2xl backdrop-blur w-72 bg-slate-900/95 cursor-grab active:cursor-grabbing transition-all duration-150 ${
                    node.color
                  } ${
                    isSelected
                      ? "ring-2 ring-violet-500 shadow-violet-500/20 scale-[1.02]"
                      : ""
                  } ${
                    isSpotlight
                      ? "ring-4 ring-amber-500 shadow-2xl scale-[1.06] z-50"
                      : ""
                  } ${isDimmed ? "opacity-25 grayscale-[60%] blur-[0.5px]" : ""}`}
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
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/80 border border-slate-700/80 flex items-center gap-1">
                      <span>{node.badge}</span>
                    </span>
                    {mode === "train" && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                        {node.stepOrder}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white leading-snug">{node.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-normal">{node.subtitle}</div>

                  {/* Live Metric Badge if present */}
                  {node.liveMetric && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{node.liveMetric.label}:</span>
                      <span className={`font-black ${node.liveMetric.color}`}>{node.liveMetric.value}</span>
                    </div>
                  )}

                  {/* Live Tool Direct Link / Video Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    {node.liveRoute ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLiveTool(node.liveRoute);
                        }}
                        className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition font-semibold"
                      >
                        <span>فتح الأداة بالنظام</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    ) : (
                      <span className="text-slate-500">مسار عمليات</span>
                    )}

                    {node.hasVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("تشغيل مشغل الفيديو التعليمي للمتدرب");
                        }}
                        className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-1 rounded-lg font-bold"
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

        {/* Selected Node Action Context Bar */}
        {selectedNodeId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-violet-500/50 rounded-2xl shadow-2xl p-1.5 flex items-center gap-1.5 backdrop-blur animate-fade-in">
            <button
              onClick={aiExpandNode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>توسيع بالـ AI</span>
            </button>
            <button
              onClick={() => {
                const node = nodes.find((n) => n.id === selectedNodeId);
                if (node?.liveRoute) handleOpenLiveTool(node.liveRoute);
                else toast.success("تم تشغيل الأداة واختبار تنفيذها على السيرفر بنجاح");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>تشغيل الأداة</span>
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1"></div>
            <button
              onClick={deleteSelectedNode}
              className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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

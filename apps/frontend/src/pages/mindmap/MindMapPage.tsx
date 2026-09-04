import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  GitBranch,
  Play,
  Sparkles,
  Plus,
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
  CheckCheck,
  Boxes,
  ArrowDownCircle,
  Info,
  Trash2,
  Video,
  MousePointerClick,
  PlayCircle,
  Layers,
  Clock,
  X,
  FileText,
  UserCheck,
  Package,
  Wand2,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface MapNode {
  id: string;
  parentId?: string;
  stepOrder: number;
  title: string;
  subtitle: string;
  category: "trigger" | "ai" | "commerce" | "crm" | "training" | "task" | "logic";
  badge: string;
  x: number;
  y: number;
  color: string;
  icon: string;
  hasVideo?: boolean;
  assignee?: string;
  taskStatus?: string;
  productName?: string;
}

const INITIAL_NODES: MapNode[] = [
  {
    id: "step-1",
    stepOrder: 1,
    title: "مشغّل: سلة متروكة في المتجر",
    subtitle: "مرور 30 دقيقة على ترك العميل للسلة",
    category: "trigger",
    badge: "مشغل المتجر ⚡",
    x: 250,
    y: 280,
    color: "border-amber-500/80 text-amber-300 bg-amber-950/40",
    icon: "shopping-cart"
  },
  {
    id: "step-2",
    parentId: "step-1",
    stepOrder: 2,
    title: "وكيل المبيعات الذكي (مروة)",
    subtitle: "تحليل السلة وصياغة رسالة ودية بالعامية",
    category: "ai",
    badge: "وكيل مبيعات بشري 🤖",
    x: 650,
    y: 160,
    color: "border-violet-500/80 text-violet-300 bg-violet-950/40",
    icon: "sparkles"
  },
  {
    id: "step-3",
    parentId: "step-2",
    stepOrder: 3,
    title: "توليد كود خصم 15% مؤقت",
    subtitle: "صلاحية الكوبون 24 ساعة فقط",
    category: "commerce",
    badge: "كوبون متجر سوان 🏷️",
    x: 1050,
    y: 100,
    color: "border-teal-500/80 text-teal-300 bg-teal-950/40",
    icon: "tag"
  },
  {
    id: "step-4",
    parentId: "step-3",
    stepOrder: 4,
    title: "إرسال رسالة واتساب تفاعلية",
    subtitle: "تتضمن رابط استكمال الطلب مع الخصم",
    category: "crm",
    badge: "واتساب فوري 💬",
    x: 1450,
    y: 100,
    color: "border-emerald-500/80 text-emerald-300 bg-emerald-950/40",
    icon: "message-square"
  },
  {
    id: "step-5",
    parentId: "step-1",
    stepOrder: 5,
    title: "فيديو شرح وتطبيق للمتدرب",
    subtitle: "شرح كيفية إعداد خطة الاسترجاع بالفيديو",
    category: "training",
    badge: "شرح تدريبي 🎓",
    x: 650,
    y: 440,
    color: "border-rose-500/80 text-rose-300 bg-rose-950/40",
    icon: "play-circle",
    hasVideo: true
  },
  {
    id: "step-6",
    parentId: "step-5",
    stepOrder: 6,
    title: "إنشاء مهمة متابعة في مساحة العمل",
    subtitle: "إسناد المتابعة لأحمد إذا لم يتم الشراء",
    category: "task",
    badge: "Tasks Workspace 📋",
    x: 1050,
    y: 440,
    color: "border-blue-500/80 text-blue-300 bg-blue-950/40",
    icon: "check-square"
  }
];

export default function MindMapPage() {
  const [nodes, setNodes] = useState<MapNode[]>(INITIAL_NODES);
  const [mode, setMode] = useState<"plan" | "train" | "exec">("plan");
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 150, y: 120 });
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
      toast.info("تم تفعيل وضع الأتمتة والتنفيذ (n8n Mode)");
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
      const targetZoom = 1.15;
      setZoom(targetZoom);
      setPan({
        x: rect.width / 2 - node.x * targetZoom - 130,
        y: rect.height / 2 - node.y * targetZoom - 80
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
    toast.loading("جاري تشغيل واختبار مسار العمل عبر خادم MaxP...", { id: "exec-toast" });

    setTimeout(() => {
      setIsExecuting(false);
      toast.success("تم تنفيذ مسار العمل بنجاح! تم إنشاء المهمة وتجهيز كود الخصم.", { id: "exec-toast" });
    }, 3000);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 150, y: 120 });
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

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 2.2));
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

    addNodeFromPalette(toolType, dropX - 100, dropY - 40);
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
      x: customX !== undefined ? customX : (selected ? selected.x + 360 : 300),
      y: customY !== undefined ? customY : (selected ? selected.y + 40 : 300),
      title: "أداة جديدة",
      subtitle: "إعدادات الأداة في النظام",
      badge: "أداة مضافة",
      color: "border-slate-600 text-slate-300 bg-slate-900",
      icon: "tool",
      category: "task"
    };

    if (type === "trigger_cart") {
      newNode.title = "مشغل: سلة متروكة في المتجر";
      newNode.subtitle = "مرور 30 دقيقة على ترك السلة";
      newNode.badge = "سلة متروكة ⚡";
      newNode.color = "border-amber-500 text-amber-300 bg-amber-950/40";
      newNode.icon = "shopping-cart";
      newNode.category = "trigger";
    } else if (type === "trigger_whatsapp") {
      newNode.title = "مشغل: رسالة واردة على واتساب";
      newNode.subtitle = "استقبال كلمة مفتاحية معينة";
      newNode.badge = "واتساب وارد 💬";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.icon = "message-circle";
      newNode.category = "trigger";
    } else if (type === "ai_sales_agent") {
      newNode.title = "وكيل المبيعات البشري (مروة)";
      newNode.subtitle = "صياغة رد مقنع بالعامية المصرية";
      newNode.badge = "وكيل بشري 🤖";
      newNode.color = "border-violet-500 text-violet-300 bg-violet-950/40";
      newNode.icon = "sparkles";
      newNode.category = "ai";
    } else if (type === "ai_ocr") {
      newNode.title = "وكيل قراءة الفواتير (OCR)";
      newNode.subtitle = "استخراج المبلغ ورقم الحساب";
      newNode.badge = "فحص إيصالات 🧾";
      newNode.color = "border-violet-500 text-violet-300 bg-violet-950/40";
      newNode.icon = "file-text";
      newNode.category = "ai";
    } else if (type === "action_whatsapp") {
      newNode.title = "إرسال رسالة واتساب للعميل";
      newNode.subtitle = "نص الرسالة وكود الخصم";
      newNode.badge = "WhatsApp 💬";
      newNode.color = "border-emerald-500 text-emerald-300 bg-emerald-950/40";
      newNode.icon = "message-square";
      newNode.category = "crm";
    } else if (type === "action_task") {
      newNode.title = "إنشاء مهمة للمبيعات";
      newNode.subtitle = "إسناد للموظف مع تذكير بعد 3 ساعات";
      newNode.badge = "Tasks 📋";
      newNode.color = "border-blue-500 text-blue-300 bg-blue-950/40";
      newNode.icon = "check-square";
      newNode.category = "task";
    } else if (type === "action_coupon") {
      newNode.title = "توليد كود خصم مؤقت 15%";
      newNode.subtitle = "صلاحية 24 ساعة لمتجر سوان";
      newNode.badge = "كوبون متجر 🏷️";
      newNode.color = "border-teal-500 text-teal-300 bg-teal-950/40";
      newNode.icon = "tag";
      newNode.category = "commerce";
    } else if (type === "train_video") {
      newNode.title = "شرح استراتيجية العروض بالفيديو";
      newNode.subtitle = "فيديو تدريبي 4 دقائق";
      newNode.badge = "فيديو تدريبي 🎓";
      newNode.color = "border-rose-500 text-rose-300 bg-rose-950/40";
      newNode.icon = "play-circle";
      newNode.hasVideo = true;
      newNode.category = "training";
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
    toast.success(`تمت إضافة: ${newNode.title}`);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || selectedNodeId === "step-1") {
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
    toast.loading(`يقوم وكيل MaxP الذكي بتحليل: "${node.title}"...`, { id: "ai-expand" });

    setTimeout(() => {
      const newId = "ai-" + Date.now();
      const newNode: MapNode = {
        id: newId,
        parentId: node.id,
        stepOrder: nodes.length + 1,
        title: "فرع مقترح ذكياً: تقديم شحن مجاني بدلاً من الخصم",
        subtitle: "بناءً على تفضيل عملاء نفس المنطقة",
        badge: "اقتراح ذكي ✨",
        color: "border-violet-500 text-violet-300 bg-violet-950/40",
        icon: "sparkles",
        category: "ai",
        x: node.x + 360,
        y: node.y - 50
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newId);
      toast.success("تم توليد الفرع الذكي بنجاح!", { id: "ai-expand" });
    }, 1200);
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
            <p className="text-[11px] text-slate-400 hidden sm:block">تخطيط + تدريب + أتمتة تنفيذية متصلة بأدوات MaxP</p>
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
            <span className="hidden sm:inline">الأدوات (Drag & Drop)</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={viewportRef}
        className="relative flex-1 w-full h-full overflow-hidden bg-slate-950"
        style={{
          backgroundImage: "radial-gradient(#334155 1px, transparent 1px)",
          backgroundSize: "26px 26px"
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
              <span>أفلت الأداة هنا لإضافتها إلى المسار مباشرة!</span>
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
            title="إعادة ضبط"
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

              const pWidth = 260;
              const pHeight = 85;
              const nWidth = 260;
              const nHeight = 85;

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
                      ? "stroke-emerald-400 stroke-[3.5] [stroke-dasharray:8_4] animate-pulse"
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
                  className={`map-node absolute rounded-2xl border p-3.5 flex flex-col justify-between shadow-2xl backdrop-blur w-64 bg-slate-900/95 cursor-grab active:cursor-grabbing transition-all duration-150 ${
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

                  {node.hasVideo && (
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-rose-300">
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> فيديو: 3:45 د
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("تشغيل مشغل الفيديو التعليمي للمتدرب");
                        }}
                        className="bg-rose-500/20 hover:bg-rose-500/40 px-2 py-0.5 rounded font-bold"
                      >
                        مشاهدة
                      </button>
                    </div>
                  )}
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
              onClick={() => toast.success("تم تشغيل الأداة واختبار تنفيذها على الخادم")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>اختبار</span>
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

      {/* Side Panel: Drag and drop tools */}
      {isSidePanelOpen && (
        <aside className="fixed top-14 left-0 bottom-0 w-80 sm:w-88 bg-slate-900 border-r border-slate-800 shadow-2xl z-40 flex flex-col animate-slide-in-left">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-sm text-white">لوحة الأدوات (7 فئات)</h3>
                <p className="text-[11px] text-slate-400">اسحب الأداة وأفلتها في اللوحة</p>
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
                الإفلات فوراً!
              </span>
            </div>

            {/* Triggers */}
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2">
                <PlayCircle className="w-4 h-4" />
                <span>1. المشغلات (Triggers)</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "trigger_cart")}
                  onClick={() => addNodeFromPalette("trigger_cart")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> سلة متروكة في المتجر
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">متجر</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "trigger_whatsapp")}
                  onClick={() => addNodeFromPalette("trigger_whatsapp")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> رسالة واردة على واتساب
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    محادثة
                  </span>
                </div>
              </div>
            </div>

            {/* AI Agents */}
            <div>
              <div className="flex items-center gap-1.5 text-violet-400 font-bold mb-2">
                <Sparkles className="w-4 h-4" />
                <span>2. وكلاء الذكاء الاصطناعي (MaxP Agents)</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ai_sales_agent")}
                  onClick={() => addNodeFromPalette("ai_sales_agent")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> وكيل المبيعات البشري
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                    وكيل بشري
                  </span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "ai_ocr")}
                  onClick={() => addNodeFromPalette("ai_ocr")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> استخراج بيانات الفواتير
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">OCR</span>
                </div>
              </div>
            </div>

            {/* Communication & CRM */}
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2">
                <MessageSquare className="w-4 h-4" />
                <span>3. التواصل والـ CRM</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "action_whatsapp")}
                  onClick={() => addNodeFromPalette("action_whatsapp")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> إرسال رسالة واتساب
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    WhatsApp
                  </span>
                </div>
              </div>
            </div>

            {/* Operations & Tasks */}
            <div>
              <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-2">
                <CheckSquare className="w-4 h-4" />
                <span>4. المهام والعمليات (Tasks)</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "action_task")}
                  onClick={() => addNodeFromPalette("action_task")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> إنشاء مهمة في مساحة العمل
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">مهمة حية</span>
                </div>
              </div>
            </div>

            {/* Commerce */}
            <div>
              <div className="flex items-center gap-1.5 text-teal-400 font-bold mb-2">
                <Tag className="w-4 h-4" />
                <span>5. المتجر والخصومات</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "action_coupon")}
                  onClick={() => addNodeFromPalette("action_coupon")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> توليد كود خصم مؤقت 15%
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">كوبون</span>
                </div>
              </div>
            </div>

            {/* Training */}
            <div>
              <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-2">
                <GraduationCap className="w-4 h-4" />
                <span>6. الشرح والتدريب</span>
              </div>
              <div className="space-y-1.5">
                <div
                  draggable
                  onDragStart={(e) => handleToolDragStart(e, "train_video")}
                  onClick={() => addNodeFromPalette("train_video")}
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-between text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500" /> عقدة فيديو شرح مدمج
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

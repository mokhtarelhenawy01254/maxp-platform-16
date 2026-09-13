import React, { useState, useEffect, useMemo } from "react";
import { Package, Boxes, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  AgentStudioLayout,
  AgentStudioChatFeed,
  AgentStudioSessionsDrawer,
  useAgentStudioSessions,
} from "../../../components/agent-studio";
import type {
  StudioEntity,
  StudioAgentInfo,
  StudioDraftAction,
  StudioQuickPrompt,
} from "../../../components/agent-studio";
import { ProductOpportunityRadar } from "../../advertising/marketing-studio/ProductOpportunityRadar";
import { InventoryActionCanvas } from "./InventoryActionCanvas";
import {
  chatWithInventoryAgent,
  getInventoryActiveAgent,
  getInventoryStudioSessions,
  saveInventoryStudioSession,
  deleteInventoryStudioSession,
} from "../../../services/inventoryAiService";

const INVENTORY_WELCOME_TEXT =
  "أهلاً بك! أنا وكيل إدارة المنتجات والمخزون والتسعير 📦.\n\n" +
  "أستطيع مساعدتك في فحص دقة المخزون، مراقبة هوامش الربح الصافية، واقتراح تسعير تنافسي " +
  "يحافظ على ربحية المتجر ويحمي من نفاد البضائع أو تراكم المخزون الراكد.\n\n" +
  "هل ترغب في فحص منتج معين أو مراجعة الأصناف منخفضة الرصيد؟";

const INVENTORY_QUICK_PROMPTS: StudioQuickPrompt[] = [
  {
    label: "فحص الأصناف منخفضة المخزون",
    generatePrompt: () =>
      "قم بجرد وفحص المنتجات التي اقتربت كمياتها من النفاد وحدد نقاط إعادة الطلب المقترحة.",
  },
  {
    label: "مراجعة هوامش الربح والتسعير",
    generatePrompt: (product) =>
      product
        ? `احسب هامش الربح الحالي لمنتج "${product.name}" بناءً على سعره (${product.price} ج.م) وتكلفته (${product.cost || 0} ج.م) واقترح سعراً تنافسياً مع الحفاظ على هامش لا يقل عن 35%.`
        : "قم بتحليل أسعار وهوامش الربح للمنتجات واقترح تحسينات لزيادة العائد الإجمالي.",
  },
  {
    label: "توقع نفاذ المخزون وحركة الطلب",
    generatePrompt: (product) =>
      product
        ? `حلل معدل استهلاك منتج "${product.name}" وتوقع كم يوماً يكفي الرصيد الحالي (${product.stock || 0} قطعة).`
        : "افحص سرعة دوران المخزون للأصناف الأكثر طلباً.",
  },
  {
    label: "تسوية رصيد مخزون فعلي",
    generatePrompt: (product) =>
      product
        ? `أريد تسجيل تعديل مسودة مخزون لمنتج "${product.name}" بناءً على جرد مخزني فعلي.`
        : "كيف يمكنني تسوية أرصدة المخزون بعد الجرد الدوري؟",
  },
];

const InventoryAiStudioPage: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  // 1. Unified Cloud Session Management
  const sessions = useAgentStudioSessions({
    storagePrefix: "maxp_inventory_studio",
    companyId,
    defaultWelcomeText: INVENTORY_WELCOME_TEXT,
    fetchCloudSessions: () => getInventoryStudioSessions(50),
    saveCloudSession: saveInventoryStudioSession,
    deleteCloudSession: deleteInventoryStudioSession,
  });

  // 2. Active Selection & Draft State
  const [selectedProduct, setSelectedProduct] = useState<StudioEntity | null>(null);
  const [activeDraft, setActiveDraft] = useState<StudioDraftAction | null>(null);
  const [activeAgent, setActiveAgent] = useState<StudioAgentInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 3. UI Drawers & Mobile View State
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSessionsDrawerOpen, setIsSessionsDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"CHAT" | "CANVAS">("CHAT");

  // Load Active Agent for Inventory Studio
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getInventoryActiveAgent();
        if (isMounted && res.success && res.agent) {
          setActiveAgent(res.agent);
        }
      } catch (err) {
        console.warn("[InventoryAiStudio] Could not load active agent:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Handle User Message Sending
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user" as const,
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    sessions.addMessageToActiveSession(userMsg);
    setLoading(true);

    const productPayload = selectedProduct
      ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          cost: selectedProduct.cost || 0,
          stock: selectedProduct.stock || 0,
        }
      : undefined;

    try {
      const res = await chatWithInventoryAgent(
        textToSend,
        sessions.activeSession.id,
        productPayload,
        activeAgent?.id
      );

      if (res.success) {
        const agentMsg = {
          id: `agent-${Date.now()}`,
          sender: "agent" as const,
          text: res.reply || "تم فحص بيانات المخزون والتسعير.",
          toolCalls: res.tool_calls,
          timestamp: new Date().toISOString(),
        };
        sessions.addMessageToActiveSession(agentMsg);

        // Parse any action drafts recommended by the agent
        if (res.tool_calls && res.tool_calls.length > 0) {
          for (const tool of res.tool_calls) {
            const toolName = tool.name || "";
            const args = tool.input || tool.args || {};

            if (toolName.includes("price") || toolName.includes("update_price")) {
              setActiveDraft({
                id: `draft_${Date.now()}`,
                type: "PRICE_CHANGE",
                title: "تعديل سعر بيع مقترح",
                entityId: selectedProduct?.id || args.productId || "",
                entityName: selectedProduct?.name || args.productName || "المنتج",
                currentValue: selectedProduct?.price,
                proposedValue: Number(args.price || args.new_price || args.target_price) || 0,
                reason: args.reason || "توصية تسعير بناءً على مراجعة التكلفة وهامش الربح",
                status: "DRAFT",
              });
              if (window.innerWidth < 1024) setMobileView("CANVAS");
              break;
            } else if (toolName.includes("adjust") || toolName.includes("stock")) {
              setActiveDraft({
                id: `draft_${Date.now()}`,
                type: "STOCK_ADJUSTMENT",
                title: "تسوية رصيد مخزون مقترحة",
                entityId: selectedProduct?.id || args.productId || "",
                entityName: selectedProduct?.name || args.productName || "المنتج",
                currentValue: selectedProduct?.stock,
                proposedValue: Number(args.quantity || args.new_quantity || args.stock) || 0,
                reason: args.reason || "تسوية جرد فعلي للمخزن",
                status: "DRAFT",
              });
              if (window.innerWidth < 1024) setMobileView("CANVAS");
              break;
            }
          }
        }
      } else {
        const errorMsg = {
          id: `err-${Date.now()}`,
          sender: "agent" as const,
          text: res.error || "تعذّر الحصول على رد من وكيل المخزون، يرجى المحاولة لاحقاً.",
          timestamp: new Date().toISOString(),
        };
        sessions.addMessageToActiveSession(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: "agent" as const,
        text: `حدث خطأ أثناء الاتصال بالوكيل: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      sessions.addMessageToActiveSession(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    const stock = selectedProduct?.stock;
    if (typeof stock !== "number") return null;

    if (stock <= 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>تنبيه: نفذ المخزون</span>
        </div>
      );
    }

    if (stock < 10) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>تنبيه: مخزون حرج</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span>المخزون في مستوى آمن</span>
      </div>
    );
  }, [selectedProduct?.stock]);

  return (
    <AgentStudioLayout
      studioId="inventory"
      title="مركز المنتجات والمخزون الذكي"
      icon={Boxes}
      connectionBadgeText="متصل بالمخزن"
      selectedEntity={selectedProduct}
      entitySelectorPlaceholder="اختر منتجاً للفحص"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={sessions.sessions.length}
      onOpenSessions={() => setIsSessionsDrawerOpen(true)}
      onNewSession={() => sessions.createNewSession()}
      activeAgent={activeAgent}
      agentRoutingHref="/admin/ai-hub?tab=routing"
      statusBadge={statusBadge}
      chatTabLabel="محادثة المخزون والتسعير"
      canvasTabLabel="لوحة العمليات"
      canvasTabIcon={Boxes}
      hasActiveDraft={!!activeDraft}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
      chatPanel={
        <AgentStudioChatFeed
          selectedEntity={selectedProduct}
          activeSession={sessions.activeSession}
          loading={loading}
          onSendMessage={handleSendMessage}
          quickPrompts={INVENTORY_QUICK_PROMPTS}
          emptyStateTitle="وكيل إدارة المنتجات والمخزون والتسعير"
          emptyStateSubtitle="اطرح أي سؤال حول الكميات، تكاليف المنتجات، هوامش الربح، أو اطلب تسوية جرد وتعديل أسعار."
          emptyStateIcon={Boxes}
          inputPlaceholder="اسأل وكيل المخزون والتسعير (مثلاً: افحص المنتجات التي قربت تخلص)..."
          onNewSession={() => sessions.createNewSession()}
        />
      }
      canvasPanel={
        <InventoryActionCanvas
          selectedProduct={selectedProduct}
          activeDraft={activeDraft}
          onDraftResolved={() => setActiveDraft(null)}
          onRequestAction={(actionPrompt) => handleSendMessage(actionPrompt)}
          onProductUpdated={(updated) =>
            setSelectedProduct((prev) => (prev ? { ...prev, ...updated } : null))
          }
        />
      }
      extraDrawers={
        <>
          <ProductOpportunityRadar
            isOpen={isProductPickerOpen}
            onClose={() => setIsProductPickerOpen(false)}
            selectedProduct={selectedProduct as any}
            onSelectProduct={(p: any) => setSelectedProduct(p)}
          />

          <AgentStudioSessionsDrawer
            isOpen={isSessionsDrawerOpen}
            onClose={() => setIsSessionsDrawerOpen(false)}
            sessions={sessions.sessions}
            activeSessionId={sessions.activeSessionId}
            onSelectSession={sessions.switchSession}
            onNewSession={() => sessions.createNewSession()}
            onDeleteSession={sessions.deleteSession}
            title="جلسات استوديو المخزون"
          />
        </>
      }
    />
  );
};

export default InventoryAiStudioPage;

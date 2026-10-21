import { useState, useEffect, useMemo } from "react";
import React from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useAgentStudioSessions } from "../../../components/agent-studio";
import type {
  StudioEntity,
  StudioAgentInfo,
  StudioDraftAction,
} from "../../../components/agent-studio";
import {
  chatWithInventoryAgent,
  getInventoryActiveAgent,
  getInventoryStudioSessions,
  saveInventoryStudioSession,
  deleteInventoryStudioSession,
} from "../../../services/inventoryAiService";
import { INVENTORY_WELCOME_TEXT } from "./constants";

export function useInventoryStudioController() {
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
  const handleSendMessage = async (textToSend: string, images?: string[]) => {
    if (!textToSend.trim() && (!images || images.length === 0)) return;
    if (loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user" as const,
      text: textToSend,
      images: images && images.length > 0 ? images : undefined,
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
        activeAgent?.id,
        images
      );

      if (res.success) {
        if (res.agentId && (!activeAgent || activeAgent.id !== res.agentId)) {
          setActiveAgent((prev) => ({
            id: res.agentId!,
            name: prev?.name || "أكرم — اختصاصي إدارة وإدراج المنتجات",
            role: prev?.role || "PRODUCT_CREATOR",
            isRouted: true,
          }));
        }
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

  return {
    sessions,
    selectedProduct,
    setSelectedProduct,
    activeDraft,
    setActiveDraft,
    activeAgent,
    loading,
    isProductPickerOpen,
    setIsProductPickerOpen,
    isSessionsDrawerOpen,
    setIsSessionsDrawerOpen,
    mobileView,
    setMobileView,
    handleSendMessage,
    statusBadge,
  };
}

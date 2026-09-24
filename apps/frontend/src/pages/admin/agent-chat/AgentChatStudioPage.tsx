import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bot, Sparkles, Users, Layers, CheckCircle2, ChevronRight, X, Search } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { apiClient } from "../../../services/apiClient";
import { AgentStudioLayout, AgentStudioChatFeed, AgentStudioSessionsDrawer, useAgentStudioSessions } from "../../../components/agent-studio";
import { ProductOpportunityRadar } from "../../advertising/marketing-studio/ProductOpportunityRadar";
import type { StudioEntity, StudioAgentInfo } from "../../../components/agent-studio/types";
import type { MarketingProduct } from "../../advertising/marketing-studio/types";

interface AgentItem {
  id: string;
  name: string;
  role: string;
  slug?: string;
  icon?: string;
  model?: string;
  departmentName?: string;
  description?: string;
  status?: string;
}

const DEFAULT_AGENTS: AgentItem[] = [
  {
    id: "facebook-media-buyer-agent",
    slug: "facebook-media-buyer-agent",
    name: "Facebook Media Buyer",
    role: "MEDIA_BUYER",
    icon: "🎯",
    departmentName: "التسويق والإعلانات",
    model: "DeepSeek-V3",
    description: "إدارة الحملات الإعلانية، صياغة زوايا البيع، واستهداف المحافظات ونشر الحملات.",
  },
  {
    id: "order-confirmation-agent",
    slug: "order-confirmation-agent",
    name: "منى — تأكيد الطلبات",
    role: "ORDER_CONFIRMATION",
    icon: "📦",
    departmentName: "العمليات والشحن",
    model: "Llama 3.3 70B",
    description: "متابعة أوردرات COD المعلقة، تأكيد الشحن، وتتبع بوالص تيربو وبوسطة.",
  },
  {
    id: "shipping-agent",
    slug: "shipping-agent",
    name: "مروان — منسق الشحن والعمليات",
    role: "SHIPPING",
    icon: "🚚",
    departmentName: "العمليات واللوجستيات",
    model: "DeepSeek-V3",
    description: "تتبع مسار الشحنات، حساب أسعار التوصيل، وإدارة والرد على تذاكر شركات الشحن.",
  },
  {
    id: "inventory-pricing-agent",
    slug: "inventory-pricing-agent",
    name: "مساعد المخزون والتسعير",
    role: "INVENTORY_PRICING",
    icon: "📊",
    departmentName: "المستودعات والمخازن",
    model: "DeepSeek-V3",
    description: "مراقبة نواقص المخزون، نقاط إعادة الطلب، وحساب هوامش الربح ونقاط التعادل.",
  },
  {
    id: "competitor-analysis",
    slug: "competitor-analysis",
    name: "محلل إعلانات المنافسين",
    role: "COMPETITOR_SPY",
    icon: "🔍",
    departmentName: "أبحاث السوق",
    model: "DeepSeek-V3",
    description: "تجسس على مكتبة إعلانات ميتا وفحص استراتيجيات المنافسين النشطة في مصر.",
  },
  {
    id: "customer-ceo",
    slug: "customer-ceo",
    name: "المدير التنفيذي لخدمة العملاء",
    role: "CEO_SUPPORT",
    icon: "👔",
    departmentName: "الإدارة العليا",
    model: "Llama 3.3 70B",
    description: "توجيه الفريق، حل المشكلات المعقدة للعملاء، والتنسيق بين قنوات الرد.",
  },
];

export const AgentChatStudioPage: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  // 1. Agent Fleet State
  const [agents, setAgents] = useState<AgentItem[]>(DEFAULT_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<AgentItem>(DEFAULT_AGENTS[0]);
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  // 2. Product / Entity Selector State
  const [selectedProduct, setSelectedProduct] = useState<MarketingProduct | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // 3. Drawers State
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<{ model?: string; latency_ms?: number } | null>(null);

  // Load live agents from backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await apiClient.get<{ success?: boolean; agents?: any[]; data?: any[] }>("/agent-manager/agents");
        const list = res.data?.agents || res.data?.data || [];
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const mapped: AgentItem[] = list.map((a: any) => ({
            id: String(a.id || a.slug),
            name: a.name || "وكيل MaxP",
            role: a.role || "AGENT",
            slug: a.slug || a.template_slug || a.role?.toLowerCase(),
            icon: a.icon || "🤖",
            model: a.model || "DeepSeek-V3",
            departmentName: a.departmentName || a.department || "فريق الوكلاء",
            description: a.description || "وكيل ذكي مخصص لمنظومة المتجر",
            status: a.status || "ACTIVE",
          }));
          setAgents(mapped);
          setSelectedAgent((prev) => {
            const matched = mapped.find(
              (a) => a.id === prev.id || (a.slug && prev.slug && a.slug === prev.slug)
            );
            return matched || mapped[0];
          });
        }
      } catch (err) {
        console.warn("[AgentChatStudio] Could not fetch live agents, using default team squad:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Sessions Management
  const welcomeText = useMemo(() => {
    return `مرحباً بك! أنا **${selectedAgent.name}** (${selectedAgent.departmentName || "فريق الوكلاء"}).\n\n${selectedAgent.description || "أنا في خدمتك لمساعدتك في إنجاز المهام بدقة وسرعة."}\n\nاختر المنتج الذي ترغب بالعمل عليه من الأعلى أو اكتب أمرك مباشرة.`;
  }, [selectedAgent]);

  const {
    sessions,
    activeSession,
    totalCount,
    switchSession,
    createNewSession,
    deleteSession,
    appendUserMessage,
    appendAgentResponse,
    rewindActiveSession,
  } = useAgentStudioSessions({
    storagePrefix: `agent_chat_${selectedAgent.slug || selectedAgent.id}`,
    companyId,
    defaultWelcomeText: welcomeText,
  });

  // Handle Sending Message
  const handleSendMessage = useCallback(
    async (text: string, images?: string[]) => {
      if ((!text.trim() && (!images || images.length === 0)) || loading) return;

      appendUserMessage(text, images);
      setLoading(true);

      try {
        const isMarketing =
          selectedAgent.slug === "facebook-media-buyer-agent" ||
          selectedAgent.role === "MEDIA_BUYER" ||
          selectedAgent.slug?.includes("facebook");

        if (isMarketing) {
          const res = await apiClient.post("/facebook-ads/ai/chat", {
            message: text,
            threadId: activeSession.id,
            images,
            activeProduct: selectedProduct
              ? {
                  id: selectedProduct.id,
                  name: selectedProduct.name,
                  price: selectedProduct.price,
                  stock: selectedProduct.stock,
                }
              : undefined,
          });

          const reply = res.data?.reply || res.data?.message || "تم استلام الرد بنجاح.";
          const toolCalls = res.data?.tool_calls || res.data?.toolCalls || [];
          appendAgentResponse(reply, { toolCalls });
          if (res.data?.telemetry) {
            setTelemetry(res.data.telemetry);
          }
        } else {
          const res = await apiClient.post("/ai/chat/message", {
            message: text,
            sessionId: activeSession.id,
            agentId: selectedAgent.id,
            agentSlug: selectedAgent.slug,
            images,
          });

          const reply = res.data?.reply || res.data?.message || "تم استلام الرد بنجاح.";
          const toolCalls = res.data?.toolCalls || res.data?.tool_calls || [];
          appendAgentResponse(reply, { toolCalls });
          if (res.data?.telemetry || res.data?.modelSelection) {
            setTelemetry({
              model: res.data?.modelSelection?.model || selectedAgent.model,
              latency_ms: res.data?.telemetry?.latency_ms || 340,
            });
          }
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || "تعذر تلقي رد الوكيل.";
        appendAgentResponse(`⚠️ ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    },
    [loading, appendUserMessage, appendAgentResponse, selectedAgent, activeSession.id, selectedProduct]
  );

  // Filtered Agents for Drawer
  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const query = agentSearch.toLowerCase().trim();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.role.toLowerCase().includes(query) ||
        (a.departmentName && a.departmentName.toLowerCase().includes(query))
    );
  }, [agents, agentSearch]);

  const studioAgentInfo: StudioAgentInfo = {
    id: selectedAgent.id,
    name: selectedAgent.name,
    role: selectedAgent.role,
  };

  const selectedEntity: StudioEntity | null = selectedProduct
    ? {
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        stock: selectedProduct.stock,
        mainImage: selectedProduct.mainImage,
      }
    : null;

  return (
    <AgentStudioLayout
      studioId="agent-chat"
      title="محادثات الإيجنت"
      icon={Bot}
      connectionBadgeText="فريق العمل الذكي متصل"
      selectedEntity={selectedEntity}
      entitySelectorPlaceholder="اختر منتج السياق (اختياري)"
      onOpenEntityPicker={() => setIsProductPickerOpen(true)}
      sessionsCount={totalCount}
      onOpenSessions={() => setIsSessionsOpen(true)}
      onNewSession={createNewSession}
      onRewind={rewindActiveSession}
      canRewind={activeSession.messages.some((m) => m.sender === "user")}
      activeAgent={studioAgentInfo}
      agentRoutingHref="/admin/agent-profiles"
      statusBadge={
        <button
          type="button"
          onClick={() => setIsAgentDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs cursor-pointer"
          title="تبديل الوكيل النشط"
        >
          <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>فريق الوكلاء ({agents.length})</span>
        </button>
      }
      telemetryBadge={
        telemetry ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{telemetry.model || selectedAgent.model || "MaxP-Engine"}</span>
            {telemetry.latency_ms && <span>• {telemetry.latency_ms}ms</span>}
          </div>
        ) : null
      }
      chatPanel={
        <AgentStudioChatFeed
          selectedEntity={selectedEntity}
          activeSession={activeSession}
          loading={loading}
          onSendMessage={handleSendMessage}
          emptyStateTitle={`ابدأ المحادثة مع ${selectedAgent.name}`}
          emptyStateSubtitle={selectedAgent.description}
          emptyStateIcon={Bot}
          inputPlaceholder={`اكتب سؤالك أو أمرك لـ ${selectedAgent.name}...`}
          onNewSession={createNewSession}
        />
      }
      extraDrawers={
        <>
          {/* 1. Agent Fleet Selector Drawer */}
          {isAgentDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
              <div className="flex-1 cursor-pointer" onClick={() => setIsAgentDrawerOpen(false)} aria-hidden="true" />
              <aside className="w-full sm:w-[460px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">قائمة فريق الوكلاء</h2>
                      <p className="text-[11px] text-slate-500">اختر الوكيل للتحدث والعمل معه مباشرة</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAgentDrawerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      placeholder="ابحث عن وكيل بالاسم أو الدور..."
                      className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredAgents.map((agent) => {
                    const isCurrent = agent.id === selectedAgent.id;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setIsAgentDrawerOpen(false);
                        }}
                        className={`w-full text-right p-3 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                          isCurrent
                            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-slate-700">
                          {agent.icon || "🤖"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {agent.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white shrink-0">
                                النشط
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-1">
                            {agent.description}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>{agent.departmentName}</span>
                            <span>•</span>
                            <span>{agent.model || "DeepSeek-V3"}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}

          {/* 2. Product Opportunity Radar Drawer */}
          <ProductOpportunityRadar
            isOpen={isProductPickerOpen}
            onClose={() => setIsProductPickerOpen(false)}
            selectedProduct={selectedProduct}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setIsProductPickerOpen(false);
            }}
          />

          {/* 3. Sessions Drawer */}
          <AgentStudioSessionsDrawer
            isOpen={isSessionsOpen}
            onClose={() => setIsSessionsOpen(false)}
            sessions={sessions}
            activeSessionId={activeSession.id}
            onSelectSession={(sess) => {
              switchSession(sess.id);
              setIsSessionsOpen(false);
            }}
            onNewSession={() => {
              createNewSession();
              setIsSessionsOpen(false);
            }}
            onDeleteSession={(id) => deleteSession(id)}
          />
        </>
      }
    />
  );
};

export default AgentChatStudioPage;

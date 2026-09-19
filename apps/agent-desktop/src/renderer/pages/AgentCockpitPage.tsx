import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Camera,
  Sparkles,
  Rocket,
  CheckCircle2,
  Package,
  Users,
  ChevronDown,
  Settings,
  X,
  Undo2,
  Plus,
  Search,
  Check,
  FolderArchive,
} from 'lucide-react';
import { AgentInfo, StoreProduct, ChatMessage } from '../../shared/types';
import { DesktopSettingsModal } from '../components/DesktopSettingsModal';

interface AgentCockpitPageProps {
  user: any;
  onLogout: () => void;
}

export const AgentCockpitPage: React.FC<AgentCockpitPageProps> = ({ user, onLogout }) => {
  // 1. Agent Fleet State
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  // 2. Product Context State
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // 3. Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 4. Chat & Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [screenSnippet, setScreenSnippet] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Agents & Products on Mount
  useEffect(() => {
    loadAgents();
    loadProducts();
  }, []);

  const loadAgents = async () => {
    if (window.electronAPI?.getAgents) {
      const res = await window.electronAPI.getAgents();
      if (res?.success && Array.isArray(res.agents) && res.agents.length > 0) {
        setAgents(res.agents);
        const first = res.agents[0];
        setSelectedAgent(first);
        setMessages([
          {
            id: 'init-1',
            sender: 'agent',
            agentSlug: first.slug,
            text: `مرحباً بك في **MaxP Agent Studio** 🎯\nأنا **${first.name}** (${first.badge || 'فريق الوكلاء'})\n\n${first.description || 'أنا جاهز لمساعدتك في إدارة مهامك بكفاءة.'}\n\nاختر المنتج الذي ترغب بالعمل عليه من الأعلى أو اكتب أمرك مباشرة.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            telemetry: { model: first.model, latencyMs: 380, tokensUsed: 120 },
          },
        ]);
      }
    }
  };

  const loadProducts = async () => {
    if (window.electronAPI?.getProducts) {
      const res = await window.electronAPI.getProducts();
      if (res?.success && Array.isArray(res.products) && res.products.length > 0) {
        setProducts(res.products);
        setSelectedProduct(res.products[0]);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Capture Screen Context
  const handleCaptureScreen = async () => {
    if (window.electronAPI?.captureScreen) {
      const res = await window.electronAPI.captureScreen();
      if (res?.success && res.dataUrl) {
        setScreenSnippet(res.dataUrl);
      }
    }
  };

  // Switch Active Agent
  const handleSelectAgent = (agent: AgentInfo) => {
    setSelectedAgent(agent);
    setIsAgentDrawerOpen(false);
    setSessionCount((prev) => prev + 1);
    setMessages([
      {
        id: `agt-switch-${Date.now()}`,
        sender: 'agent',
        agentSlug: agent.slug,
        text: `تم تفعيل **${agent.name}** (${agent.badge || 'فريق الوكلاء'}).\n\n${agent.description || 'كيف يمكنني مساعدتك الآن؟'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        telemetry: { model: agent.model, latencyMs: 250 },
      },
    ]);
  };

  // New Session
  const handleNewSession = () => {
    if (!selectedAgent) return;
    setSessionCount((prev) => prev + 1);
    setMessages([
      {
        id: `sess-${Date.now()}`,
        sender: 'agent',
        agentSlug: selectedAgent.slug,
        text: `بدأت جلسة جديدة مع **${selectedAgent.name}**. كيف يمكنني مساعدتك؟`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Rewind Last Step
  const handleRewind = () => {
    setMessages((prev) => {
      const lastUserIdx = [...prev].reverse().findIndex((m) => m.sender === 'user');
      if (lastUserIdx === -1) return prev;
      const targetIdx = prev.length - 1 - lastUserIdx;
      return prev.slice(0, targetIdx);
    });
  };

  // Send Prompt to Agent
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending || !selectedAgent) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      screenContextSnippet: screenSnippet || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    const contextToPass = screenSnippet;
    setScreenSnippet(null);
    setIsSending(true);

    try {
      const res = await window.electronAPI.sendAgentMessage({
        agentSlug: selectedAgent.slug,
        agentId: selectedAgent.id,
        message: text,
        product: selectedProduct
          ? {
              id: selectedProduct.id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              stock: selectedProduct.stock,
              sku: selectedProduct.sku,
            }
          : undefined,
        productId: selectedProduct?.id,
        screenContext: contextToPass || undefined,
      });

      if (res?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `agt-${Date.now()}`,
            sender: 'agent',
            agentSlug: selectedAgent.slug,
            text: res.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            card: res.card,
            telemetry: res.telemetry,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'agent',
            agentSlug: selectedAgent.slug,
            text: res?.text || 'تعذر تلقي الرد من الوكيل حالياً. يرجى إعادة المحاولة.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          agentSlug: selectedAgent.slug,
          text: `تعذر الاتصال بالخادم: ${err.message || 'خطأ غير متوقع'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Publish Draft Action
  const handlePublishDraft = async (draftId: string) => {
    try {
      const res = await window.electronAPI.triggerAction({
        action: 'publish_meta_draft',
        payload: { draftId },
      });
      if (res?.success) {
        setActionSuccessMsg('تم إطلاق ونشر الحملة بنجاح إلى حساب إعلانات فيسبوك!');
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch {}
  };

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    (a.badge && a.badge.toLowerCase().includes(agentSearch.toLowerCase()))
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none overflow-hidden transition-colors" dir="rtl">
      {/* Top Ergonomic Unified Cockpit Header (Identical to Web Platform) */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md flex-shrink-0 z-10 transition-colors">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          {/* Brand & Connection Status */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                محادثات الإيجنت
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                متصل بالمتجر
              </span>
            </div>
          </div>

          {/* Central Controls: Entity Picker + Agent Team Switcher + Sessions */}
          <div className="flex items-center gap-2">
            {/* Product / Entity Picker */}
            <button
              type="button"
              onClick={() => setIsProductDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold shadow-xs cursor-pointer text-slate-800 dark:text-slate-200"
              title="تحديد منتج السياق النشط"
            >
              <Package className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="truncate max-w-[140px]">
                {selectedProduct ? selectedProduct.name : 'اختر المنتج'}
              </span>
              {selectedProduct?.price && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  {selectedProduct.price} ج.م
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Agent Team Switcher */}
            <button
              type="button"
              onClick={() => setIsAgentDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-xs cursor-pointer"
              title="استعراض وتبديل فريق الوكلاء كاملاً"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate max-w-[130px]">
                {selectedAgent?.name || 'فريق الوكلاء'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold tabular-nums">
                {agents.length}
              </span>
              <ChevronDown className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
            </button>

            {/* Rewind */}
            <button
              type="button"
              onClick={handleRewind}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="تراجع عن آخر خطوة"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xl:inline">تراجع</span>
            </button>

            {/* New Session */}
            <button
              type="button"
              onClick={handleNewSession}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition text-xs font-bold shadow-xs cursor-pointer"
              title="بدء جلسة جديدة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جلسة جديدة</span>
            </button>
          </div>

          {/* Right Status / Telemetry & Desktop Settings Button */}
          <div className="flex items-center gap-2">
            {selectedAgent && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{selectedAgent.model}</span>
                <span>• SLA &lt; 0.8s</span>
              </div>
            )}

            {/* Desktop Settings Gear Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              title="إعدادات برنامج الديسكتوب والمظهر"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Feed Workspace */}
      <main className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-4xl w-full mx-auto">
          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {msg.sender === 'user' ? '👤' : selectedAgent?.icon || '🤖'}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-xs'
                }`}
              >
                {/* User Snippet Attachment if exists */}
                {msg.screenContextSnippet && (
                  <div className="mb-2 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-white/10">
                    <img
                      src={msg.screenContextSnippet}
                      alt="Screen Snippet"
                      className="max-h-28 rounded object-cover"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">سياق الشاشة الملتقط</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Campaign Draft Action Card if generated */}
                {msg.card?.type === 'CAMPAIGN_DRAFT' && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300">مسودة حملة ميتا جاهزة</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-bold">
                        {msg.card.data.budgetAmount} ج.م / يوم
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 dark:text-slate-300 font-bold">{msg.card.data.headline}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">الاستهداف: {msg.card.data.targetAudience}</p>
                    <button
                      type="button"
                      onClick={() => handlePublishDraft(msg.card?.data.draftId)}
                      className="w-full mt-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>نشر الحملة في فيسبوك الآن (1-Click Launch)</span>
                    </button>
                  </div>
                )}

                <div className="mt-1 text-[10px] opacity-60 flex items-center justify-between gap-3">
                  <span>{msg.timestamp}</span>
                  {msg.telemetry && <span>{msg.telemetry.model}</span>}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm text-indigo-600 dark:text-indigo-400">
                {selectedAgent?.icon || '🤖'}
              </div>
              <div className="rounded-2xl rounded-tl-none p-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span>جاري معالجة الطلب واستدعاء أدوات الوكيل...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Attached screen snippet banner */}
            {screenSnippet && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>تم التقاط لقطة من الشاشة الحية ومرفقة بالسياق</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenSnippet(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={handleCaptureScreen}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                title="التقاط الشاشة الحية ودمجها بالسياق (Vision)"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`اكتب أمرك لـ ${selectedAgent?.name || 'الوكيل'}...`}
                className="flex-1 py-2 px-3 text-xs sm:text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── DRAWERS ─────────────────────────────────────────────────── */}

      {/* 1. Complete Agent Fleet Drawer */}
      {isAgentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1 cursor-pointer" onClick={() => setIsAgentDrawerOpen(false)} aria-hidden="true" />
          <aside className="w-full sm:w-[460px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">قائمة فريق الوكلاء كاملة</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">اختر الوكيل للتحدث والتنفيذ المباشر</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                  placeholder="ابحث عن وكيل بالاسم أو القسم..."
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredAgents.map((agent) => {
                const isCurrent = agent.id === selectedAgent?.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => handleSelectAgent(agent)}
                    className={`w-full text-right p-3 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-200 dark:border-slate-700">
                      {agent.icon || '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{agent.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white shrink-0">
                            النشط
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mb-1">{agent.description}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <span>{agent.badge || 'فريق الوكلاء'}</span>
                        <span>•</span>
                        <span>{agent.model}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* 2. Product Picker Drawer */}
      {isProductDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1 cursor-pointer" onClick={() => setIsProductDrawerOpen(false)} aria-hidden="true" />
          <aside className="w-full sm:w-[460px] max-w-full h-full bg-white dark:bg-slate-900 border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">كتالوج منتجات المتجر</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">اختر المنتج لربطه بالسياق</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج بالاسم أو SKU..."
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(prod);
                    setIsProductDrawerOpen(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    selectedProduct?.id === prod.id
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{prod.name}</span>
                      {prod.sku && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">SKU: {prod.sku}</span>}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">{prod.price} ج.م</span>
                    {typeof prod.stock === 'number' && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">متبقي: {prod.stock}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* 3. Desktop Settings Modal */}
      <DesktopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onLogout={onLogout}
      />
    </div>
  );
};

export default AgentCockpitPage;

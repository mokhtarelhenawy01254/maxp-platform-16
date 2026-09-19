import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Camera,
  Sparkles,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Package,
  Layers,
  ChevronDown,
  Activity,
  Flame,
  Volume2,
  Video,
  X,
  ExternalLink,
} from 'lucide-react';
import { AgentInfo, StoreProduct, ChatMessage } from '../../shared/types';

interface AgentCockpitPageProps {
  user: any;
  onLogout: () => void;
}

export const AgentCockpitPage: React.FC<AgentCockpitPageProps> = ({ user, onLogout }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [screenSnippet, setScreenSnippet] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

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
        setSelectedAgent(res.agents[0]);
        // Initial welcome message from the active agent
        setMessages([
          {
            id: 'init-1',
            sender: 'agent',
            agentSlug: res.agents[0].slug,
            text: `مرحباً بك في **MaxP Agent Studio** 🎯\nأنا **${res.agents[0].name}** جاهز لمساعدتك في تحليل الحملات، استهداف المحافظات المصرية، وتوليد مسودات الإعلانات.\n\nاختر المنتج الذي ترغب بالعمل عليه من الأعلى أو اكتب أمرك مباشرة.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            telemetry: { model: res.agents[0].model, latencyMs: 380, tokensUsed: 140 },
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
        message: text,
        productId: selectedProduct?.id,
        screenContext: contextToPass || undefined,
      });

      if (res?.success) {
        const agentMsg: ChatMessage = {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          agentSlug: selectedAgent.slug,
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          card: res.card,
          telemetry: res.telemetry,
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: 'تعذر تلقي الرد من الوكيل حالياً. يرجى إعادة المحاولة.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerCardAction = async (action: string, payload: any) => {
    if (window.electronAPI?.triggerAction) {
      const res = await window.electronAPI.triggerAction({ action, payload });
      if (res?.success) {
        setActionSuccessMsg(res.message || 'تم تطبيق الإجراء بنجاح في المنصة!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-36px)] bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Unified Control Bar (Ergonomic Single-Surface Cockpit) */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md flex-shrink-0">
        {/* Left: Agent & Product Selectors */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          {/* Active Agent Dropdown */}
          <div className="relative flex items-center">
            <select
              value={selectedAgent?.slug || ''}
              onChange={(e) => {
                const found = agents.find((a) => a.slug === e.target.value);
                if (found) {
                  setSelectedAgent(found);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `sw-${Date.now()}`,
                      sender: 'system',
                      text: `تم التبديل إلى وكيل: ${found.name}`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }
              }}
              className="bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-bold py-1.5 px-3 rounded-xl border border-white/10 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {agents.map((ag) => (
                <option key={ag.slug} value={ag.slug}>
                  {ag.icon} {ag.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 pointer-events-none text-slate-400" />
          </div>

          {/* Product Selector */}
          <div className="relative flex items-center">
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) setSelectedProduct(prod);
              }}
              className="bg-slate-900 text-slate-300 text-xs py-1.5 px-3 rounded-xl border border-slate-800 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  📦 {p.name} ({p.price} ج.م)
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 pointer-events-none text-slate-500" />
          </div>
        </div>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-3">
          {/* Active Model Telemetry */}
          {selectedAgent && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>{selectedAgent.model}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">P95 &lt; 0.6s</span>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center animate-in slide-in-from-top flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label & Timestamp */}
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-500">
              {msg.sender === 'agent' && (
                <span className="font-bold text-indigo-400 flex items-center gap-1">
                  <span>{selectedAgent?.name || 'MaxP Agent'}</span>
                  {msg.telemetry?.model && (
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 border border-slate-800 rounded text-slate-400">
                      {msg.telemetry.model}
                    </span>
                  )}
                </span>
              )}
              {msg.sender === 'user' && <span className="font-medium text-slate-400">أنت</span>}
              {msg.sender === 'system' && <span className="text-slate-500 italic">نظام المنصة</span>}
              <span className="text-[10px] font-mono">{msg.timestamp}</span>
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : msg.sender === 'system'
                  ? 'bg-slate-900/60 border border-slate-800 text-slate-400 text-center mx-auto text-xs py-2'
                  : 'bg-slate-900 border border-white/10 text-slate-200 shadow-sm'
              }`}
            >
              {/* Attached Screen Context Thumbnail if sent */}
              {msg.screenContextSnippet && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/15 max-w-xs">
                  <div className="text-[10px] bg-slate-950 px-2 py-1 text-slate-400 font-mono flex items-center gap-1">
                    <Camera size={11} />
                    <span>سياق الشاشة الملتقط</span>
                  </div>
                  <img
                    src={msg.screenContextSnippet}
                    alt="Screen Context"
                    className="w-full h-auto object-cover max-h-36"
                  />
                </div>
              )}

              {/* Text content with clean markdown spacing */}
              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

              {/* Generative UI Action Cards */}
              {msg.card && msg.card.type === 'CAMPAIGN_DRAFT' && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                      <Rocket size={13} />
                      <span>مسودة حملة Meta Graph API v21</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-bold">
                      LOWEST_COST
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                    <div>
                      <span className="text-slate-500">العنوان: </span>
                      <span className="font-semibold text-white">{msg.card.data.headline}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">الميزانية اليومية: </span>
                      <span className="font-mono text-emerald-400 font-bold tabular-nums">
                        {msg.card.data.budgetAmount} ج.م
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">الاستهداف: </span>
                      <span>{msg.card.data.targetAudience}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerCardAction('publish_meta_draft', msg.card?.data)
                    }
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Rocket size={13} />
                    <span>نشر المسودة فوراً على الحساب الإعلاني</span>
                  </button>
                </div>
              )}

              {msg.card && msg.card.type === 'ORDER_ALERT' && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <Package size={13} />
                      <span>تأكيد أوردرات الدفع عند الاستلام (COD)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {msg.card.data.carrier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mb-3">
                    يوجد <span className="font-bold text-amber-400">{msg.card.data.pendingCount} أوردرات</span> معلقة بقيمة إجمالية{' '}
                    <span className="font-mono text-white font-bold">{msg.card.data.estimatedTotal} ج.م</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerCardAction('trigger_order_confirmations', msg.card?.data)
                    }
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-600/20"
                  >
                    <CheckCircle2 size={13} />
                    <span>إرسال رسائل تأكيد الواتساب الآن</span>
                  </button>
                </div>
              )}

              {msg.card && msg.card.type === 'VIDEO_PREVIEW' && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 text-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                      <Video size={13} />
                      <span>توليد فيديو ريلز إعلاني بـ Google Veo 3.1</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 flex items-center gap-1">
                      <Volume2 size={11} />
                      <span>صوت متزامن</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mb-3">
                    المقاس: <span className="font-mono text-white">1080x1920 (9:16)</span> • مدعوم بتعليق صوتي تسويقي مصري
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleTriggerCardAction('generate_veo_reel', {
                        productId: selectedProduct?.id,
                        productName: selectedProduct?.name,
                      })
                    }
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/20"
                  >
                    <Sparkles size={13} />
                    <span>بدء التوليد عبر Gemini API (Veo 3.1)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 px-2 py-1">
            <span className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span>الوكيل يحلل البيانات ويصيغ التوصية...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="px-4 py-2 border-t border-white/5 bg-slate-950/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">مقترحات:</span>
        <button
          type="button"
          onClick={() => handleSendMessage('حلل أداء حملات اليوم وROAS واقترح تعديل الميزانية')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
        >
          🎯 تحليل ROAS والميزانية
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('اقترح زاوية إعلانية ومسودة إعلان كاملة لهذا المنتج')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
        >
          📝 مسودة إعلان Meta
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('ما هي الأوردرات المعلقة التي تحتاج تأكيد قبل شحن تيربو؟')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
        >
          📦 أوردرات الـ COD المعلقة
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('ولد فيديو ريلز 9:16 بـ Veo 3.1 لهذا المنتج')}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
        >
          🎬 إعلان ريلز Veo 3.1
        </button>
      </div>

      {/* Bottom Action & Input Bar */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-md">
        {/* Screen Snippet Preview Tag if captured */}
        {screenSnippet && (
          <div className="mb-2 flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Camera size={14} />
              <span>تم التقاط الشاشة الحالية — سيتم إرسالها كـ Vision Context مع سؤالك</span>
            </div>
            <button
              type="button"
              onClick={() => setScreenSnippet(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Capture Screen Context Button */}
          <button
            type="button"
            onClick={handleCaptureScreen}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              screenSnippet
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                : 'bg-slate-800 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="التقاط لقطة شاشة وتحليلها بالرؤية الذكية"
          >
            <Camera size={16} />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`اطلب من ${selectedAgent?.name || 'الوكيل'} (مثلاً: حلل الـ ROAS، أو صيغ إعلان)...`}
              className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default AgentCockpitPage;

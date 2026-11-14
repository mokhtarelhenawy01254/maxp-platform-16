import React, { useState } from 'react';
import { EducationFlowTopBar } from './education-flows/EducationFlowTopBar';
import { EducationFlowCanvas } from './education-flows/EducationFlowCanvas';
import { EducationFlowsListView } from './education-flows/EducationFlowsListView';
import { EducationNodeInspectorDrawer } from './education-flows/EducationNodeInspectorDrawer';
import { EducationFlowTestModal } from './education-flows/EducationFlowTestModal';
import { FLOW_NODES, FLOW_RECORDS, SUB_JOURNEYS } from './education-flows/constants';
import type {
  FlowCategory,
  EducationFlowRecord,
  CanvasNodeData,
  EducationChannelType,
  FlowMessageButton,
  FlowNodeType,
} from './education-flows/types';
import { X, Plus, Sparkles, Workflow } from 'lucide-react';

export default function EducationFlowsPage() {
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [activeCategory, setActiveCategory] = useState<FlowCategory>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);

  // Flows list state
  const [flows, setFlows] = useState<EducationFlowRecord[]>(FLOW_RECORDS);
  // Nodes state for the canvas
  const [nodes, setNodes] = useState<CanvasNodeData[]>(FLOW_NODES);

  // New flow form state
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowCategory, setNewFlowCategory] = useState<FlowCategory>('demo_booking');
  const [newFlowChannel, setNewFlowChannel] = useState<EducationChannelType>('WHATSAPP_WABA');

  const currentJourney =
    SUB_JOURNEYS.find((j) => j.id === activeCategory) || SUB_JOURNEYS[0];

  const visibleNodes = nodes.filter((n) => currentJourney.nodeIds.includes(n.id));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.4, prev + 0.15));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.65, prev - 0.15));
  const handleZoomReset = () => setZoomLevel(1);

  const handleToggleFlow = (flowId: string) => {
    setFlows((prev) =>
      prev.map((f) => (f.id === flowId ? { ...f, isEnabled: !f.isEnabled } : f))
    );
  };

  const handleOpenCanvas = (flowId: string, category: FlowCategory) => {
    setActiveCategory(category);
    setViewMode('canvas');
  };

  const handleSaveNode = (
    nodeId: string,
    updated: {
      text: string;
      channel?: EducationChannelType;
      buttons?: FlowMessageButton[];
    }
  ) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          messageText: n.type === 'message' ? updated.text : n.messageText,
          delayDetail: n.type === 'delay' ? updated.text : n.delayDetail,
          channel: updated.channel || n.channel,
          buttons: updated.buttons || n.buttons,
        };
      })
    );
  };

  const handleAddStep = (afterIndex: number, stepType: FlowNodeType) => {
    const targetNode = visibleNodes[afterIndex];
    if (!targetNode) return;

    const newNodeId = `node-custom-${Date.now()}`;
    let newNode: CanvasNodeData;

    if (stepType === 'message') {
      newNode = {
        id: newNodeId,
        type: 'message',
        title: 'رسالة محادثة جديدة',
        channel: 'WHATSAPP_WABA',
        windowPolicy: 'INSIDE_24H',
        messageText: 'مرحباً بحضرتك 🌸\nنص الرسالة الجديد لـ {studentName}...',
        buttons: [{ id: `btn-${Date.now()}`, label: 'تأكيد واستمرار' }],
        category: activeCategory,
        stats: { enteredCount: 0, deliveredCount: 0, responseRate: 0 },
      };
    } else if (stepType === 'delay') {
      newNode = {
        id: newNodeId,
        type: 'delay',
        title: 'تأخير زمني مخصص',
        delayText: 'انتظار 2 ساعة',
        delayDetail: 'يتم تشغيل الخطوة التالية تلقائياً بعد مرور ساعتين من وصول الرسالة السابقة',
        category: activeCategory,
      };
    } else if (stepType === 'condition') {
      newNode = {
        id: newNodeId,
        type: 'condition',
        title: 'شرط وتفرع ذكي جديد',
        conditionQuestion: 'فحص استجابة ولي الأمر خلال 12 ساعة',
        branches: {
          yes: { label: 'نعم: تفاعل مع الرسالة', targetId: '' },
          no: { label: 'لا: لم يستجب', targetId: '' },
        },
        category: activeCategory,
      };
    } else {
      newNode = {
        id: newNodeId,
        type: 'action',
        title: 'إجراء مالي: توليد رابط دفع',
        subtitle: 'إنشاء فاتورة إلكترونية بنقرة واحدة وإرسالها لولي الأمر',
        category: activeCategory,
      };
    }

    // Insert into global nodes array and update current journey
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === targetNode.id);
      if (idx === -1) return [...prev, newNode];
      const next = [...prev];
      next.splice(idx + 1, 0, newNode);
      return next;
    });

    currentJourney.nodeIds.push(newNodeId);
    setSelectedNodeId(newNodeId);
  };

  const handleCreateNewFlow = () => {
    if (!newFlowName.trim()) return;

    const newRecord: EducationFlowRecord = {
      id: `flow-${Date.now()}`,
      name: newFlowName.trim(),
      description: 'مسار آلي تعليمي مخصص تم إنشاؤه بواسطة المركز',
      category: newFlowCategory,
      triggerEvent: 'education_custom_trigger',
      triggerLabel: 'مشغل مخصص',
      isEnabled: true,
      channels: [newFlowChannel],
      totalEnrolled: 0,
      deliveryRate: 100,
      responseRate: 0,
      nodeCount: 2,
      updatedAt: 'الآن',
    };

    setFlows((prev) => [newRecord, ...prev]);
    setIsNewFlowModalOpen(false);
    setNewFlowName('');
    setActiveCategory(newFlowCategory);
    setViewMode('canvas');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* 1. Customer.io / ManyChat Style Top Control Bar */}
      <EducationFlowTopBar
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        currentFlowTitle={currentJourney.name}
      />

      {/* 2. Main Content: Flows Directory (List) or Visual Canvas (Builder) */}
      {viewMode === 'list' ? (
        <EducationFlowsListView
          flows={flows}
          onOpenCanvas={handleOpenCanvas}
          onToggleFlow={handleToggleFlow}
          onOpenNewFlowModal={() => setIsNewFlowModalOpen(true)}
          onOpenTestModal={() => setIsTestModalOpen(true)}
        />
      ) : (
        <EducationFlowCanvas
          nodes={visibleNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => setSelectedNodeId((prev) => (prev === id ? null : id))}
          onAddStep={handleAddStep}
          zoomLevel={zoomLevel}
        />
      )}

      {/* 3. Node Details Inspector Drawer */}
      <EducationNodeInspectorDrawer
        node={selectedNode}
        isOpen={Boolean(selectedNodeId)}
        onClose={() => setSelectedNodeId(null)}
        onSaveNode={handleSaveNode}
      />

      {/* 4. Real WhatsApp Live Test Sender */}
      <EducationFlowTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* 5. Create New Flow Modal */}
      {isNewFlowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Workflow className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">إنشاء مسار أتمتة جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewFlowModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  اسم المسار التعليمي:
                </label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="مثال: مسار ورشة الروبوتكس واستعادة المهتمين"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  تصنيف المرحلة التعليمية:
                </label>
                <select
                  value={newFlowCategory}
                  onChange={(e) => setNewFlowCategory(e.target.value as FlowCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="demo_booking">حجز الديمو داي وورش العمل</option>
                  <option value="attendance">تذكيرات الحضور ومعالجة الغياب</option>
                  <option value="enrollment">تقييم المستوى والاشتراك</option>
                  <option value="retention">متابعة الحصص وتجديد الساعات</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  القناة الافتراضية للبدء:
                </label>
                <select
                  value={newFlowChannel}
                  onChange={(e) => setNewFlowChannel(e.target.value as EducationChannelType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="WHATSAPP_WABA">واتساب رسمي معتمد (Meta Cloud API)</option>
                  <option value="WHATSAPP_BAILEYS">واتساب ويب عادي (Baileys QR)</option>
                  <option value="FACEBOOK_MESSENGER">فيسبوك ماسنجر (Facebook Page)</option>
                  <option value="INSTAGRAM_DIRECT">إنستجرام دايركت (Instagram DM)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewFlowModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateNewFlow}
                disabled={!newFlowName.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                إنشاء وفتح الكانفاس
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { EducationFlowTopBar } from './education-flows/EducationFlowTopBar';
import { EducationFlowCanvas } from './education-flows/EducationFlowCanvas';
import { EducationNodeInspectorDrawer } from './education-flows/EducationNodeInspectorDrawer';
import { EducationFlowTestModal } from './education-flows/EducationFlowTestModal';
import { FLOW_NODES } from './education-flows/constants';
import type { FlowCategory } from './education-flows/types';

export default function EducationFlowsPage() {
  const [activeCategory, setActiveCategory] = useState<FlowCategory>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const selectedNode = FLOW_NODES.find((n) => n.id === selectedNodeId) || null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.4, prev + 0.15));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.65, prev - 0.15));
  const handleZoomReset = () => setZoomLevel(1);

  const handleSaveNodeText = (nodeId: string, updatedText: string) => {
    const target = FLOW_NODES.find((n) => n.id === nodeId);
    if (target) {
      if (target.type === 'message') target.messageText = updatedText;
      if (target.type === 'delay') target.delayDetail = updatedText;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* 1. Customer.io / ManyChat Style Top Control Bar */}
      <EducationFlowTopBar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      {/* 2. Visual Dot-Grid Workflow Canvas */}
      <EducationFlowCanvas
        activeCategory={activeCategory}
        selectedNodeId={selectedNodeId}
        onSelectNode={(id) => setSelectedNodeId((prev) => (prev === id ? null : id))}
        zoomLevel={zoomLevel}
      />

      {/* 3. Node Details Inspector Drawer */}
      <EducationNodeInspectorDrawer
        node={selectedNode}
        isOpen={Boolean(selectedNodeId)}
        onClose={() => setSelectedNodeId(null)}
        onSaveNodeText={handleSaveNodeText}
      />

      {/* 4. Real WhatsApp Live Test Sender */}
      <EducationFlowTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}

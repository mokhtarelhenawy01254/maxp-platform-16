import React, { useState } from 'react';
import { EducationFlowNodeCard } from './EducationFlowNodeCard';
import type { CanvasNodeData, FlowCategory } from './types';
import { FLOW_NODES, SUB_JOURNEYS } from './constants';
import { ArrowDown } from 'lucide-react';

interface EducationFlowCanvasProps {
  activeCategory: FlowCategory;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  zoomLevel: number;
}

export const EducationFlowCanvas: React.FC<EducationFlowCanvasProps> = ({
  activeCategory,
  selectedNodeId,
  onSelectNode,
  zoomLevel,
}) => {
  const currentJourney =
    SUB_JOURNEYS.find((j) => j.id === activeCategory) || SUB_JOURNEYS[0];

  const visibleNodes = FLOW_NODES.filter((n) =>
    currentJourney.nodeIds.includes(n.id)
  );

  return (
    <div className="relative flex-1 w-full min-h-[calc(100vh-140px)] overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 sm:p-12">
      {/* Customer.io & n8n Style Dot-Grid Canvas Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Scaled Flow Surface */}
      <div
        className="relative mx-auto max-w-4xl transition-transform duration-200 origin-top flex flex-col items-center gap-6"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {visibleNodes.map((node, index) => {
          const isCondition = node.type === 'condition';
          const isLast = index === visibleNodes.length - 1;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div className="w-full relative z-10">
                <EducationFlowNodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={onSelectNode}
                />
              </div>

              {/* Bézier Style Connector Line / Arrow */}
              {!isLast && (
                <div className="flex flex-col items-center justify-center -my-2 relative z-0">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary/60 to-primary/30" />
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-primary/40 flex items-center justify-center text-primary shadow-xs">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-0.5 h-8 bg-gradient-to-b from-primary/30 to-primary/60" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

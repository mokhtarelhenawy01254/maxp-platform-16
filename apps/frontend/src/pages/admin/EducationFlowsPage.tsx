import React from 'react';
import {
  useEducationFlowsController,
  EducationFlowHeader,
  EducationSubFlowSelector,
  EducationFlowVisualCanvas,
  EducationFlowToolMatrix,
  EducationFlowSimulatorDrawer,
  EducationFlowSettingsDrawer,
} from './education-flows';

export default function EducationFlowsPage() {
  const {
    activeSubFlowId,
    activeSubFlow,
    selectedChannel,
    setSelectedChannel,
    selectedNodeId,
    handleSelectSubFlow,
    handleSelectNode,
    // Simulator
    isSimulatorOpen,
    setIsSimulatorOpen,
    selectedScenarioId,
    setSelectedScenarioId,
    selectedScenario,
    isSimulating,
    simulationCurrentStep,
    simulationFinished,
    handleStartSimulation,
    handleResetSimulation,
    // Settings
    settings,
    setSettings,
    isSettingsDrawerOpen,
    setIsSettingsDrawerOpen,
    isSavingSettings,
    saveSuccessMessage,
    handleSaveSettings,
    // Data
    toolsMatrix,
    allSubFlows,
    allScenarios,
  } = useEducationFlowsController();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Header & Channels */}
      <EducationFlowHeader
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSettings={() => setIsSettingsDrawerOpen(true)}
      />

      {/* Sub-Flow Selector Tabs */}
      <EducationSubFlowSelector
        subFlows={allSubFlows}
        activeSubFlowId={activeSubFlowId}
        onSelectSubFlow={handleSelectSubFlow}
      />

      {/* Main Flow Canvas */}
      <div className="flex-1 overflow-y-auto">
        <EducationFlowVisualCanvas
          subFlow={activeSubFlow}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
        />

        {/* Integrated Multi-Tool Registry */}
        <EducationFlowToolMatrix tools={toolsMatrix} />
      </div>

      {/* Interactive Simulator Slide-Over */}
      <EducationFlowSimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        scenarios={allScenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={setSelectedScenarioId}
        scenario={selectedScenario}
        isSimulating={isSimulating}
        currentStep={simulationCurrentStep}
        isFinished={simulationFinished}
        onStartSimulation={handleStartSimulation}
        onResetSimulation={handleResetSimulation}
      />

      {/* Settings & Policy Drawer */}
      <EducationFlowSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        settings={settings}
        onChangeSettings={setSettings}
        onSave={handleSaveSettings}
        isSaving={isSavingSettings}
        successMessage={saveSuccessMessage}
      />
    </div>
  );
}

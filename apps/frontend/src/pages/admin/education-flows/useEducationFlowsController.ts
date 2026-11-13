import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  FlowSubId,
  ChannelType,
  SimulatorScenario,
  EducationFlowSettings,
  FlowNode,
} from './types';
import {
  SUB_FLOWS,
  DEFAULT_FLOW_SETTINGS,
  SIMULATOR_SCENARIOS,
  FLOW_TOOLS_MATRIX,
} from './constants';
import { buildApiUrl } from '../../../utils/urlHelper';
import {
  getCompanyId as getEducationCompanyId,
  getAuthHeaders as getEducationAuthHeaders,
} from '../education-management/api';

export function useEducationFlowsController() {
  const [activeSubFlowId, setActiveSubFlowId] = useState<FlowSubId>('acquisition');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<EducationFlowSettings>(DEFAULT_FLOW_SETTINGS);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SIMULATOR_SCENARIOS[0].id);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCurrentStep, setSimulationCurrentStep] = useState<number>(0);
  const [simulationFinished, setSimulationFinished] = useState(false);

  // Fetch initial education settings (to sync pushFirstSaveWhatsApp, etc.)
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const companyId = getEducationCompanyId();
        const base = buildApiUrl('education/settings');
        const url = new URL(base, window.location.origin);
        if (companyId) url.searchParams.set('companyId', companyId);

        const res = await fetch(url.toString(), {
          headers: getEducationAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setSettings((prev) => ({
              ...prev,
              pushFirstSaveWhatsApp: json.data.pushFirstSaveWhatsApp !== false,
            }));
          }
        }
      } catch (err) {
        // fail-soft
        console.warn('[EducationFlows] Settings fetch warning:', err);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSubFlow = useMemo(() => {
    return SUB_FLOWS.find((f) => f.id === activeSubFlowId) || SUB_FLOWS[0];
  }, [activeSubFlowId]);

  const activeNode = useMemo<FlowNode | null>(() => {
    if (!selectedNodeId) return null;
    return activeSubFlow.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, activeSubFlow]);

  const selectedScenario = useMemo<SimulatorScenario>(() => {
    return (
      SIMULATOR_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
      SIMULATOR_SCENARIOS[0]
    );
  }, [selectedScenarioId]);

  const handleSelectSubFlow = useCallback((id: FlowSubId) => {
    setActiveSubFlowId(id);
    setSelectedNodeId(null);
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  // Simulator runner
  const handleStartSimulation = useCallback(() => {
    setIsSimulating(true);
    setSimulationCurrentStep(0);
    setSimulationFinished(false);

    const steps = selectedScenario.traceSteps;
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setSimulationCurrentStep(current);

      if (current >= steps.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationFinished(true);
      }
    }, 700);
  }, [selectedScenario]);

  const handleResetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimulationCurrentStep(0);
    setSimulationFinished(false);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    setSaveSuccessMessage(null);
    try {
      const companyId = getEducationCompanyId();
      const base = buildApiUrl('education/settings');
      const url = new URL(base, window.location.origin);
      if (companyId) url.searchParams.set('companyId', companyId);

      await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getEducationAuthHeaders(),
        },
        body: JSON.stringify({
          pushFirstSaveWhatsApp: settings.pushFirstSaveWhatsApp,
        }),
      });

      setSaveSuccessMessage('تم حفظ سياسات وإعدادات المسار بنجاح');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err) {
      console.error('[EducationFlows] Failed to save settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  }, [settings]);

  return {
    activeSubFlowId,
    activeSubFlow,
    selectedChannel,
    setSelectedChannel,
    selectedNodeId,
    activeNode,
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
    // Tools list
    toolsMatrix: FLOW_TOOLS_MATRIX,
    allSubFlows: SUB_FLOWS,
    allScenarios: SIMULATOR_SCENARIOS,
  };
}

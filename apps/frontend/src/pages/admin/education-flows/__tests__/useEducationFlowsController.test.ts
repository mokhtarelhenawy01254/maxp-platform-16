// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEducationFlowsController } from '../useEducationFlowsController';
import { SUB_FLOWS, SIMULATOR_SCENARIOS, FLOW_TOOLS_MATRIX } from '../constants';

describe('useEducationFlowsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default acquisition sub-flow and 4 sub-flows', () => {
    const { result } = renderHook(() => useEducationFlowsController());

    expect(result.current.activeSubFlowId).toBe('acquisition');
    expect(result.current.activeSubFlow.id).toBe('acquisition');
    expect(result.current.allSubFlows.length).toBe(4);
    expect(result.current.toolsMatrix.length).toBe(8);
  });

  it('switches sub-flows cleanly and resets node selection', () => {
    const { result } = renderHook(() => useEducationFlowsController());

    act(() => {
      result.current.handleSelectNode('acq-1');
    });
    expect(result.current.selectedNodeId).toBe('acq-1');

    act(() => {
      result.current.handleSelectSubFlow('attendance');
    });
    expect(result.current.activeSubFlowId).toBe('attendance');
    expect(result.current.selectedNodeId).toBeNull();
  });

  it('allows toggling node selection', () => {
    const { result } = renderHook(() => useEducationFlowsController());

    act(() => {
      result.current.handleSelectNode('acq-2');
    });
    expect(result.current.selectedNodeId).toBe('acq-2');
    expect(result.current.activeNode?.id).toBe('acq-2');

    // Clicking again deselects
    act(() => {
      result.current.handleSelectNode('acq-2');
    });
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.activeNode).toBeNull();
  });

  it('switches simulation scenario and resets state', () => {
    const { result } = renderHook(() => useEducationFlowsController());

    const secondScenario = SIMULATOR_SCENARIOS[1];
    act(() => {
      result.current.setSelectedScenarioId(secondScenario.id);
    });

    expect(result.current.selectedScenario.id).toBe(secondScenario.id);
    expect(result.current.selectedScenario.expectedFlowId).toBe('attendance');
  });

  it('handles simulation lifecycle (start, tick, reset)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEducationFlowsController());

    act(() => {
      result.current.handleStartSimulation();
    });

    expect(result.current.isSimulating).toBe(true);
    expect(result.current.simulationCurrentStep).toBe(0);

    // Fast-forward 1 step
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(result.current.simulationCurrentStep).toBe(1);

    // Reset
    act(() => {
      result.current.handleResetSimulation();
    });
    expect(result.current.isSimulating).toBe(false);
    expect(result.current.simulationCurrentStep).toBe(0);

    vi.useRealTimers();
  });
});

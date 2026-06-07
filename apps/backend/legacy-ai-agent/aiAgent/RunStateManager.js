/**
 * RunStateManager: Manages agent run lifecycle with pause/resume support.
 * States: PENDING -> RUNNING -> PAUSED (awaiting_approval) -> RUNNING -> COMPLETED/ERROR
 */
const crypto = require('crypto');

const RunState = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  PAUSED_APPROVAL: 'PAUSED_APPROVAL',
  PAUSED_INPUT: 'PAUSED_INPUT',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
};

class RunStateManager {
  constructor() {
    this._runs = new Map(); // runId -> runState
  }

  createRun({ agentId, companyId, task, context = {} }) {
    const runId = `run_${crypto.randomUUID()}`;
    const run = {
      id: runId,
      agentId,
      companyId,
      task,
      context,
      state: RunState.PENDING,
      events: [],
      toolCalls: [],
      pendingApprovals: [],
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumedAt: null,
      completedAt: null,
    };
    this._runs.set(runId, run);
    return run;
  }

  startRun(runId) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    run.state = RunState.RUNNING;
    run.updatedAt = Date.now();
    return run;
  }

  pauseForApproval(runId, { toolName, params, reason, approvalType = 'ALWAYS' }) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.state = RunState.PAUSED_APPROVAL;
    run.updatedAt = Date.now();

    const approvalId = `approval_${crypto.randomUUID()}`;
    const approval = {
      id: approvalId,
      toolName,
      params,
      reason,
      approvalType,
      status: 'PENDING',
      createdAt: Date.now(),
    };
    run.pendingApprovals.push(approval);

    return { run, approval };
  }

  pauseForInput(runId, { question, fieldName }) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.state = RunState.PAUSED_INPUT;
    run.updatedAt = Date.now();
    run.pendingInput = { question, fieldName, status: 'PENDING' };

    return run;
  }

  resumeRun(runId, decision = {}) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    if (![RunState.PAUSED_APPROVAL, RunState.PAUSED_INPUT].includes(run.state)) {
      throw new Error(`Run ${runId} is not paused. Current state: ${run.state}`);
    }

    run.state = RunState.RUNNING;
    run.resumedAt = Date.now();
    run.updatedAt = Date.now();
    run.humanDecision = decision;

    return run;
  }

  completeRun(runId, result) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.state = RunState.COMPLETED;
    run.result = result;
    run.completedAt = Date.now();
    run.updatedAt = Date.now();

    return run;
  }

  failRun(runId, error) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.state = RunState.ERROR;
    run.error = error;
    run.completedAt = Date.now();
    run.updatedAt = Date.now();

    return run;
  }

  cancelRun(runId) {
    const run = this._runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    run.state = RunState.CANCELLED;
    run.updatedAt = Date.now();

    return run;
  }

  getRun(runId) {
    return this._runs.get(runId) || null;
  }

  listRuns({ agentId, companyId, state } = {}) {
    let runs = [...this._runs.values()];
    if (agentId) runs = runs.filter(r => r.agentId === agentId);
    if (companyId) runs = runs.filter(r => r.companyId === companyId);
    if (state) runs = runs.filter(r => r.state === state);
    return runs.sort((a, b) => b.createdAt - a.createdAt);
  }

  cleanupOldRuns(maxAgeMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [runId, run] of this._runs) {
      if (run.updatedAt < cutoff) {
        this._runs.delete(runId);
      }
    }
  }
}

// Singleton
let manager = null;
function getRunStateManager() {
  if (!manager) manager = new RunStateManager();
  return manager;
}

module.exports = { RunStateManager, getRunStateManager, RunState };

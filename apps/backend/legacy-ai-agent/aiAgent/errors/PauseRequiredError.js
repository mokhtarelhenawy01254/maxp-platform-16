/**
 * Error thrown when agent execution must pause for human input/approval.
 */
class PauseRequiredError extends Error {
  constructor({ runId, pauseType, reason, metadata = {} }) {
    super(`Agent execution paused: ${reason}`);
    this.name = 'PauseRequiredError';
    this.runId = runId;
    this.pauseType = pauseType; // 'APPROVAL' | 'INPUT'
    this.reason = reason;
    this.metadata = metadata;
    this.isPauseRequired = true;
  }
}

module.exports = PauseRequiredError;

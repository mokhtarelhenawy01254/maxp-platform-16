/**
 * Event emitter for agent runs. Follows OpenAI Agents SDK stream_events pattern.
 * Event types: agent_start, agent_thinking, tool_calling, tool_result, agent_reply, run_complete, run_error
 */
const { EventEmitter } = require('events');

class AgentEventEmitter extends EventEmitter {
  constructor(runId) {
    super();
    this.runId = runId;
    this.events = [];
  }

  emit(eventName, payload) {
    const event = {
      type: eventName,
      runId: this.runId,
      timestamp: Date.now(),
      ...payload,
    };
    this.events.push(event);
    super.emit(eventName, event);
    super.emit('*', event); // wildcard for any listener
  }

  // Yield events for async generators
  async *stream() {
    let index = 0;
    while (true) {
      if (index < this.events.length) {
        yield this.events[index++];
      } else {
        // Wait for next event
        await new Promise(resolve => {
          const handler = () => resolve();
          this.once('*', handler);
          setTimeout(() => {
            this.off('*', handler);
            resolve();
          }, 100); // timeout to prevent hanging
        });
        if (index >= this.events.length) {
          // Check if run is complete
          const lastEvent = this.events[this.events.length - 1];
          if (lastEvent?.type === 'run_complete' || lastEvent?.type === 'run_error') {
            return;
          }
        }
      }
    }
  }

  getHistory() {
    return [...this.events];
  }
}

module.exports = AgentEventEmitter;

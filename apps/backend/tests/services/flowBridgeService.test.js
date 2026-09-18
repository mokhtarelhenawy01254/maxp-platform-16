const flowBridgeService = require('../../services/flowBridgeService');
const googleVeoService = require('../../services/googleVeoService');

describe('FlowBridgeService', () => {
  it('should locate the gflow executable path', () => {
    const exe = flowBridgeService.resolveExecutable();
    expect(typeof exe).toBe('string');
    expect(exe.length).toBeGreaterThan(0);
  });

  it('should check session status cleanly without throwing', async () => {
    const status = await flowBridgeService.checkSessionStatus();
    expect(status).toBeDefined();
    expect(typeof status.installed).toBe('boolean');
    expect(typeof status.authenticated).toBe('boolean');
  });

  it('should handle cancelTask gracefully for non-existent task', () => {
    const cancelled = flowBridgeService.cancelTask('non_existent_task');
    expect(cancelled).toBe(false);
  });
});

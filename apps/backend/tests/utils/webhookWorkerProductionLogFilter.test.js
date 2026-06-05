const fs = require('fs');
const path = require('path');

describe('webhook worker production log filter wiring', () => {
  test('installs the production log filter before noisy worker service imports', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../workers/webhookWorker.js'),
      'utf8',
    );

    const installCallIndex = source.indexOf('installWorkerProductionLogFilter();');
    const webhookServiceImportIndex = source.indexOf("require('../services/webhookService')");
    const aiRuntimeImportIndex = source.indexOf("require('../legacy-ai-agent/aiAgent/aiRuntimeRunQueueService')");

    expect(installCallIndex).toBeGreaterThan(-1);
    expect(webhookServiceImportIndex).toBeGreaterThan(-1);
    expect(aiRuntimeImportIndex).toBeGreaterThan(-1);
    expect(installCallIndex).toBeLessThan(webhookServiceImportIndex);
    expect(installCallIndex).toBeLessThan(aiRuntimeImportIndex);
  });
});

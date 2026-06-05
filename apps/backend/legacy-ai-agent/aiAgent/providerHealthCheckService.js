const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const AIProviderFactory = require('./providers/AIProviderFactory');
const aiProviderLogService = require('./providerLogService');

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_GAP_BETWEEN_CHECKS_MS = 4 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 3;

class ProviderHealthCheckService {
  constructor() {
    this._timer = null;
    this._running = false;
    this._lastChecked = new Map();
    this._consecutiveFailures = new Map();
  }

  start() {
    if (this._timer) return;
    console.log('🩺 [PROVIDER-HEALTH] Health check service starting...');
    this._timer = setInterval(() => { this._runCheck().catch((err) => console.error('🩺 [PROVIDER-HEALTH] Unhandled:', err)); }, CHECK_INTERVAL_MS);
    this._runCheck();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async _runCheck() {
    if (this._running) return;
    this._running = true;

    try {
      const prisma = getSharedPrismaClient();
      const cutoff = Date.now() - MIN_GAP_BETWEEN_CHECKS_MS;

      const keys = await prisma.aiKey.findMany({
        where: { isActive: true },
        include: { aiModelConfigs: true },
        take: 200,
      });

      const activeIds = new Set(keys.map((k) => k.id));
      for (const id of this._lastChecked.keys()) {
        if (!activeIds.has(id)) {
          this._lastChecked.delete(id);
          this._consecutiveFailures.delete(id);
        }
      }

      const due = keys.filter((k) => {
        const last = this._lastChecked.get(k.id);
        return !last || last < cutoff;
      });

      if (due.length === 0) return;

      for (const key of due) {
        let provider;
        try {
          provider = key.provider;
          const client = AIProviderFactory.getProvider(provider, key.apiKey, key.baseUrl, key.id);
          if (!client || typeof client.testConnection !== 'function') {
            throw new Error(`Invalid provider: ${provider}`);
          }
          const result = await client.testConnection();

          if (!result) {
            throw new Error('Connection test returned false');
          }

          this._lastChecked.set(key.id, Date.now());
          this._consecutiveFailures.set(key.id, 0);
        } catch (err) {
          const failCount = (this._consecutiveFailures.get(key.id) || 0) + 1;
          this._consecutiveFailures.set(key.id, failCount);
          this._lastChecked.set(key.id, Date.now());

          console.warn(`🩺 [PROVIDER-HEALTH] Key ${key.name} (${provider}) failed (${failCount}/${MAX_CONSECUTIVE_FAILURES}): ${err.message}`);

          if (failCount >= MAX_CONSECUTIVE_FAILURES) {
            await prisma.aiKey.update({
              where: { id: key.id },
              data: { isActive: false },
            });

            await aiProviderLogService.recordProviderEvent({
              provider: provider || 'UNKNOWN',
              keyId: key.id,
              keyName: key.name,
              action: 'health_auto_disable',
              status: 'failed',
              message: `Auto-disabled after ${failCount} consecutive failed health checks: ${err.message}`,
              metadata: { source: 'provider_health_check_service', consecutiveFailures: failCount },
            });
          }
        }
      }
    } catch (err) {
      console.error('🩺 [PROVIDER-HEALTH] Check error:', err.message);
    } finally {
      this._running = false;
    }
  }
}

module.exports = new ProviderHealthCheckService();

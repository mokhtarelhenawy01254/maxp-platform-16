const { buildMemoryPressureSnapshot } = require('../../services/memoryPressureMonitorService');

const MB = 1024 * 1024;

describe('memoryPressureMonitorService', () => {
  test('uses V8 heap limit for headroom instead of committed heap total', () => {
    const snapshot = buildMemoryPressureSnapshot(
      {
        heapUsed: 145 * MB,
        heapTotal: 190 * MB,
        rss: 357 * MB,
      },
      {
        heap_size_limit: 2048 * MB,
      }
    );

    expect(snapshot.heapRemainingMB).toBe(1903);
    expect(snapshot.lowHeap).toBe(false);
    expect(snapshot.criticalHeap).toBe(false);
  });

  test('marks critical only when actual V8 heap headroom is exhausted', () => {
    const snapshot = buildMemoryPressureSnapshot(
      {
        heapUsed: 1900 * MB,
        heapTotal: 1950 * MB,
        rss: 2100 * MB,
      },
      {
        heap_size_limit: 2048 * MB,
      }
    );

    expect(snapshot.heapRemainingMB).toBe(148);
    expect(snapshot.lowHeap).toBe(true);
    expect(snapshot.criticalHeap).toBe(true);
    expect(snapshot.highUsage).toBe(true);
  });
});

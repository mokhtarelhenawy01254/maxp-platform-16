const MB = 1024 * 1024;

function toMB(value) {
  return Math.round(Number(value || 0) / MB);
}

function buildMemoryPressureSnapshot(usage, heapStats, thresholds = {}) {
  const warnHeapRemainingMB = Number(thresholds.warnHeapRemainingMB || 500);
  const criticalHeapRemainingMB = Number(thresholds.criticalHeapRemainingMB || 200);
  const warnRssMB = Number(thresholds.warnRssMB || 800);
  const warnHeapUsedMB = Number(thresholds.warnHeapUsedMB || 600);

  const heapUsedMB = toMB(usage?.heapUsed);
  const heapTotalMB = toMB(usage?.heapTotal);
  const rssMB = toMB(usage?.rss);
  const heapLimitMB = toMB(heapStats?.heap_size_limit || usage?.heapTotal);
  const heapRemainingMB = Math.max(0, heapLimitMB - heapUsedMB);

  return {
    heapUsedMB,
    heapTotalMB,
    heapLimitMB,
    heapRemainingMB,
    rssMB,
    highUsage: rssMB > warnRssMB || heapUsedMB > warnHeapUsedMB,
    lowHeap: heapRemainingMB < warnHeapRemainingMB,
    criticalHeap: heapRemainingMB < criticalHeapRemainingMB,
  };
}

module.exports = {
  buildMemoryPressureSnapshot,
};

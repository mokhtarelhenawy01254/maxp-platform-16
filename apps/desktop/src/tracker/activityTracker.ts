import type { ActivityInterval } from '../shared/types';

/**
 * Tracks mouse and keyboard activity using global hooks.
 * Counts events per interval without logging actual keystrokes (privacy-first).
 */
export class ActivityTracker {
  private mouseCount = 0;
  private keyboardCount = 0;
  private lastInputTime = Date.now();
  private intervalStart = new Date();
  private isTracking = false;
  private listener: any = null;

  /** Seconds since last mouse or keyboard input */
  get idleSeconds(): number {
    return Math.floor((Date.now() - this.lastInputTime) / 1000);
  }

  get currentMouseCount(): number { return this.mouseCount; }
  get currentKeyboardCount(): number { return this.keyboardCount; }

  async start(): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;
    this.resetCounters();

    try {
      // Dynamic import to avoid crash if native module fails
      const { GlobalKeyboardListener } = await import('node-global-key-listener');
      this.listener = new GlobalKeyboardListener();

      this.listener.addListener((event: any) => {
        if (event.state === 'DOWN') {
          this.keyboardCount++;
          this.lastInputTime = Date.now();
        }
      });
    } catch (err) {
      console.error('[ActivityTracker] Failed to initialize keyboard listener:', err);
    }

    // Mouse tracking via polling (cross-platform compatible)
    this.startMousePolling();
  }

  stop(): void {
    this.isTracking = false;
    if (this.listener) {
      try { this.listener.kill(); } catch {}
      this.listener = null;
    }
  }

  /**
   * Capture the current interval and reset counters.
   * Call this every INTERVAL_MS (e.g. 600_000 = 10 minutes).
   */
  captureInterval(): ActivityInterval {
    const now = new Date();
    const intervalSeconds = Math.floor((now.getTime() - this.intervalStart.getTime()) / 1000);
    const activeSeconds = Math.min(intervalSeconds, this.calculateActiveSeconds(intervalSeconds));
    const activityScore = intervalSeconds > 0
      ? Math.round((activeSeconds / intervalSeconds) * 100)
      : 0;

    const status = activityScore >= 30 ? 'active'
      : activityScore >= 10 ? 'idle'
      : 'away';

    const interval: ActivityInterval = {
      intervalStart: this.intervalStart.toISOString(),
      intervalEnd: now.toISOString(),
      mouseEvents: this.mouseCount,
      keyboardEvents: this.keyboardCount,
      activeSeconds,
      activityScore,
      status,
    };

    this.resetCounters();
    this.intervalStart = now;
    return interval;
  }

  /** Register a mouse movement (called from mouse polling) */
  registerMouseEvent(): void {
    this.mouseCount++;
    this.lastInputTime = Date.now();
  }

  private resetCounters(): void {
    this.mouseCount = 0;
    this.keyboardCount = 0;
    this.intervalStart = new Date();
  }

  /**
   * Estimate active seconds based on input frequency.
   * If there were inputs spread across the interval, assume active.
   */
  private calculateActiveSeconds(intervalSeconds: number): number {
    const totalEvents = this.mouseCount + this.keyboardCount;
    if (totalEvents === 0) return 0;
    // Rough heuristic: if events > interval/10, likely active most of the time
    const eventDensity = totalEvents / Math.max(intervalSeconds, 1);
    if (eventDensity >= 0.5) return intervalSeconds; // Very active
    if (eventDensity >= 0.1) return Math.floor(intervalSeconds * 0.7);
    return Math.floor(intervalSeconds * Math.min(eventDensity * 5, 0.5));
  }

  private startMousePolling(): void {
    // Poll mouse position every 2 seconds via Electron's screen module
    // We compare positions to detect movement
    let lastX = -1;
    let lastY = -1;

    const poll = () => {
      if (!this.isTracking) return;
      try {
        const { screen } = require('electron');
        const point = screen.getCursorScreenPoint();
        if (point.x !== lastX || point.y !== lastY) {
          this.registerMouseEvent();
          lastX = point.x;
          lastY = point.y;
        }
      } catch {}
      setTimeout(poll, 2000);
    };

    setTimeout(poll, 1000);
  }
}

export const activityTracker = new ActivityTracker();

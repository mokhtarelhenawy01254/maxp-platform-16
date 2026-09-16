import type { ActivityInterval } from '../shared/types';

interface MovementSample {
  dx: number;
  dy: number;
  time: number;
}

/**
 * Tracks mouse and keyboard activity using global hooks and intelligent telemetry.
 * Counts events per interval without logging actual keystrokes (privacy-first).
 * Features anti-jiggler heuristic detection and meeting protection.
 */
export class ActivityTracker {
  private mouseCount = 0;
  private keyboardCount = 0;
  private lastInputTime = Date.now();
  private intervalStart = new Date();
  private isTracking = false;
  private listener: any = null;

  // Discrete 10-second active bucket tracking for accurate activeSeconds
  private activeBuckets = new Set<number>();
  private readonly BUCKET_SIZE_SEC = 10;

  // Anti-Jiggler Telemetry
  private movementSamples: MovementSample[] = [];
  private readonly MAX_SAMPLES = 120;
  private isMeeting = false;

  /** Seconds since last mouse or keyboard input */
  get idleSeconds(): number {
    return Math.floor((Date.now() - this.lastInputTime) / 1000);
  }

  get currentMouseCount(): number { return this.mouseCount; }
  get currentKeyboardCount(): number { return this.keyboardCount; }

  setMeetingActive(active: boolean): void {
    this.isMeeting = active;
  }

  async start(): Promise<void> {
    if (this.isTracking) return;
    this.isTracking = true;
    this.resetCounters();

    try {
      const { GlobalKeyboardListener } = await import('node-global-key-listener');
      this.listener = new GlobalKeyboardListener();

      this.listener.addListener((event: any) => {
        if (event.state === 'DOWN') {
          this.keyboardCount++;
          this.recordActiveBucket();
          this.lastInputTime = Date.now();
        }
      });
    } catch (err) {
      console.warn('[ActivityTracker] Keyboard listener notice:', err);
    }

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
   * Runs every 10 minutes (or on shutdown).
   */
  captureInterval(): ActivityInterval {
    const now = new Date();
    const intervalSeconds = Math.max(1, Math.floor((now.getTime() - this.intervalStart.getTime()) / 1000));

    // Calculate active seconds from discrete buckets
    let activeSeconds = Math.min(intervalSeconds, this.activeBuckets.size * this.BUCKET_SIZE_SEC);

    // Anti-Jiggler detection
    const isSynthetic = this.detectSyntheticMovement();

    // If meeting is active, passive listening is credited as productive collaboration
    if (this.isMeeting) {
      activeSeconds = Math.max(activeSeconds, Math.floor(intervalSeconds * 0.85));
    } else if (isSynthetic) {
      // Degrade active score for synthetic jiggler activity without keyboard engagement
      activeSeconds = Math.floor(activeSeconds * 0.2);
    }

    const activityScore = Math.min(100, Math.round((activeSeconds / intervalSeconds) * 100));

    let status: 'active' | 'idle' | 'away' = 'away';
    if (activityScore >= 30 || (this.isMeeting && activityScore >= 20)) {
      status = 'active';
    } else if (activityScore >= 10) {
      status = 'idle';
    }

    const interval: ActivityInterval = {
      intervalStart: this.intervalStart.toISOString(),
      intervalEnd: now.toISOString(),
      mouseEvents: this.mouseCount,
      keyboardEvents: this.keyboardCount,
      activeSeconds,
      activityScore,
      status,
      isSynthetic,
      isMeeting: this.isMeeting,
    };

    this.resetCounters();
    this.intervalStart = now;
    return interval;
  }

  registerMouseEvent(dx: number, dy: number): void {
    this.mouseCount++;
    this.recordActiveBucket();
    this.lastInputTime = Date.now();

    // Sample vector for anti-jiggler analysis
    if (this.movementSamples.length >= this.MAX_SAMPLES) {
      this.movementSamples.shift();
    }
    this.movementSamples.push({ dx, dy, time: Date.now() });
  }

  private recordActiveBucket(): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const bucketIndex = Math.floor(nowSec / this.BUCKET_SIZE_SEC);
    this.activeBuckets.add(bucketIndex);
  }

  private resetCounters(): void {
    this.mouseCount = 0;
    this.keyboardCount = 0;
    this.activeBuckets.clear();
    this.movementSamples = [];
    this.intervalStart = new Date();
  }

  /**
   * Anti-Jiggler Analysis:
   * Detects periodic fixed-interval movements (e.g., exactly every 30s) or
   * repetitive micro-pixel ping-pong movements with 0 keyboard activity.
   */
  private detectSyntheticMovement(): boolean {
    if (this.movementSamples.length < 15) return false;
    if (this.keyboardCount > 5) return false; // Genuine human work involves keyboard interaction

    // 1. Check for micro-displacement (<= 2 pixels displacement)
    let microMoves = 0;
    for (const s of this.movementSamples) {
      if (Math.abs(s.dx) <= 2 && Math.abs(s.dy) <= 2) {
        microMoves++;
      }
    }
    if (microMoves / this.movementSamples.length >= 0.85 && this.mouseCount > 20 && this.keyboardCount === 0) {
      return true;
    }

    // 2. Check for rhythmic constant time periodicity (Hardware USB Jiggler)
    const timeDeltas: number[] = [];
    for (let i = 1; i < this.movementSamples.length; i++) {
      timeDeltas.push(this.movementSamples[i].time - this.movementSamples[i - 1].time);
    }

    if (timeDeltas.length >= 10) {
      const avgDelta = timeDeltas.reduce((a, b) => a + b, 0) / timeDeltas.length;
      // Variance calculation
      const variance = timeDeltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / timeDeltas.length;
      const stdDev = Math.sqrt(variance);

      // Low standard deviation (< 200ms) with high interval duration means clockwork hardware simulation
      if (avgDelta > 5000 && stdDev < 250 && this.keyboardCount === 0) {
        return true;
      }
    }

    return false;
  }

  private startMousePolling(): void {
    let lastX = -1;
    let lastY = -1;

    const poll = () => {
      if (!this.isTracking) return;
      try {
        const { screen } = require('electron');
        const point = screen.getCursorScreenPoint();
        if (lastX !== -1 && lastY !== -1) {
          const dx = point.x - lastX;
          const dy = point.y - lastY;
          if (dx !== 0 || dy !== 0) {
            this.registerMouseEvent(dx, dy);
          }
        }
        lastX = point.x;
        lastY = point.y;
      } catch {}

      if (this.isTracking) {
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 1000);
  }
}

export const activityTracker = new ActivityTracker();


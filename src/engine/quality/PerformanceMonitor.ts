export interface PerformanceSnapshot {
  fps: number;
  frameMs: number;
}

/**
 * Measures real fps and frame time over ~0.5 s windows. Only counts frames of a continuous run: a gap longer
 * than `idleGapMs` (render on demand, hidden tab) resets the window instead of looking like a slow frame.
 */
export class PerformanceMonitor {
  private frames = 0;
  private accumulatedMs = 0;
  private windowStart = 0;
  private lastFrameAt = 0;
  private snapshot: PerformanceSnapshot = { fps: 0, frameMs: 0 };

  constructor(private readonly idleGapMs = 250) {}

  /** Returns a fresh snapshot when a window closes, otherwise null. */
  recordFrame(now: number): PerformanceSnapshot | null {
    if (this.lastFrameAt === 0 || now - this.lastFrameAt > this.idleGapMs) {
      this.reset();
      this.windowStart = now;
      this.lastFrameAt = now;
      return null;
    }
    this.frames += 1;
    this.accumulatedMs += now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (now - this.windowStart < 500) return null;
    this.snapshot = {
      fps: (this.frames * 1000) / (now - this.windowStart),
      frameMs: this.accumulatedMs / this.frames,
    };
    this.frames = 0;
    this.accumulatedMs = 0;
    this.windowStart = now;
    return this.snapshot;
  }

  read(): PerformanceSnapshot {
    return this.snapshot;
  }

  reset() {
    this.frames = 0;
    this.accumulatedMs = 0;
    this.lastFrameAt = 0;
  }
}

export type QualityVerdict = 'down' | 'up' | null;

/**
 * Asks for a lower tier after `downWindows` consecutive snapshots below `minFps`, and for a higher one after `upWindows`
 * consecutive snapshots at or above `upFps` (a hitch, a busy tab or a blurred overlay no longer costs the quality for good).
 */
export class QualityGovernor {
  private slowWindows = 0;
  private fastWindows = 0;

  constructor(
    private readonly minFps = 28,
    private readonly downWindows = 4,
    private readonly upFps = 55,
    private readonly upWindows = 16,
  ) {}

  judge({ fps }: PerformanceSnapshot): QualityVerdict {
    this.slowWindows = fps < this.minFps ? this.slowWindows + 1 : 0;
    this.fastWindows = fps >= this.upFps ? this.fastWindows + 1 : 0;
    if (this.slowWindows >= this.downWindows) {
      this.reset();
      return 'down';
    }
    if (this.fastWindows >= this.upWindows) {
      this.reset();
      return 'up';
    }
    return null;
  }

  reset() {
    this.slowWindows = 0;
    this.fastWindows = 0;
  }
}

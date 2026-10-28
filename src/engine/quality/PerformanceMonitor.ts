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

/** Asks for a lower tier after `windows` consecutive snapshots below `minFps`. */
export class QualityGovernor {
  private slowWindows = 0;

  constructor(
    private readonly minFps = 30,
    private readonly windows = 3,
  ) {}

  shouldDowngrade({ fps }: PerformanceSnapshot): boolean {
    this.slowWindows = fps < this.minFps ? this.slowWindows + 1 : 0;
    if (this.slowWindows < this.windows) return false;
    this.slowWindows = 0;
    return true;
  }
}

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

/** Safari in low-power mode locks rAF at 30 fps: a steady ~33 ms interval that no tier can fix. */
const CAPPED_FRAME_MS = 1000 / 30;
const nearCap = (frameMs: number) => Math.abs(frameMs - CAPPED_FRAME_MS) < 2.5;

/**
 * Asks for a lower tier after `downWindows` consecutive snapshots below `minFps`, and for a higher one after `upWindows`
 * consecutive snapshots at or above `upFps` (a hitch, a busy tab or a blurred overlay no longer costs the quality for good).
 * Before dropping a tier the caller tries a lighter render scale (`noteSoftened`): if the frame time then stays at the 30 fps
 * cap, the screen is capped (not the GPU) and the governor stops asking for lower tiers.
 */
export class QualityGovernor {
  private slowWindows = 0;
  private fastWindows = 0;
  private softenedMs = 0;
  private capped = false;

  constructor(
    private readonly minFps = 28,
    private readonly downWindows = 4,
    private readonly upFps = 55,
    private readonly upWindows = 16,
  ) {}

  /** The caller lightened the render scale while frames took `frameMs`: the next slow verdict tells if that helped. */
  noteSoftened(frameMs: number) {
    this.softenedMs = frameMs;
    this.reset();
  }

  judge({ fps, frameMs }: PerformanceSnapshot): QualityVerdict {
    // Under a cap only frames clearly slower than it count as slow.
    const slow = this.capped ? frameMs > CAPPED_FRAME_MS * 1.3 : fps < this.minFps;
    this.slowWindows = slow ? this.slowWindows + 1 : 0;
    this.fastWindows = fps >= this.upFps ? this.fastWindows + 1 : 0;
    if (this.slowWindows >= this.downWindows) {
      const stillAtCap = this.softenedMs > 0 && frameMs >= this.softenedMs * 0.9 && nearCap(frameMs);
      this.reset();
      if (stillAtCap) this.capped = true;
      return stillAtCap ? null : 'down';
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

  /** After a tier change everything measured so far is about another setup. */
  resetAll() {
    this.reset();
    this.softenedMs = 0;
    this.capped = false;
  }
}

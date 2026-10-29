/** Fraction of the remaining gap closed per second (exponential easing). */
const DAMPING = 9;
const SETTLE_EPSILON = 0.0005;

export interface DistanceLimits {
  min: number;
  max: number;
}

/** Camera distance with a target: zoom inputs move the target (clamped), the distance eases towards it. */
export class ZoomModel {
  distance: number;
  target: number;
  private previous: number;

  constructor(
    initial: number,
    private readonly limits: () => DistanceLimits,
  ) {
    this.distance = initial;
    this.target = initial;
    this.previous = initial;
  }

  /** Jumps to a distance with no easing (intro dolly, resize). */
  snapTo(distance: number) {
    this.distance = distance;
    this.target = distance;
    this.previous = distance;
  }

  /** Multiplies the target distance (factor < 1 zooms in). Returns the clamped target. */
  zoomBy(factor: number): number {
    const { min, max } = this.limits();
    this.target = Math.min(max, Math.max(min, this.target * factor));
    return this.target;
  }

  /** Re-applies the limits (after a resize). */
  clamp() {
    const { min, max } = this.limits();
    this.target = Math.min(max, Math.max(min, this.target));
    this.distance = Math.min(max, Math.max(min, this.distance));
  }

  /** Eases towards the target. Returns true while it still moves. */
  update(deltaSeconds: number): boolean {
    this.previous = this.distance;
    const gap = this.target - this.distance;
    if (Math.abs(gap) < SETTLE_EPSILON) {
      this.distance = this.target;
      return false;
    }
    this.distance += gap * (1 - Math.exp(-DAMPING * deltaSeconds));
    return true;
  }

  /** Relative distance change per second of the last update (negative while zooming in). */
  velocity(deltaSeconds: number): number {
    if (deltaSeconds <= 0) return 0;
    return (this.distance - this.previous) / this.distance / deltaSeconds;
  }
}

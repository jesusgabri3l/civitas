/** One camera shot of a chapter, in world meters. */
export interface CameraKey {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const DAMPING = 7;
const SETTLED = 0.0004;

/** A camera shot in polar form around its target, so travelling between shots is an orbit and not a straight cut. */
export interface CameraShot {
  target: { x: number; y: number; z: number };
  /** Angle of the camera around the target (radians, `atan2(z, x)`). */
  angle: number;
  /** Distance to the target on the ground plane. */
  radius: number;
  /** Height above the target. */
  height: number;
  fov: number;
}

/**
 * The keys of a story (one per chapter) and, per chapter, the share at its end where the camera is already in its pose: each chapter
 * travels from the previous key to its own while its text comes in, and arrives before the text is in place.
 */
export interface CameraTrack {
  keys: readonly CameraKey[];
  hold: readonly number[];
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Shortest way between two angles. */
function lerpAngle(from: number, to: number, t: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

/** Scroll position in key units (0 = first chapter) from the story progress: each chapter travels to its key, then holds it. */
export function scrollPosition(chapter: number, t: number, track: CameraTrack): number {
  const last = track.keys.length - 1;
  const index = Math.min(last, Math.max(0, chapter));
  if (index === 0) return 0;
  const hold = Math.min(0.9, track.hold[index] ?? 0);
  return index - 1 + clamp(t / (1 - hold), 0, 1);
}

/** The shot between two keys for a position `u`, in polar form around the target (travelling is an orbit, not a straight cut). */
export function shotAt(u: number, out: CameraShot, track: CameraTrack): CameraShot {
  const { keys } = track;
  const index = Math.min(keys.length - 2, Math.max(0, Math.floor(u)));
  const t = ease(clamp(u - index, 0, 1));
  const from = keys[index];
  const to = keys[index + 1];
  const fromX = from.position[0] - from.target[0];
  const fromY = from.position[1] - from.target[1];
  const fromZ = from.position[2] - from.target[2];
  const toX = to.position[0] - to.target[0];
  const toY = to.position[1] - to.target[1];
  const toZ = to.position[2] - to.target[2];
  out.target.x = lerp(from.target[0], to.target[0], t);
  out.target.y = lerp(from.target[1], to.target[1], t);
  out.target.z = lerp(from.target[2], to.target[2], t);
  out.angle = lerpAngle(Math.atan2(fromZ, fromX), Math.atan2(toZ, toX), t);
  out.radius = lerp(Math.hypot(fromX, fromZ), Math.hypot(toX, toZ), t);
  out.height = lerp(fromY, toY, t);
  out.fov = lerp(from.fov, to.fov, t);
  return out;
}

const emptyShot = (): CameraShot => ({ target: { x: 0, y: 0, z: 0 }, angle: 0, radius: 1, height: 0, fov: 35 });

/**
 * Camera of the scroll story of a monument: one key per chapter. Scroll sets the goal position, the position eases toward it (no easing with
 * reduced motion: each section is a fixed cut) and `shot` is the interpolated shot.
 */
export class StoryCamera {
  readonly shot: CameraShot;
  private goal = 0;
  private position = 0;

  constructor(private readonly track: CameraTrack) {
    this.shot = shotAt(0, emptyShot(), track);
  }

  setProgress(chapter: number, t: number) {
    this.goal = scrollPosition(chapter, t, this.track);
  }

  /** Goes to the rest pose (home, start) with no animation. */
  reset() {
    this.goal = 0;
    this.position = 0;
    shotAt(0, this.shot, this.track);
  }

  /** Returns true while the shot still moves toward its goal. */
  update(deltaSeconds: number, animated: boolean): boolean {
    if (!animated) {
      const next = Math.round(this.goal);
      if (next === this.position) return false;
      this.position = next;
      shotAt(this.position, this.shot, this.track);
      return true;
    }
    if (this.position === this.goal) return false;
    const next = this.position + (this.goal - this.position) * (1 - Math.exp(-DAMPING * deltaSeconds));
    this.position = Math.abs(this.goal - next) < SETTLED ? this.goal : next;
    shotAt(this.position, this.shot, this.track);
    return true;
  }
}

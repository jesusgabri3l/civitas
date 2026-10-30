const DAMPING = 7;
const SETTLED = 0.0005;
const SETTLED_DEGREES = 0.02;
/** Pointer travel (px) under which a press-and-release is a tap, not a drag. */
const TAP_SLOP = 5;
/** Degrees of turn per pixel dragged. */
const DRAG_SPEED = 0.2;
/** Pointer parallax: degrees the camera leans toward the pointer, everywhere on the page. */
const PARALLAX = { yaw: 0.7, pitch: 0.35 } as const;

export interface OrbitLimits {
  /** Degrees the Explore drag can turn the maquette around the chapter pose. */
  yaw: number;
  pitchUp: number;
  pitchDown: number;
}

export interface OrbitPose {
  yaw: number;
  pitch: number;
}

export interface ExploreOrbitOptions {
  canvas: HTMLCanvasElement;
  limits: OrbitLimits;
  /** Something moved: wake the idle clock and ask for a frame. */
  onActivity: () => void;
  /** false: no damping and no parallax (reduced motion). */
  smooth: () => boolean;
  /** A tap (press and release within `TAP_SLOP`) on the canvas while exploring. */
  onTap: (clientX: number, clientY: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The pointer nudges the camera a little around the story pose (parallax). In the Explore chapter, and only there, a drag turns the
 * maquette within limits and a tap picks a part. The canvas keeps `touch-action: pan-y`: vertical swipes still scroll the page.
 */
export class ExploreOrbit {
  readonly pose: OrbitPose = { yaw: 0, pitch: 0 };
  private parallaxTargetX = 0;
  private parallaxTargetY = 0;
  private parallaxX = 0;
  private parallaxY = 0;
  private dragYawGoal = 0;
  private dragPitchGoal = 0;
  private dragYaw = 0;
  private dragPitch = 0;
  private exploring = false;
  private pressed: { id: number; x: number; y: number; moved: boolean } | null = null;

  constructor(private readonly options: ExploreOrbitOptions) {}

  attach() {
    const { canvas } = this.options;
    window.addEventListener('pointermove', this.onWindowMove, { passive: true });
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onDrag);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    this.applyMode();
  }

  detach() {
    const { canvas } = this.options;
    window.removeEventListener('pointermove', this.onWindowMove);
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onDrag);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onCancel);
    this.pressed = null;
    canvas.style.touchAction = '';
    canvas.style.cursor = '';
  }

  /** Explore chapter on or off. Off: the drag eases back to the story pose. */
  setExploring(exploring: boolean) {
    if (this.exploring === exploring) return;
    this.exploring = exploring;
    this.pressed = null;
    if (!exploring) this.dragYawGoal = this.dragPitchGoal = 0;
    this.applyMode();
    this.options.onActivity();
  }

  get isExploring() {
    return this.exploring;
  }

  reset() {
    this.parallaxTargetX = this.parallaxTargetY = this.parallaxX = this.parallaxY = 0;
    this.dragYawGoal = this.dragPitchGoal = this.dragYaw = this.dragPitch = 0;
    this.pose.yaw = this.pose.pitch = 0;
  }

  /** Eases the pose toward its targets. Returns true while it still moves. */
  update(deltaSeconds: number): boolean {
    const follow = this.options.smooth() ? 1 - Math.exp(-DAMPING * deltaSeconds) : 1;
    this.parallaxX += (this.parallaxTargetX - this.parallaxX) * follow;
    this.parallaxY += (this.parallaxTargetY - this.parallaxY) * follow;
    this.dragYaw += (this.dragYawGoal - this.dragYaw) * follow;
    this.dragPitch += (this.dragPitchGoal - this.dragPitch) * follow;
    this.pose.yaw = this.parallaxX * PARALLAX.yaw + this.dragYaw;
    this.pose.pitch = -this.parallaxY * PARALLAX.pitch + this.dragPitch;
    return (
      Math.abs(this.parallaxTargetX - this.parallaxX) > SETTLED ||
      Math.abs(this.parallaxTargetY - this.parallaxY) > SETTLED ||
      Math.abs(this.dragYawGoal - this.dragYaw) > SETTLED_DEGREES ||
      Math.abs(this.dragPitchGoal - this.dragPitch) > SETTLED_DEGREES
    );
  }

  private applyMode() {
    const { canvas } = this.options;
    canvas.style.touchAction = this.exploring ? 'pan-y' : '';
    canvas.style.cursor = this.exploring ? 'grab' : '';
  }

  private readonly onWindowMove = (event: PointerEvent) => {
    if (!this.options.smooth() || event.pointerType !== 'mouse') return;
    this.parallaxTargetX = (event.clientX / window.innerWidth) * 2 - 1;
    this.parallaxTargetY = (event.clientY / window.innerHeight) * 2 - 1;
    this.options.onActivity();
  };

  private readonly onDown = (event: PointerEvent) => {
    if (!this.exploring || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.pressed = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };

  private readonly onDrag = (event: PointerEvent) => {
    const { pressed } = this;
    if (!pressed || event.pointerId !== pressed.id) return;
    const dx = event.clientX - pressed.x;
    const dy = event.clientY - pressed.y;
    if (!pressed.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!pressed.moved) this.options.canvas.style.cursor = 'grabbing';
    pressed.moved = true;
    pressed.x = event.clientX;
    pressed.y = event.clientY;
    const { limits } = this.options;
    // Dragging to the right turns the maquette toward the right, like grabbing it. Touch only turns (vertical swipes scroll).
    this.dragYawGoal = clamp(this.dragYawGoal + dx * DRAG_SPEED, -limits.yaw, limits.yaw);
    if (event.pointerType === 'mouse') this.dragPitchGoal = clamp(this.dragPitchGoal + dy * DRAG_SPEED, -limits.pitchDown, limits.pitchUp);
    this.options.onActivity();
  };

  private readonly onUp = (event: PointerEvent) => {
    const { pressed } = this;
    if (!pressed || event.pointerId !== pressed.id) return;
    this.pressed = null;
    if (this.exploring) this.options.canvas.style.cursor = 'grab';
    if (!pressed.moved) this.options.onTap(event.clientX, event.clientY);
  };

  private readonly onCancel = () => {
    this.pressed = null;
    if (this.exploring) this.options.canvas.style.cursor = 'grab';
  };
}

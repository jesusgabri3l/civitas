const MAX_SPEED = 6; // rad/s
const STOP_SPEED = 0.03;
const FRICTION = 3.5;
/** A pointer that rests this long before release does not throw the globe. */
const REST_MS = 90;
/** Wheel: pixels of delta per line step (deltaMode 1). */
const WHEEL_LINE_PX = 16;
const WHEEL_MAX_DELTA = 120;

export interface GlobeControlsOptions {
  canvas: HTMLCanvasElement;
  invalidate: () => void;
  radiansPerPixel: () => number;
  onRotate: (deltaYaw: number, deltaPitch: number) => void;
  onGrab: () => void;
  /** Wheel over the page: pixels of delta (> 0 = scrolling down, zooming out). Optional: no handler, no zoom. */
  onWheel?: (deltaPixels: number) => void;
  /** Two-finger pinch: ratio of the new finger distance over the old one (> 1 = fingers apart, zooming in). */
  onPinch?: (ratio: number) => void;
  /** false: no inertia after release (reduced motion). */
  inertia: () => boolean;
}

/**
 * Drag to turn the globe (yaw with inertia, pitch clamped by the stage); wheel and pinch are reported to the stage, which
 * decides what they do. The canvas owns every gesture
 * (`touch-action: none`): the hub is one fixed screen, there is nothing to scroll.
 */
export class GlobeControls {
  private dragging = false;
  private pointerId = -1;
  private lastX = 0;
  private lastY = 0;
  private lastTime = 0;
  private speed = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;

  constructor(private readonly options: GlobeControlsOptions) {}

  attach() {
    const { canvas } = this.options;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    // Wheel on the whole window (hotspots and labels sit above the canvas). It never scrolls: one fixed screen.
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  detach() {
    const { canvas } = this.options;
    canvas.style.touchAction = '';
    canvas.style.cursor = '';
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('wheel', this.onWheel);
    this.dragging = false;
    this.speed = 0;
    this.pointers.clear();
    this.pinchDistance = 0;
  }

  /** Applies inertia. Returns true while the globe is still coasting. */
  update(deltaSeconds: number): boolean {
    if (this.dragging) return false;
    if (Math.abs(this.speed) < STOP_SPEED) {
      this.speed = 0;
      return false;
    }
    this.options.onRotate(this.speed * deltaSeconds, 0);
    this.speed *= Math.exp(-FRICTION * deltaSeconds);
    if (Math.abs(this.speed) >= STOP_SPEED) return true;
    this.speed = 0;
    return false;
  }

  /** Cancels any coasting (a programmatic turn takes over). */
  stopCoasting() {
    this.speed = 0;
  }

  /** How fast the globe is coasting (rad/s). */
  get coastingSpeed() {
    return this.speed;
  }

  get isDragging() {
    return this.dragging;
  }

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault(); // also keeps ctrl+wheel (trackpad pinch) from zooming the whole page
    const pixels = event.deltaMode === 1 ? event.deltaY * WHEEL_LINE_PX : event.deltaY;
    this.options.onWheel?.(Math.max(-WHEEL_MAX_DELTA, Math.min(WHEEL_MAX_DELTA, pixels)));
    this.options.invalidate();
  };

  private readonly onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.options.canvas.setPointerCapture?.(event.pointerId);
    if (this.pointers.size === 2) {
      // A second finger takes over from the drag: no coasting.
      this.dragging = false;
      this.speed = 0;
      this.pinchDistance = this.currentPinchDistance();
      this.options.onGrab();
      return;
    }
    if (this.pointers.size > 2) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastTime = event.timeStamp;
    this.speed = 0;
    this.options.canvas.style.cursor = 'grabbing';
    this.options.onGrab();
  };

  private readonly onMove = (event: PointerEvent) => {
    const tracked = this.pointers.get(event.pointerId);
    if (!tracked) return;
    tracked.x = event.clientX;
    tracked.y = event.clientY;
    if (this.pointers.size >= 2) {
      this.pinch();
      return;
    }
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const deltaX = event.clientX - this.lastX;
    const deltaTime = Math.max((event.timeStamp - this.lastTime) / 1000, 0.001);
    const radiansPerPixel = this.options.radiansPerPixel();
    const rotation = deltaX * radiansPerPixel;
    this.options.onRotate(rotation, (event.clientY - this.lastY) * radiansPerPixel);
    const instantSpeed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, rotation / deltaTime));
    this.speed = this.speed * 0.6 + instantSpeed * 0.4;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastTime = event.timeStamp;
    this.options.invalidate();
  };

  private readonly onUp = (event: PointerEvent) => {
    if (!this.pointers.delete(event.pointerId)) return;
    this.options.canvas.releasePointerCapture?.(event.pointerId);

    if (this.pinchDistance > 0) {
      // The pinch ends with its first finger up; the remaining one does not turn into a drag.
      if (this.pointers.size < 2) this.pinchDistance = 0;
      this.options.canvas.style.cursor = 'grab';
      return;
    }
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.options.canvas.style.cursor = 'grab';
    const rested = event.timeStamp - this.lastTime > REST_MS;
    if (rested || !this.options.inertia()) this.speed = 0;
    this.options.invalidate();
  };

  private pinch() {
    const distance = this.currentPinchDistance();
    if (this.pinchDistance > 0 && distance > 0) {
      this.options.onPinch?.(distance / this.pinchDistance);
      this.options.invalidate();
    }
    this.pinchDistance = distance;
  }

  private currentPinchDistance(): number {
    const [first, second] = [...this.pointers.values()];
    return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 0;
  }
}

import { BufferAttribute, BufferGeometry, Color, Group, Line, Points, ShaderMaterial, Vector3 } from 'three';
import { destinations, type DestinationId } from '../../../data/destinations';
import { $openTooltip } from '../../../state/globeStore';
import { PALETTE } from './palette';
import { latLonToVector3 } from './geo';

/** Arcs visible at rest. */
const MAX_REST_ARCS = 3;
/** Arcs shown for a hovered city. */
const MAX_FOCUS_ARCS = 3;
const ROTATE_MIN = 4;
const ROTATE_MAX = 6;
const FADE_OUT_SECONDS = 0.9;
const SEGMENTS = 64;
/** Arc height over the surface, per radian of arc: low and contained. */
const LIFT_PER_RADIAN = 0.12;
const DRAW_DELAY = 3.2;
const DRAW_SECONDS = 2;
const DRAW_STAGGER = 0.55;
const TRAVEL_SECONDS = 3.4;
const TRAVEL_PERIOD = 8;
const TRAIL_LENGTH = 0.14;

const LINE_VERTEX = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDraw;
  uniform float uHead;
  uniform float uTrail;
  uniform float uFade;
  varying float vT;
  void main() {
    if (vT > uDraw) discard;
    float behind = uHead - vT;
    float tail = (uHead >= 0.0 && behind >= 0.0 && behind < uTrail) ? 1.0 - behind / uTrail : 0.0;
    float alpha = (0.34 + 0.5 * tail * tail) * uFade;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const DOT_VERTEX = /* glsl */ `
  uniform float uSize;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
  }
`;

const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = smoothstep(1.0, 0.1, d) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35 * (1.0 - d)), alpha);
  }
`;

interface Arc {
  points: Vector3[];
  line: Line;
  uniforms: { uDraw: { value: number }; uHead: { value: number }; uFade: { value: number } };
  dot: Points;
  dotUniforms: { uOpacity: { value: number }; uSize: { value: number } };
}

interface Pair {
  key: string;
  from: DestinationId;
  to: DestinationId;
  /** Angle between both cities (radians): longer arcs read better. */
  span: number;
}

interface Entry {
  pair: Pair;
  arc: Arc;
  target: boolean;
  draw: number;
  fade: number;
  /** Seconds to wait before drawing starts (staggers the first arcs). */
  wait: number;
  /** Order of appearance: the oldest rest arc is the first to go. */
  born: number;
  travelClock: number;
}

function arcBetween(from: Vector3, to: Vector3): Vector3[] {
  const lift = from.angleTo(to) * LIFT_PER_RADIAN;
  return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const t = i / SEGMENTS;
    return from
      .clone()
      .lerp(to, t)
      .normalize()
      .multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
  });
}

function pointAlong(points: Vector3[], t: number, target: Vector3): Vector3 {
  const scaled = Math.min(Math.max(t, 0), 1) * (points.length - 1);
  const index = Math.min(Math.floor(scaled), points.length - 2);
  return target.copy(points[index]).lerp(points[index + 1], scaled - index);
}

function createArc(from: Vector3, to: Vector3): Arc {
  const points = arcBetween(from, to);
  const positions = new Float32Array(points.length * 3);
  const progress = new Float32Array(points.length);
  points.forEach((point, i) => {
    point.toArray(positions, i * 3);
    progress[i] = i / SEGMENTS;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aT', new BufferAttribute(progress, 1));
  const uniforms = {
    uColor: { value: new Color(PALETTE.amber) },
    uDraw: { value: 0 },
    uFade: { value: 1 },
    uHead: { value: -1 },
    uTrail: { value: TRAIL_LENGTH },
  };
  const line = new Line(
    geometry,
    new ShaderMaterial({ vertexShader: LINE_VERTEX, fragmentShader: LINE_FRAGMENT, uniforms, transparent: true, depthWrite: false }),
  );
  line.frustumCulled = false;
  line.visible = false;

  const dotGeometry = new BufferGeometry();
  dotGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  const dotUniforms = { uColor: { value: new Color(PALETTE.amber) }, uOpacity: { value: 0 }, uSize: { value: 5 } };
  const dot = new Points(
    dotGeometry,
    new ShaderMaterial({ vertexShader: DOT_VERTEX, fragmentShader: DOT_FRAGMENT, uniforms: dotUniforms, transparent: true, depthWrite: false }),
  );
  dot.frustumCulled = false;
  dot.visible = false;
  return { points, line, uniforms, dot, dotUniforms };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const keyOf = (a: DestinationId, b: DestinationId) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Thin amber arcs between destinations, all derived from `destinations`. At rest at most three show, and every few
 * seconds one fades while a different pair draws itself (longer, more distant pairs first). With a city in focus
 * (tooltip open) only that city's arcs to its closest or related cities show. A small dot travels each arc.
 * With `still` set three fixed arcs are simply there and nothing moves.
 */
export class ArcLayer {
  readonly group = new Group();
  private readonly pairs: Pair[];
  private readonly points = new Map<DestinationId, Vector3>();
  private readonly entries = new Map<string, Entry>();
  private readonly restKeys = new Set<string>();
  private readonly scratch = new Vector3();
  private pixelRatio = 1;
  private born = 0;
  private rotateIn = 0;
  private still = false;

  constructor() {
    destinations.forEach(({ id, coordinates }) => this.points.set(id, latLonToVector3(coordinates.lat, coordinates.lon)));
    this.pairs = destinations.flatMap((from, i) =>
      destinations.slice(i + 1).map((to) => ({
        key: keyOf(from.id, to.id),
        from: from.id,
        to: to.id,
        span: (this.points.get(from.id) as Vector3).angleTo(this.points.get(to.id) as Vector3),
      })),
    );
    this.group.name = 'globe-arcs';
    this.restart(false);
  }

  /** Starts over: arcs draw themselves, or three are fully drawn and static when `still`. */
  restart(still: boolean) {
    this.still = still;
    this.rotateIn = randomBetween(ROTATE_MIN, ROTATE_MAX);
    this.restKeys.clear();
    this.entries.forEach((entry) => this.hide(entry));
    [...this.pairs]
      .sort((a, b) => b.span - a.span)
      .slice(0, MAX_REST_ARCS)
      .forEach((pair, index) => {
        this.restKeys.add(pair.key);
        const entry = this.entryFor(pair);
        entry.target = true;
        entry.wait = still ? 0 : DRAW_DELAY + index * DRAW_STAGGER;
        entry.draw = still ? 1 : 0;
        entry.fade = 1;
        entry.born = this.born++;
        entry.travelClock = -DRAW_DELAY - index * (TRAVEL_PERIOD / MAX_REST_ARCS) - 2;
      });
    this.apply(false);
  }

  setPixelRatio(ratio: number) {
    this.pixelRatio = ratio;
    this.entries.forEach(({ arc }) => (arc.dotUniforms.uSize.value = 5 * ratio));
  }

  /** Advances the animation. `travel` lets the dots and the rotation run. Returns true while it needs frames. */
  update(deltaSeconds: number, travel: boolean): boolean {
    if (this.still) return false;
    const focus = $openTooltip.get()?.city ?? null;
    if (travel && !focus) this.rotate(deltaSeconds);

    const desired = focus ? this.focusKeys(focus) : this.restKeys;
    let busy = false;
    this.entries.forEach((entry) => {
      entry.target = desired.has(entry.pair.key);
      if (entry.target) {
        entry.wait = Math.max(0, entry.wait - deltaSeconds);
        entry.fade = Math.min(1, entry.fade + deltaSeconds / (FADE_OUT_SECONDS * 0.5));
        if (entry.wait <= 0) entry.draw = Math.min(1, entry.draw + deltaSeconds / DRAW_SECONDS);
        if (travel) entry.travelClock += deltaSeconds;
        busy ||= entry.draw < 1;
        return;
      }
      if (entry.fade <= 0) return;
      entry.fade = Math.max(0, entry.fade - deltaSeconds / FADE_OUT_SECONDS);
      if (entry.fade <= 0) this.hide(entry);
      busy = true;
    });
    this.apply(travel);
    return busy;
  }

  /** The closest (or related) cities to `city`, up to the focus limit. */
  private focusKeys(city: DestinationId): Set<string> {
    const related = destinations.find(({ id }) => id === city)?.related ?? [];
    const rank = ({ from, to, span }: Pair) => (related.includes(from === city ? to : from) ? 10 : 0) - span;
    const keys = this.pairs
      .filter(({ from, to }) => from === city || to === city)
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, MAX_FOCUS_ARCS);
    return new Set(
      keys.map((pair) => {
        const entry = this.entryFor(pair);
        if (!entry.target && entry.fade <= 0) entry.wait = 0;
        return pair.key;
      }),
    );
  }

  private entryFor(pair: Pair): Entry {
    const existing = this.entries.get(pair.key);
    if (existing) return existing;
    const arc = createArc(this.points.get(pair.from) as Vector3, this.points.get(pair.to) as Vector3);
    arc.dotUniforms.uSize.value = 5 * this.pixelRatio;
    this.group.add(arc.line, arc.dot);
    const entry: Entry = { pair, arc, target: false, draw: 0, fade: 0, wait: 0, born: this.born++, travelClock: -1 };
    this.entries.set(pair.key, entry);
    return entry;
  }

  private hide(entry: Entry) {
    entry.target = false;
    entry.draw = 0;
    entry.fade = 0;
    entry.arc.line.visible = false;
    entry.arc.dot.visible = false;
  }

  /** Every few seconds: swap the oldest rest arc for a fresh pair, favouring long, distant ones. */
  private rotate(deltaSeconds: number) {
    this.rotateIn -= deltaSeconds;
    if (this.rotateIn > 0) return;
    this.rotateIn = randomBetween(ROTATE_MIN, ROTATE_MAX);
    const next = this.pickNextPair();
    if (!next) return;
    if (this.restKeys.size >= MAX_REST_ARCS) {
      const oldest = [...this.restKeys].map((key) => this.entries.get(key) as Entry).sort((a, b) => a.born - b.born)[0];
      this.restKeys.delete(oldest.pair.key);
    }
    this.restKeys.add(next.key);
    const entry = this.entryFor(next);
    entry.born = this.born++;
    entry.wait = 0.4;
    entry.travelClock = -2.5;
  }

  private pickNextPair(): Pair | null {
    const shownCities = new Map<DestinationId, number>();
    this.restKeys.forEach((key) => {
      const { from, to } = (this.entries.get(key) as Entry).pair;
      shownCities.set(from, (shownCities.get(from) ?? 0) + 1);
      shownCities.set(to, (shownCities.get(to) ?? 0) + 1);
    });
    const pool = this.pairs.filter(({ key }) => !this.restKeys.has(key) && (this.entries.get(key)?.fade ?? 0) <= 0);
    const score = ({ from, to, span }: Pair) =>
      (span * randomBetween(0.6, 1.4)) / (1 + 0.45 * ((shownCities.get(from) ?? 0) + (shownCities.get(to) ?? 0)));
    return pool.sort((a, b) => score(b) - score(a))[0] ?? null;
  }

  private apply(travel: boolean) {
    this.entries.forEach((entry) => {
      const { arc } = entry;
      const drawn = this.still ? 1 : smooth(entry.draw);
      arc.uniforms.uDraw.value = drawn;
      arc.uniforms.uFade.value = this.still ? 1 : smooth(entry.fade);
      arc.line.visible = drawn > 0 && entry.fade > 0;

      const cycle = ((entry.travelClock % TRAVEL_PERIOD) + TRAVEL_PERIOD) % TRAVEL_PERIOD;
      const t = cycle / TRAVEL_SECONDS;
      const moving = !this.still && travel && entry.target && entry.draw >= 1 && entry.travelClock >= 0 && t < 1;
      arc.dot.visible = moving;
      arc.uniforms.uHead.value = moving ? smooth(t) : -1;
      if (!moving) return;
      const position = arc.dot.geometry.getAttribute('position');
      pointAlong(arc.points, smooth(t), this.scratch).toArray(position.array as Float32Array);
      position.needsUpdate = true;
      arc.dotUniforms.uOpacity.value = Math.sqrt(Math.sin(Math.PI * t)) * entry.fade;
    });
  }
}

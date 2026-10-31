import { BufferAttribute, BufferGeometry, Color, Group, Points, ShaderMaterial, type Vector3 } from 'three';
import { cities, type DestinationId } from '../../../cities';
import { latLonToVector3 } from './geo';
import { PALETTE } from './palette';

/** Side of the square each marker is drawn in, in CSS pixels (the dot and its ring live inside). */
const BOX = 40;
/** Same look as the HTML hotspots: a 10 px amber dot with a dark keyline and a slow ring (4.8 s). */
const DOT_RADIUS = 5;
const KEYLINE_RADIUS = 7;
const RING_MAX_RADIUS = 18;
const PULSE_SECONDS = 4.8;
const PULSE_STAGGER = 1.7;
/** Just above the surface, so the dot never fights the sphere for depth. The HTML hotspots project the same point. */
export const MARKER_LIFT = 1.004;
const RENDER_ORDER = 10;
/** Share of its view distance the sprite's depth moves toward the camera (bigger = survives steeper surface and bigger dots). */
const DEPTH_PUSH = 0.05;

const glsl = (value: number) => value.toFixed(1);

const VERTEX = /* glsl */ `
  uniform float uSize;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    // A point sprite has one depth for all its pixels, so the globe surface that curves toward the camera under its lower
    // half hides it. Bring its depth (not its position) forward by a share of its distance, enough to clear that surface.
    vec4 pushed = projectionMatrix * vec4(view.xy, view.z + ${DEPTH_PUSH.toFixed(3)} * -view.z, 1.0);
    gl_Position.z = pushed.z / pushed.w * gl_Position.w;
    gl_PointSize = uSize;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uInk;
  uniform float uOpacity;
  uniform float uScale;
  uniform float uTime;
  uniform float uPhase;
  // Close to CSS ease-out (cubic-bezier(0, 0, 0.58, 1)).
  float easeOut(float x) {
    return 1.0 - (1.0 - x) * (1.0 - x);
  }

  void main() {
    float r = length(gl_PointCoord - 0.5) * ${glsl(BOX)};
    float aa = 1.0 / uScale;
    float dotMask = 1.0 - smoothstep(${glsl(DOT_RADIUS)} - aa, ${glsl(DOT_RADIUS)} + aa, r);
    float keyline = 1.0 - smoothstep(${glsl(KEYLINE_RADIUS)} - aa, ${glsl(KEYLINE_RADIUS)} + aa, r);
    float phase = fract((uTime + uPhase) / ${glsl(PULSE_SECONDS)});
    // The curve of the CSS ring (the-overlay-pulse, ease-out): it grows over the whole cycle, fades in to 12 % and out after.
    float ringRadius = mix(${glsl(DOT_RADIUS)}, ${glsl(RING_MAX_RADIUS)}, easeOut(phase));
    float ringAlpha = phase < 0.12 ? easeOut(phase / 0.12) : 1.0 - easeOut((phase - 0.12) / 0.88);
    float ring = (1.0 - smoothstep(0.4 * aa, 1.4 * aa, abs(r - ringRadius))) * 0.7 * ringAlpha;
    float alpha = max(keyline, ring) * uOpacity;
    if (alpha < 0.01) discard;
    float amber = clamp(max(dotMask, ring * (1.0 - keyline)), 0.0, 1.0);
    gl_FragColor = vec4(mix(uInk, uColor, amber), alpha);
  }
`;

interface Marker {
  points: Points;
  uniforms: Record<'uOpacity' | 'uScale' | 'uTime' | 'uSize', { value: number }>;
}

/**
 * The city dots drawn inside the globe scene (same look as the HTML hotspots). They only show during a trip: the HTML
 * ones cannot be captured in the snapshot nor follow the camera dive, these do both. Constant size in pixels, growing a
 * little with the dive; the destination's dot is drawn on top of the others.
 */
export class HotspotMarkers {
  readonly group = new Group();
  private readonly markers = new Map<DestinationId, Marker>();
  private pixelRatio = 1;
  private scale = 1;

  constructor() {
    this.group.name = 'globe-hotspot-markers';
    cities.forEach(({ id, coordinates }, index) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
      const uniforms = {
        uColor: { value: new Color(PALETTE.amber) },
        uInk: { value: new Color(PALETTE.ink) },
        uOpacity: { value: 0 },
        uScale: { value: 1 },
        uTime: { value: 0 },
        uPhase: { value: index * PULSE_STAGGER },
        uSize: { value: BOX },
      };
      const points = new Points(
        geometry,
        new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, transparent: true, depthWrite: false }),
      );
      const position: Vector3 = latLonToVector3(coordinates.lat, coordinates.lon).multiplyScalar(MARKER_LIFT);
      points.position.copy(position);
      points.frustumCulled = false;
      points.renderOrder = RENDER_ORDER;
      points.visible = false;
      this.group.add(points);
      this.markers.set(id, { points, uniforms });
    });
  }

  setPixelRatio(pixelRatio: number) {
    this.pixelRatio = pixelRatio;
    this.applySize();
  }

  /** 1 = the usual size; the dots grow a little as the camera dives. */
  setScale(scale: number) {
    this.scale = scale;
    this.applySize();
  }

  setOpacity(opacity: number) {
    this.markers.forEach(({ points, uniforms }) => {
      uniforms.uOpacity.value = opacity;
      points.visible = opacity > 0;
    });
  }

  setTime(seconds: number) {
    this.markers.forEach(({ uniforms }) => (uniforms.uTime.value = seconds));
  }

  /** The destination of the trip: its dot is drawn over the rest. */
  setTarget(target: string | null) {
    this.markers.forEach(({ points }, id) => (points.renderOrder = id === target ? RENDER_ORDER + 1 : RENDER_ORDER));
  }

  dispose() {
    this.markers.forEach(({ points }) => {
      points.geometry.dispose();
      (points.material as ShaderMaterial).dispose();
    });
  }

  private applySize() {
    this.markers.forEach(({ uniforms }) => {
      uniforms.uScale.value = this.scale;
      uniforms.uSize.value = BOX * this.scale * this.pixelRatio;
    });
  }
}

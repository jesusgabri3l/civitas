import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2 } from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';
import { PALETTE } from './palette';
import { seededRandom, starCount } from './ambient';

export interface StarLayerSpec {
  name: 'dust' | 'stars' | 'bright';
  count: number;
  /** Distance behind the globe, in globe radii. */
  depth: [number, number];
  /** Point size in CSS px. */
  size: [number, number];
  alpha: [number, number];
  /** Share of points that twinkle, and how deep the dip goes (0..1). */
  twinkleShare: number;
  twinkleDepth: number;
  /** Radians per second of the slow twinkle. */
  twinkleSpeed: number;
  /** Slow sideways drift, in world units per second. Near layers move faster. */
  drift: number;
}

export const STAR_LAYERS: StarLayerSpec[] = [
  { name: 'dust', count: 320, depth: [6, 14], size: [1.4, 2.6], alpha: [0.22, 0.5], twinkleShare: 0.2, twinkleDepth: 0.4, twinkleSpeed: 0.5, drift: 0.05 },
  { name: 'stars', count: 640, depth: [22, 38], size: [1.5, 2.8], alpha: [0.5, 0.95], twinkleShare: 0.4, twinkleDepth: 0.6, twinkleSpeed: 0.8, drift: 0.02 },
  { name: 'bright', count: 56, depth: [44, 70], size: [3.4, 5.6], alpha: [0.85, 1], twinkleShare: 0.6, twinkleDepth: 0.45, twinkleSpeed: 0.55, drift: 0.008 },
];

/** Vertical half-extent of the star slab, in tan(half fov) x distance units. */
const STAR_REACH_Y = 2.2;

/** Slide of a unit-near layer at the pointer's edge, in world units. */
const PARALLAX_REACH = 1.1;

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aPhase;
  attribute float aTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkleSpeed;
  uniform vec2 uParallax;
  uniform float uStretch;
  uniform float uNear;
  uniform float uDrift;
  uniform float uHalfWidth;
  varying float vAlpha;
  void main() {
    // Nearer layers slide more with the pointer, and rush outward when zooming in.
    vec3 shifted = position;
    shifted.x = mod(shifted.x + uDrift * uTime + uHalfWidth, 2.0 * uHalfWidth) - uHalfWidth;
    shifted.xy += uParallax * uNear;
    shifted.xy *= 1.0 + uStretch * uNear * 0.6;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(shifted, 1.0);
    float dip = aTwinkle * (0.5 + 0.5 * sin(uTime * uTwinkleSpeed + aPhase));
    vAlpha = aAlpha * (1.0 - dip);
    gl_PointSize = aSize * uPixelRatio * (1.0 + abs(uStretch) * uNear * 1.5);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = smoothstep(1.0, 0.15, distanceToCenter) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Half-extent of the slab where stars live: the view frustum at that depth, wide enough for ultrawide and zoom out. */
function halfExtent(depth: number): { x: number; y: number } {
  const tan = Math.tan((20 * Math.PI) / 180);
  // The stacked layout slides the picture a lot (the globe sits low, the top of the screen is far above the camera axis),
  // so the vertical reach is about twice the plain frustum.
  return { x: (depth + 5) * tan * 2.64, y: (depth + 5) * tan * STAR_REACH_Y };
}

/**
 * Half-width of the band a layer drifts around (the drift wraps at +-this). Stars are spread over the WHOLE band, not just
 * over their own depth's frustum: otherwise the drift slides them off one side and leaves an empty strip there.
 */
function layerHalfWidth(spec: StarLayerSpec): number {
  return halfExtent(spec.depth[1]).x;
}

function createLayer(spec: StarLayerSpec, density: number, seed: number): Points {
  const halfWidth = layerHalfWidth(spec);
  // Same density as the original sky (frustum x1.1 vertically): the slab is wider and taller than that.
  const count = starCount(
    Math.round(spec.count * (halfWidth / halfExtent((spec.depth[0] + spec.depth[1]) / 2).x) * (STAR_REACH_Y / 1.1)),
    density,
  );
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const depth = spec.depth[0] + random() * (spec.depth[1] - spec.depth[0]);
    const extent = halfExtent(depth);
    positions.set([(random() * 2 - 1) * halfWidth, (random() * 2 - 1) * extent.y, -depth], i * 3);
    sizes[i] = spec.size[0] + random() * (spec.size[1] - spec.size[0]);
    alphas[i] = spec.alpha[0] + random() * (spec.alpha[1] - spec.alpha[0]);
    phases[i] = random() * Math.PI * 2;
    twinkles[i] = random() < spec.twinkleShare ? spec.twinkleDepth : 0;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new BufferAttribute(alphas, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  geometry.setAttribute('aTwinkle', new BufferAttribute(twinkles, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uTwinkleSpeed: { value: spec.twinkleSpeed },
      uParallax: { value: new Vector2() },
      uStretch: { value: 0 },
      uDrift: { value: spec.drift },
      uHalfWidth: { value: halfWidth },
      // 1 for the nearest layer, towards 0 for the farthest.
      uNear: { value: 20 / (spec.depth[0] + spec.depth[1]) },
      uColor: { value: new Color(PALETTE.text) },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.name = `stars-${spec.name}`;
  points.frustumCulled = false;
  // Hidden from the G-buffer pass: the sky never takes part in ambient occlusion.
  points.layers.set(SKY_LAYER);
  return points;
}

/** Three Points layers (dust, stars, bright stars): one draw call each, all animation in the vertex shader. */
export class StarField {
  readonly layers: Points[];

  constructor(density: number) {
    this.layers = STAR_LAYERS.map((spec, index) => createLayer(spec, density, 1000 + index * 77));
  }

  setTime(seconds: number) {
    this.uniform('uTime', seconds);
  }

  /** Pointer position -1..1: layers slide opposite to it, up to about 2.5 degrees of apparent tilt. */
  setParallax(x: number, y: number) {
    for (const layer of this.layers) {
      const uniforms = (layer.material as ShaderMaterial).uniforms;
      uniforms.uParallax.value.set(-x * PARALLAX_REACH, y * PARALLAX_REACH);
    }
  }

  /** Zoom amount (positive zooming in): stars rush outward and swell a little. */
  setStretch(amount: number) {
    this.uniform('uStretch', Math.max(-0.5, Math.min(0.5, amount)));
  }

  setPixelRatio(ratio: number) {
    this.uniform('uPixelRatio', ratio);
  }

  get pointCount() {
    return this.layers.reduce((total, layer) => total + layer.geometry.getAttribute('position').count, 0);
  }

  private uniform(name: string, value: number) {
    for (const layer of this.layers) (layer.material as ShaderMaterial).uniforms[name].value = value;
  }
}

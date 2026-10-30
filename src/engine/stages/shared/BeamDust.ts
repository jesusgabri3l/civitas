import { AdditiveBlending, NormalBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';
import { createRandom } from '../../utils/random';

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uSunDirection;
  uniform float uBaseAlpha;
  uniform vec3 uBeamApex;
  uniform vec3 uBeamAxis;
  uniform float uBeamTan;
  attribute vec3 aSeed;
  varying float vAlpha;
  void main() {
    // Bounded drift: sines of different periods per mote, so it never leaves its box.
    vec3 drift = vec3(
      sin(uTime * (0.05 + aSeed.x * 0.09) + aSeed.y * 40.0),
      sin(uTime * (0.04 + aSeed.y * 0.06) + aSeed.z * 40.0) * 0.6,
      cos(uTime * (0.05 + aSeed.z * 0.08) + aSeed.x * 40.0)
    ) * (2.0 + aSeed.x * 4.0);
    vec3 moved = position + drift;
    vec4 view = modelViewMatrix * vec4(moved, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(uSize * uPixelRatio * (70.0 / -view.z), 1.0, 22.0 * uPixelRatio);

    // Forward scattering: the motes glow when the camera looks toward the sun.
    vec3 looking = normalize((modelMatrix * vec4(moved, 1.0)).xyz - cameraPosition);
    float alignment = pow(max(dot(looking, uSunDirection), 0.0), 3.0);
    float twinkle = 0.65 + 0.35 * sin(uTime * 0.8 + aSeed.y * 60.0);
    vAlpha = (uBaseAlpha + (1.0 - uBaseAlpha) * alignment) * twinkle;

    // Spot cone: motes shine inside it and nearly vanish outside (uBeam.w = 0 disables the mask).
    if (uBeamTan > 0.0) {
      vec3 fromApex = moved - uBeamApex;
      float along = dot(fromApex, uBeamAxis);
      float radial = length(fromApex - uBeamAxis * along);
      float inside = along > 0.0 ? 1.0 - smoothstep(0.55, 1.0, radial / (along * uBeamTan)) : 0.0;
      vAlpha = vAlpha * inside;
      // Forward scattering is meaningless under a lamp: inside the cone they simply glow.
      vAlpha = max(vAlpha, inside * uBaseAlpha * twinkle * 2.4);
    }
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uCone;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // Soft round puff (no hard bright core): gaussian-like falloff.
    float disc = exp(-d * d * 3.0) * step(d, 1.0);
    gl_FragColor = vec4(uColor * (uCone > 0.5 ? 1.0 : 2.2), disc * vAlpha * (uCone > 0.5 ? 0.5 : 0.85));
  }
`;

/** Floating dust in the light: one `Points`, animated in the vertex shader (the CPU only moves a time uniform). */
export interface DustStyle {
  /** Color of the motes. */
  color?: number;
  /** Drawn normally (dark motes on a light background) instead of as light. */
  normal?: boolean;
  /** Share of the glow they keep when the camera looks away from the sun (0..1). */
  baseAlpha?: number;
  size?: number;
  /** Overhead lamp: motes only glow inside its cone (positions in meters, `angle` is the half-angle in degrees). */
  cone?: { apex: [number, number, number]; target: [number, number, number]; angle: number };
}

export class BeamDust {
  readonly points: Points<BufferGeometry, ShaderMaterial>;

  /** `style.normal`: dust seen against a light flat background. Additive light would vanish there, so the motes are drawn normally. */
  constructor(count: number, sunDirection: Vector3, seed: number, style: DustStyle = {}) {
    const { color = 0xffd9a3, normal = false, baseAlpha = 0.1, size = 2.4, cone } = style;
    const apex = new Vector3(...(cone?.apex ?? [0, 0, 0]));
    const axis = new Vector3(...(cone?.target ?? [0, -1, 0])).sub(apex).normalize();
    const random = createRandom(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      // A box around the temple that also reaches the camera side, where big blurry motes give depth.
      positions[index * 3] = (random() - 0.65) * 170;
      positions[index * 3 + 1] = 1 + random() * 30;
      positions[index * 3 + 2] = (random() - 0.35) * 150;
      seeds.set([random(), random(), random()], index * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 3));
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uBaseAlpha: { value: baseAlpha },
        uPixelRatio: { value: 1 },
        uBeamApex: { value: apex },
        uBeamAxis: { value: axis },
        uCone: { value: cone ? 1 : 0 },
        uBeamTan: { value: cone ? Math.tan((cone.angle * Math.PI) / 180) : 0 },
        uSunDirection: { value: sunDirection.clone().normalize() },
        uColor: { value: normal ? new Color(color).multiplyScalar(1 / 2.2) : new Color(color) },
      },
      transparent: true,
      depthWrite: false,
      blending: normal ? NormalBlending : AdditiveBlending,
    });
    this.points = new Points(geometry, material);
    this.points.name = 'dust';
    // Same layer as the sky: out of the G-buffer pass, so the motes do not count as shapes for the AO or the rays.
    this.points.layers.set(SKY_LAYER);
    this.points.frustumCulled = false;
  }

  /** The sun moved: the motes glow toward its new direction. */
  setSunDirection(direction: Vector3) {
    this.points.material.uniforms.uSunDirection.value.copy(direction).normalize();
  }

  /** Moves the lamp cone the motes are masked by (live tuning). */
  setCone(apex: [number, number, number], target: [number, number, number], angleDegrees: number) {
    const { uniforms } = this.points.material;
    uniforms.uBeamApex.value.set(...apex);
    uniforms.uBeamAxis.value.set(...target).sub(uniforms.uBeamApex.value).normalize();
    uniforms.uBeamTan.value = Math.tan((angleDegrees * Math.PI) / 180);
  }

  setTime(seconds: number) {
    this.points.material.uniforms.uTime.value = seconds;
  }

  setPixelRatio(ratio: number) {
    this.points.material.uniforms.uPixelRatio.value = ratio;
  }
}

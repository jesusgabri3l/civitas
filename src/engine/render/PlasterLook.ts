import { Color, ShaderMaterial, Vector2, type Texture } from 'three';
import { COMMON_FRAGMENT, SCREEN_VERTEX } from './shaderChunks';

/** Per-scene look settings: every stage hands its own to the pipeline. */
export interface PlasterSettings {
  exposure: number;
  aoStrength: number;
  aoRadius: number;
  grain: number;
  warmth: number;
  vignette: number;
  /** 0..1: how much of the filmic tone curve is applied (0 keeps flat, palette-true colors). */
  filmic: number;
}

export const DEFAULT_PLASTER: PlasterSettings = {
  exposure: 1,
  aoStrength: 0.8,
  aoRadius: 2,
  grain: 0.03,
  warmth: 0.6,
  vignette: 0.15,
  filmic: 1,
};

export interface LookFrame {
  color: Texture;
  gbuffer: Texture | null;
  depth: Texture | null;
  screenSize: Vector2;
  pixelRatio: number;
  tanHalfFov: number;
  near: number;
  far: number;
  settings: PlasterSettings;
  fadeAmount: number;
  fadeColor: Color;
}

const FRAGMENT = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tGBuffer;
  uniform sampler2D tDepth;
  uniform float uTanHalfFov;
  uniform float uNear;
  uniform float uFar;
  uniform float uExposure;
  uniform float uAoStrength;
  uniform float uAoRadius;
  uniform float uGrain;
  uniform float uWarmth;
  uniform float uVignette;
  uniform float uFilmic;
  uniform float uFade;
  uniform vec3 uFadeColor;

  // Linear distance in meters. Reads the G-buffer, or the depth texture of the color pass on the low preset.
  float sceneDepth(vec2 uv) {
  #ifdef USE_DEPTH_TEXTURE
    float d = texture2D(tDepth, uv).x;
    if (d >= 0.99999) return 100000.0;
    float z = d * 2.0 - 1.0;
    return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
  #else
    return gbufferDepth(texture2D(tGBuffer, uv));
  #endif
  }

  // Cheap screen-space ambient occlusion: 12 spiral samples over linear depth.
  float ambientOcclusion(vec2 px, vec2 uv, float centerDepth) {
    float radiusPx = clamp(uAoRadius * uResolution.y / (2.0 * uTanHalfFov * centerDepth), 3.0, 120.0);
    float turn = hash12(px) * 6.2831853;
    float occlusion = 0.0;
    for (int i = 0; i < 12; i++) {
      float step01 = (float(i) + 0.5) / 12.0;
      float angle = float(i) * 2.3999632 + turn;
      vec2 offset = vec2(cos(angle), sin(angle)) * step01 * radiusPx / uResolution;
      float difference = centerDepth - sceneDepth(uv + offset);
      float rangeCheck = smoothstep(0.0, 1.0, uAoRadius / max(abs(difference), 0.001));
      occlusion += step(0.05, difference) * rangeCheck * (1.0 - step01 * 0.35);
    }
    return occlusion / 12.0;
  }

  vec3 filmic(vec3 c) {
    return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec2 px = vUv * uResolution;
    vec3 color = texture2D(tColor, vUv).rgb;

    // Stages that turn AO off (strength 0) skip both the depth read and the 12 samples.
    if (uAoStrength > 0.0) {
      float depth = sceneDepth(vUv);
      if (depth < 50000.0) {
        float occlusion = ambientOcclusion(px, vUv, depth);
        color *= 1.0 - clamp(occlusion * uAoStrength * 1.5, 0.0, 0.85);
      }
    }

    color = mix(color * uExposure, filmic(color * uExposure), uFilmic);
    color *= mix(vec3(1.0), vec3(1.035, 0.99, 0.925), uWarmth);
    vec2 centered = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    color *= 1.0 - uVignette * dot(centered, centered);
    color += (hash12(px + 17.0) - 0.5) * uGrain;
    color = mix(max(color, 0.0), uFadeColor, uFade);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    // Output dither, after the sRGB encode and whatever the grain setting: long dark gradients (vignette, glows) would band in 8 bits.
    gl_FragColor.rgb += (hash12(px + 53.0) + hash12(px + 91.0) - 1.0) / 255.0;
  }
`;

/** Plaster-model look: warm light, soft shadows, subtle ambient occlusion and grain. */
export class PlasterLook {
  readonly material: ShaderMaterial;

  constructor() {
    this.material = new ShaderMaterial({
      vertexShader: SCREEN_VERTEX,
      fragmentShader: `${COMMON_FRAGMENT}\n${FRAGMENT}`,
      uniforms: {
        tColor: { value: null },
        tGBuffer: { value: null },
        tDepth: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uPixelRatio: { value: 1 },
        uTanHalfFov: { value: 0.3 },
        uNear: { value: 0.1 },
        uFar: { value: 100 },
        uExposure: { value: 1 },
        uAoStrength: { value: 0.8 },
        uAoRadius: { value: 2 },
        uGrain: { value: 0.03 },
        uWarmth: { value: 0.6 },
        uVignette: { value: 0.15 },
        uFilmic: { value: 1 },
        uFade: { value: 0 },
        uFadeColor: { value: new Color() },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  /** Low preset: AO reads the depth texture of the color pass instead of a G-buffer. */
  useDepthTexture(enabled: boolean) {
    if (enabled === ('USE_DEPTH_TEXTURE' in this.material.defines)) return;
    if (enabled) this.material.defines.USE_DEPTH_TEXTURE = '';
    else delete this.material.defines.USE_DEPTH_TEXTURE;
    this.material.needsUpdate = true;
  }

  update(frame: LookFrame) {
    const { uniforms } = this.material;
    uniforms.tColor.value = frame.color;
    uniforms.tGBuffer.value = frame.gbuffer;
    uniforms.tDepth.value = frame.depth;
    (uniforms.uResolution.value as Vector2).copy(frame.screenSize);
    uniforms.uPixelRatio.value = frame.pixelRatio;
    uniforms.uTanHalfFov.value = frame.tanHalfFov;
    uniforms.uNear.value = frame.near;
    uniforms.uFar.value = frame.far;
    uniforms.uExposure.value = frame.settings.exposure;
    uniforms.uAoStrength.value = frame.settings.aoStrength;
    uniforms.uAoRadius.value = frame.settings.aoRadius;
    uniforms.uGrain.value = frame.settings.grain;
    uniforms.uWarmth.value = frame.settings.warmth;
    uniforms.uVignette.value = frame.settings.vignette;
    uniforms.uFilmic.value = frame.settings.filmic;
    uniforms.uFade.value = frame.fadeAmount;
    (uniforms.uFadeColor.value as Color).copy(frame.fadeColor);
  }

  dispose() {
    this.material.dispose();
  }
}

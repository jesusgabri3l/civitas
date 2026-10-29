import { FramebufferTexture, ShaderMaterial, Vector2, type WebGLRenderer } from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { SCREEN_VERTEX } from './shaderChunks';

export type SnapshotSlot = 0 | 1;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tSnapshot;
  uniform float uOpacity;
  uniform float uScale;
  uniform vec2 uAnchor;
  uniform vec2 uResolution;
  uniform float uReveal;

  // Signed distance to a rounded box centered on the origin (negative inside).
  float roundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - (halfSize - radius);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    float pixel = 1.0 / uResolution.y;
    vec2 uv = uAnchor + (vUv - uAnchor) / uScale;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    float alpha = uOpacity;

    // Reveal: a rounded window grows from the anchor and shows what is under the snapshot.
    if (uReveal > 0.0) {
      vec2 p = (vUv - uAnchor) * vec2(aspect, 1.0);
      vec2 far = vec2(max(uAnchor.x, 1.0 - uAnchor.x) * aspect, max(uAnchor.y, 1.0 - uAnchor.y)) + 0.06;
      vec2 halfSize = far * uReveal;
      float radius = min(0.06, min(halfSize.x, halfSize.y));
      alpha *= smoothstep(-1.5 * pixel, 1.5 * pixel, roundedBox(p, halfSize, radius));
    }

    gl_FragColor = vec4(texture2D(tSnapshot, uv).rgb, alpha);
  }
`;

/**
 * Two copies of the last frames shown on the canvas (already tone mapped and encoded), so the stage that leaves can
 * stay over the one that arrives. Two slots because the newest frame keeps being captured while the older one is on screen.
 */
export class FrameSnapshots {
  private readonly textures: Array<FramebufferTexture | null> = [null, null];
  private readonly quad = new FullScreenQuad();
  private readonly material = new ShaderMaterial({
    vertexShader: SCREEN_VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      tSnapshot: { value: null },
      uOpacity: { value: 1 },
      uScale: { value: 1 },
      uAnchor: { value: new Vector2(0.5, 0.5) },
      uResolution: { value: new Vector2(1, 1) },
      uReveal: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  constructor(private readonly renderer: WebGLRenderer) {
    this.quad.material = this.material;
  }

  /** Reallocates for the drawing buffer size (contents are lost). */
  resize(width: number, height: number) {
    this.textures.forEach((texture) => texture?.dispose());
    this.textures[0] = new FramebufferTexture(width, height);
    this.textures[1] = new FramebufferTexture(width, height);
    (this.material.uniforms.uResolution.value as Vector2).set(width, height);
  }

  /** Copies the canvas (the bound framebuffer) into a slot. */
  capture(slot: SnapshotSlot) {
    const texture = this.textures[slot];
    if (texture) this.renderer.copyFramebufferToTexture(texture);
  }

  /**
   * Draws a slot over the canvas. `anchor` is in viewport fractions from the top left. `reveal` (0..1, 0 = off) opens a
   * rounded window from the anchor.
   */
  draw(slot: SnapshotSlot, opacity: number, scale: number, anchor: Vector2, reveal = 0) {
    const texture = this.textures[slot];
    if (!texture || opacity <= 0) return;
    const { uniforms } = this.material;
    uniforms.tSnapshot.value = texture;
    uniforms.uOpacity.value = opacity;
    uniforms.uScale.value = scale;
    uniforms.uReveal.value = reveal;
    (uniforms.uAnchor.value as Vector2).set(anchor.x, 1 - anchor.y);
    // Blend over the arriving stage already on the canvas: an auto clear would wipe it and make it pop in at the end.
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.quad.render(this.renderer);
    this.renderer.autoClear = autoClear;
  }

  dispose() {
    this.textures.forEach((texture) => texture?.dispose());
    this.quad.dispose();
    this.material.dispose();
  }
}

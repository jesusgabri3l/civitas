import {
  Color,
  DepthTexture,
  DoubleSide,
  FloatType,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { QualitySettings } from '../quality/qualityTier';
import { PlasterLook, type PlasterSettings } from './PlasterLook';

/** Layer of the sky dome: hidden from the G-buffer pass. */
export const SKY_LAYER = 1;

// View-space normals (rgb, encoded 0..1) and linear depth in meters (a). Sky stays at a = 0.
const GBUFFER_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying float vViewDepth;
  #include <common>
  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    vNormal = transformedNormal;
    vViewDepth = -mvPosition.z;
  }
`;

const GBUFFER_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying float vViewDepth;
  void main() {
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal = -normal;
    gl_FragColor = vec4(normal * 0.5 + 0.5, vViewDepth);
  }
`;

const GBUFFER_CLEAR = new Color(0.5, 0.5, 1.0);

export interface FadeState {
  amount: number;
  color: Color;
}

/**
 * One scene pass (lit, optional MSAA) into a float target, plus a G-buffer pass when the quality tier allows it.
 * A full-screen plaster pass finishes the frame. The look settings come from the scene being rendered.
 */
export class LookPipeline {
  private readonly look = new PlasterLook();
  private readonly quad = new FullScreenQuad();
  private readonly gbufferMaterial = new ShaderMaterial({
    vertexShader: GBUFFER_VERTEX,
    fragmentShader: GBUFFER_FRAGMENT,
    side: DoubleSide,
  });
  private readonly screenSize = new Vector2(1, 1);
  private readonly clearColor = new Color();
  private sceneTarget: WebGLRenderTarget | null = null;
  private gbufferTarget: WebGLRenderTarget | null = null;
  private readonly supportsFloatTarget: boolean;
  private readonly supportsHalfFloatTarget: boolean;

  constructor(
    private readonly renderer: WebGLRenderer,
    private quality: QualitySettings,
  ) {
    this.supportsFloatTarget = renderer.extensions.has('EXT_color_buffer_float');
    this.supportsHalfFloatTarget = this.supportsFloatTarget || renderer.extensions.has('EXT_color_buffer_half_float');
    this.look.useDepthTexture(!quality.useGBuffer);
  }

  setQuality(quality: QualitySettings) {
    this.quality = quality;
    this.look.useDepthTexture(!quality.useGBuffer);
    this.resize();
  }

  /** Allocates targets for the current drawing buffer size and render scale. */
  resize() {
    const buffer = this.renderer.getDrawingBufferSize(this.screenSize);
    const { renderScale, msaaSamples, useGBuffer } = this.quality;
    const width = Math.max(2, Math.round(buffer.x * renderScale));
    const height = Math.max(2, Math.round(buffer.y * renderScale));

    this.sceneTarget?.dispose();
    this.sceneTarget = new WebGLRenderTarget(width, height, {
      type: this.supportsHalfFloatTarget ? HalfFloatType : undefined,
      samples: useGBuffer ? msaaSamples : 0,
      generateMipmaps: true,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
    });
    if (!useGBuffer) this.sceneTarget.depthTexture = new DepthTexture(width, height);

    this.gbufferTarget?.dispose();
    this.gbufferTarget = null;
    if (useGBuffer) {
      this.gbufferTarget = new WebGLRenderTarget(width, height, {
        type: this.supportsFloatTarget ? FloatType : HalfFloatType,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        generateMipmaps: false,
      });
    }
  }

  render(scene: Scene, camera: PerspectiveCamera, settings: PlasterSettings, fade: FadeState) {
    if (!this.sceneTarget) this.resize();
    const sceneTarget = this.sceneTarget as WebGLRenderTarget;
    const renderer = this.renderer;

    renderer.info.reset();
    camera.layers.enable(SKY_LAYER);
    renderer.setRenderTarget(sceneTarget);
    renderer.render(scene, camera);

    if (this.gbufferTarget && settings.aoStrength > 0) {
      // Shape pass: no sky dome, and shadows are not recomputed.
      renderer.getClearColor(this.clearColor);
      const clearAlpha = renderer.getClearAlpha();
      const previousBackground = scene.background;
      renderer.setClearColor(GBUFFER_CLEAR, 0);
      scene.background = null;
      camera.layers.disable(SKY_LAYER);
      scene.overrideMaterial = this.gbufferMaterial;
      const autoUpdateShadows = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(this.gbufferTarget);
      renderer.render(scene, camera);
      renderer.shadowMap.autoUpdate = autoUpdateShadows;
      scene.overrideMaterial = null;
      scene.background = previousBackground;
      camera.layers.enable(SKY_LAYER);
      renderer.setClearColor(this.clearColor, clearAlpha);
    }

    this.look.update({
      color: sceneTarget.texture,
      gbuffer: this.gbufferTarget?.texture ?? null,
      depth: sceneTarget.depthTexture,
      screenSize: this.screenSize,
      pixelRatio: renderer.getPixelRatio(),
      tanHalfFov: Math.tan((camera.fov * Math.PI) / 360),
      near: camera.near,
      far: camera.far,
      settings,
      fadeAmount: fade.amount,
      fadeColor: fade.color,
    });

    renderer.setRenderTarget(null);
    this.quad.material = this.look.material;
    this.quad.render(renderer);
  }

  dispose() {
    this.sceneTarget?.dispose();
    this.gbufferTarget?.dispose();
    this.quad.dispose();
    this.gbufferMaterial.dispose();
    this.look.dispose();
  }
}

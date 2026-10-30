import { Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv - 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv) * 2.0;
    float fade = 1.0 - smoothstep(0.45, 1.0, d);
    gl_FragColor = vec4(uColor, fade * fade * uOpacity);
  }
`;

/** Diffuse contact shadow under the temple: a soft dark blob on an invisible floor (there is no ground or horizon). */
export class ContactShadow {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(color: number, opacity: number, width: number, depth: number) {
    this.mesh = new Mesh(
      new PlaneGeometry(width, depth),
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Vector3((color >> 16) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255) },
          uOpacity: { value: opacity },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -0.04;
    this.mesh.layers.set(SKY_LAYER);
    this.mesh.renderOrder = -1;
    this.mesh.name = 'contact-shadow';
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

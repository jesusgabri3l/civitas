import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SKY_LAYER } from '../../render/LookPipeline';
import type { MonumentEnvironment } from './monument';
import { getStoneTextures, STONE_TONE_PEAK, type StoneTextures } from './proceduralSurfaces';

const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

/** Soft volume: transparent at the apex and at the edges of the cone (seen edge-on), faint in between. */
const BEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;
  void main() {
    float alongBeam = 1.0 - vUv.y;
    float edgeSoftness = pow(abs(dot(normalize(vNormalView), normalize(vViewDirection))), 1.6);
    // Zero at both ends: a cone that stops with a hard rim shows up as a floating ellipse behind the temple.
    float fade = smoothstep(0.0, 0.35, alongBeam) * (1.0 - smoothstep(0.45, 0.95, alongBeam)) * (1.0 - 0.4 * alongBeam);
    gl_FragColor = vec4(uColor * uOpacity * edgeSoftness * fade, 1.0);
  }
`;

/** Half size of the floor: far past every camera pose, the fog of the stage swallows its edge (no horizon). */
const FLOOR_HALF = 900;

/**
 * What a maquette stands on (docs/ART-DIRECTION.md §6): a dark floor of the city's ground color that the fog dissolves, a stone
 * pedestal whose top is the base of the model, and the faint volume of the overhead spot. No walls.
 */
export class Exhibit {
  readonly mesh = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: (MeshStandardMaterial | ShaderMaterial)[] = [];
  private readonly stone: StoneTextures = getStoneTextures();

  constructor(env: MonumentEnvironment) {
    const { floor, pedestal } = env;
    const floorMaterial = new MeshStandardMaterial({ color: floor.color, roughness: floor.roughness, metalness: 0.15 });
    // Worn stone shared by the cities (grayscale): the tint is the material color; the canvas keeps the 4:1 aspect of the long faces.
    const pedestalMaterial = new MeshStandardMaterial({
      color: new Color(pedestal.color).multiplyScalar(STONE_TONE_PEAK),
      map: this.stone.map,
      roughness: 1,
      roughnessMap: this.stone.roughnessMap,
      bumpMap: this.stone.bumpMap,
      bumpScale: 0.6,
    });
    this.materials.push(floorMaterial, pedestalMaterial);

    const floorGeometry = new PlaneGeometry(FLOOR_HALF * 2, FLOOR_HALF * 2);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMesh = new Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = env.floorY;
    floorMesh.receiveShadow = true;

    const pedestalGeometry = new RoundedBoxGeometry(pedestal.width, pedestal.height, pedestal.depth, 3, pedestal.bevel);
    const pedestalMesh = new Mesh(pedestalGeometry, pedestalMaterial);
    pedestalMesh.position.y = env.floorY + pedestal.height / 2;
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;

    this.geometries.push(floorGeometry, pedestalGeometry);
    this.mesh.name = 'exhibit';
    this.mesh.add(floorMesh, pedestalMesh, this.buildBeam(env));
    this.mesh.traverse((object) => {
      object.frustumCulled = false;
    });
  }

  /** Faint additive cone from the lamp down to the pedestal, with soft edges and fading toward the model. */
  private buildBeam({ spot, beam }: MonumentEnvironment) {
    const apex = new Vector3(...spot.position);
    const aim = new Vector3(...spot.target);
    const direction = aim.clone().sub(apex);
    const length = direction.length();
    const radius = length * Math.tan((beam.angle * Math.PI) / 180);

    const geometry = new CylinderGeometry(0, radius, length, 64, 1, true);
    const material = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(beam.color) }, uOpacity: { value: beam.opacity } },
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    });
    this.geometries.push(geometry);
    this.materials.push(material);

    const mesh = new Mesh(geometry, material);
    mesh.name = 'exhibit-beam';
    mesh.position.copy(apex).add(aim).multiplyScalar(0.5);
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), direction.normalize()));
    mesh.renderOrder = 2;
    // Out of the shape pass: light is air, not a shape (in it, the ink line traced the edge of the cone).
    mesh.layers.set(SKY_LAYER);
    return mesh;
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.mesh.removeFromParent();
  }
}

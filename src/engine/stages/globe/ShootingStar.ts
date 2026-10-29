import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { SKY_LAYER } from '../../render/LookPipeline';
import { PALETTE } from './palette';

const LIFETIME = 1.4;
const TRAIL_LENGTH = 6;
const TRAIL_THICKNESS = 0.14;
const SPEED = 12;
const DEPTH = -20;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uLife;
  varying vec2 vUv;
  void main() {
    // Long tail that thins out behind, a needle-thin core, and a glowing head at the front (vUv.x = 1).
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float tail = pow(vUv.x, 3.0) * pow(across, 2.5);
    float core = pow(vUv.x, 6.0) * pow(across, 9.0) * 1.6;
    float head = exp(-pow((1.0 - vUv.x) * 38.0, 2.0)) * pow(across, 1.5) * 1.8;
    float envelope = smoothstep(0.0, 0.12, uLife) * (1.0 - smoothstep(0.55, 1.0, uLife));
    vec3 color = mix(uColor, vec3(1.0), clamp(core + head, 0.0, 1.0));
    gl_FragColor = vec4(color, clamp(tail * 0.7 + core + head, 0.0, 1.0) * envelope);
  }
`;

/** One streak that crosses the sky now and then. A single quad, hidden (not drawn) while idle. */
export class ShootingStar {
  readonly mesh: Mesh;
  private age = LIFETIME;
  private readonly velocity = { x: 0, y: 0 };

  constructor() {
    const geometry = new PlaneGeometry(TRAIL_LENGTH, TRAIL_THICKNESS);
    // The head is at +x: shift so the mesh origin is the head.
    geometry.translate(-TRAIL_LENGTH / 2, 0, 0);
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uColor: { value: new Color(PALETTE.text) }, uLife: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'shooting-star';
    this.mesh.layers.set(SKY_LAYER);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  get active() {
    return this.age < LIFETIME;
  }

  /** Starts a streak. `random` yields 0..1 samples (injectable for tests). */
  launch(random: () => number = Math.random) {
    const goesRight = random() < 0.5;
    const slope = 0.25 + random() * 0.55; // diagonal, always clearly tilted
    const angle = goesRight ? -slope : Math.PI + slope; // down-right or down-left
    this.velocity.x = Math.cos(angle) * SPEED;
    this.velocity.y = Math.sin(angle) * SPEED;
    this.mesh.rotation.z = angle;
    this.mesh.position.set((goesRight ? -10 : 10) + (random() - 0.5) * 6, 2 + random() * 4, DEPTH);
    this.age = 0;
    this.mesh.visible = true;
  }

  /** Drops the streak in flight (ambient animation paused). */
  cancel() {
    this.age = LIFETIME;
    this.mesh.visible = false;
  }

  update(deltaSeconds: number) {
    if (!this.active) return;
    this.age = Math.min(this.age + deltaSeconds, LIFETIME);
    this.mesh.position.x += this.velocity.x * deltaSeconds;
    this.mesh.position.y += this.velocity.y * deltaSeconds;
    (this.mesh.material as ShaderMaterial).uniforms.uLife.value = this.age / LIFETIME;
    this.mesh.visible = this.active;
  }
}

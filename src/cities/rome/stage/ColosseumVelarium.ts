import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, type MeshToonMaterial } from 'three';
import { applyExploreFocus, createToonPlaster } from '../../../engine/stages/shared/monument';
import { ACCENT, COLOSSEUM_MODEL, PLASTER, ROME_ENV, TINT } from './romeConfig';

const SEGMENTS = 96;
const ROWS = 4;
const accent = new Color(ACCENT);
const cloth = new Color(TINT.awning);
const ground = new Color(ROME_ENV.backdrop);

/**
 * The velarium: the awning that shaded the seats. A ring of cloth hung from the masts of the attic that unfurls toward the arena
 * (`open` 0..1): at 0 it is folded into the rim, at 1 it reaches down and in, leaving the center open.
 */
export class ColosseumVelarium {
  readonly mesh: Mesh<BufferGeometry, MeshToonMaterial>;
  private readonly plaster = createToonPlaster(TINT.awning, PLASTER.bands);
  private readonly positions = new Float32Array(SEGMENTS * (ROWS + 1) * 3);

  constructor() {
    const indices: number[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let index = 0; index < SEGMENTS; index++) {
        const next = (index + 1) % SEGMENTS;
        const a = row * SEGMENTS + index;
        const b = row * SEGMENTS + next;
        const c = (row + 1) * SEGMENTS + index;
        const d = (row + 1) * SEGMENTS + next;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    geometry.setIndex(indices);
    this.plaster.material.side = DoubleSide;
    this.mesh = new Mesh(geometry, this.plaster.material);
    this.mesh.name = 'colosseum-velarium';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.setOpen(0);
  }

  setOpen(open: number) {
    const { outer, wall, velarium } = COLOSSEUM_MODEL;
    const a = outer.a - wall / 2;
    const b = outer.b - wall / 2;
    for (let row = 0; row <= ROWS; row++) {
      const reach = (row / ROWS) * open;
      const ratio = 1 - (1 - velarium.openShare) * reach;
      const y = velarium.top - velarium.drop * reach;
      for (let index = 0; index < SEGMENTS; index++) {
        const angle = (index / SEGMENTS) * Math.PI * 2;
        this.positions.set([a * ratio * Math.cos(angle), y, b * ratio * Math.sin(angle)], (row * SEGMENTS + index) * 3);
      }
    }
    const { geometry } = this.mesh;
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    this.mesh.visible = open > 0.01;
  }

  /** Explore: `true` while its card is open (the accent), `false` while another part is chosen (it sinks), `null` for nothing chosen. */
  setFocus(chosen: boolean | null) {
    this.plaster.material.color.copy(cloth);
    if (chosen !== null) applyExploreFocus(this.plaster.material.color, chosen, accent, ground);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.plaster.dispose();
    this.mesh.removeFromParent();
  }
}

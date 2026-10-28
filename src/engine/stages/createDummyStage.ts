import {
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import type { StageId } from '../../state/appStore';
import { DEFAULT_PLASTER } from '../render/PlasterLook';
import type { Stage } from '../stage/Stage';
import { disposeObject } from '../utils/disposal';

export interface DummyStageConfig {
  id: StageId;
  skyColor: number;
  color: number;
  shape: () => BufferGeometry;
}

export const shapes = {
  sphere: () => new SphereGeometry(1.2, 48, 32),
  box: () => new BoxGeometry(1.8, 1.8, 1.8),
  cone: () => new ConeGeometry(1.2, 2.6, 40),
};

const INTRO_SECONDS = 1.2;

/** Placeholder stage: one colored shape over a ground plane, with a short intro spin to exercise render on demand. */
export function createDummyStage({ id, skyColor, color, shape }: DummyStageConfig): Stage {
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 60);
  camera.position.set(0, 2.2, 6);
  camera.lookAt(0, 1, 0);
  let shapeMesh: Mesh | null = null;
  let introElapsed = INTRO_SECONDS;

  const applyIntro = () => {
    if (!shapeMesh) return;
    const remaining = 1 - Math.min(introElapsed / INTRO_SECONDS, 1);
    shapeMesh.rotation.y = remaining * remaining * 1.6;
  };

  return {
    id,
    scene,
    camera,
    skyColor,
    look: { ...DEFAULT_PLASTER },

    async load() {
      scene.background = new Color(skyColor);
      const ground = new Mesh(
        new PlaneGeometry(30, 30),
        new MeshStandardMaterial({ color: 0xd9cdb8, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      shapeMesh = new Mesh(shape(), new MeshStandardMaterial({ color, roughness: 0.85 }));
      shapeMesh.position.y = 1.3;
      const sun = new DirectionalLight(0xfff1d6, 2.4);
      sun.position.set(4, 7, 3);
      scene.add(ground, shapeMesh, sun, new HemisphereLight(0xcfe0ff, 0x6b5a45, 0.7));
    },

    activate() {
      introElapsed = 0;
      applyIntro();
    },

    deactivate() {},

    update(deltaSeconds) {
      if (introElapsed >= INTRO_SECONDS) return false;
      introElapsed += deltaSeconds;
      applyIntro();
      return introElapsed < INTRO_SECONDS;
    },

    resize(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    sleep() {
      disposeObject(scene);
    },

    dispose() {
      disposeObject(scene);
      scene.clear();
      shapeMesh = null;
    },
  };
}

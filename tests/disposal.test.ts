import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Points, PointsMaterial, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeObject } from '../src/engine/utils/disposal';

describe('disposeObject', () => {
  it('frees line and point layers too (the globe uses them)', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
    const lineMaterial = new LineBasicMaterial();
    const pointMaterial = new PointsMaterial();
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const lineDispose = vi.spyOn(lineMaterial, 'dispose');
    const pointDispose = vi.spyOn(pointMaterial, 'dispose');
    const scene = new Scene();
    scene.add(new LineSegments(geometry, lineMaterial), new Points(geometry, pointMaterial));

    disposeObject(scene);

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(lineDispose).toHaveBeenCalled();
    expect(pointDispose).toHaveBeenCalled();
  });
});

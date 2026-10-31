import { BufferGeometry, InstancedMesh, Line, type Material, Mesh, Points, ShaderMaterial, Texture, type Object3D } from 'three';

const textureKeys = [
  'map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'envMap', 'bumpMap',
] as const;

/** Frees the GPU memory of a material and of every texture it references. */
export function disposeMaterial(material: Material, disposedTextures: Set<Texture> = new Set()) {
  for (const key of textureKeys) {
    const texture = (material as unknown as Record<string, Texture | null | undefined>)[key];
    if (texture instanceof Texture && !disposedTextures.has(texture)) {
      disposedTextures.add(texture);
      texture.dispose();
    }
  }
  if (material instanceof ShaderMaterial) {
    for (const { value } of Object.values(material.uniforms)) {
      if (value instanceof Texture && !disposedTextures.has(value)) {
        disposedTextures.add(value);
        value.dispose();
      }
    }
  }
  material.dispose();
}

/** Frees geometries, materials, textures and instances under a root. Three re-uploads them if rendered again. */
export function disposeObject(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    if (object instanceof Mesh || object instanceof Line || object instanceof Points) {
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => materials.add(material));
    }
    if (object instanceof InstancedMesh) object.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  const textures = new Set<Texture>();
  materials.forEach((material) => disposeMaterial(material, textures));
}

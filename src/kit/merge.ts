import * as THREE from 'three';
import { Batch } from '../engine/geom';

/**
 * Fewer draw calls for a figure or a fitting built out of many small meshes: under every
 * group, the meshes that hang straight from it and do not move on their own are merged, one
 * mesh per material, into that same group. Groups keep moving as they did (a head that nods,
 * an arm that waves), and with them what was merged into them.
 *
 * `keep` lists meshes that are moved, hidden or recoloured one by one after building: those
 * are left as they are. A mesh with children of its own, an instanced mesh, and one whose
 * material is shared with a mesh being kept are left alone too.
 *
 * Returns how many meshes there were and how many there are now, for a test to report.
 */
/**
 * Materials made one by one with the same settings (a new material for every key of a drum
 * machine, say) count as one, so that what they colour can be merged too. Only plain materials
 * qualify: no texture of any kind, so that nothing about how they draw can differ.
 */
function sameAs(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.isMeshStandardMaterial || s.type !== 'MeshStandardMaterial') return null;
  if (s.map || s.normalMap || s.emissiveMap || s.roughnessMap || s.metalnessMap || s.alphaMap || s.aoMap || s.envMap || s.onBeforeCompile.toString() !== THREE.Material.prototype.onBeforeCompile.toString()) return null;
  return [s.color.getHexString(), s.emissive.getHexString(), s.emissiveIntensity, s.roughness, s.metalness, s.transparent, s.opacity, s.side, s.vertexColors, s.flatShading, s.depthWrite, s.toneMapped, s.envMapIntensity].join('|');
}

export function mergeStatic(root: THREE.Object3D, keep: Iterable<THREE.Object3D> = []) {
  const canonical = new Map<string, THREE.Material>();
  const one = (m: THREE.Material) => {
    const key = sameAs(m);
    if (key === null) return m;
    const found = canonical.get(key);
    if (found) return found;
    canonical.set(key, m);
    return m;
  };
  const kept = new Set(keep);
  const keptMaterials = new Set<THREE.Material>();
  for (const o of kept) {
    const m = (o as THREE.Mesh).material;
    if (m) for (const one of Array.isArray(m) ? m : [m]) keptMaterials.add(one);
  }
  let before = 0;
  let after = 0;
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => groups.push(o));
  for (const parent of groups) {
    const meshes = parent.children.filter((c): c is THREE.Mesh => {
      const m = c as THREE.Mesh;
      return (
        m.isMesh === true &&
        !(m as unknown as THREE.InstancedMesh).isInstancedMesh &&
        !kept.has(m) &&
        m.children.length === 0 &&
        !Array.isArray(m.material) &&
        !keptMaterials.has(m.material as THREE.Material) &&
        m.visible &&
        m.renderOrder === 0
      );
    });
    if (meshes.length < 2) continue;
    // one batch for each way of taking part in shadows
    const batches = new Map<string, { batch: Batch; cast: boolean; receive: boolean }>();
    for (const m of meshes) {
      const key = `${m.castShadow}|${m.receiveShadow}`;
      let b = batches.get(key);
      if (!b) batches.set(key, (b = { batch: new Batch(), cast: m.castShadow, receive: m.receiveShadow }));
      m.updateMatrix();
      b.batch.add(one(m.material as THREE.Material), m.geometry, m.matrix);
    }
    before += meshes.length;
    for (const m of meshes) parent.remove(m);
    for (const { batch, cast, receive } of batches.values()) after += batch.build(parent, { cast, receive }).length;
  }
  return { before, after };
}

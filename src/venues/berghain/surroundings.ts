import * as THREE from 'three';
import { boxAt, centroid } from '../../engine/geom';
import { makeFrame } from '../../engine/frame';
import type { Surroundings } from '../../engine/types';
import { BERGHAIN_ID, BIERHOF_ID, DOOR_Z, KANTINE_ID, L2, W2, plan } from './plan';

/** What only Friedrichshain has: the path to the door, a church tower, the substation, the Fernsehturm, the S-Bahn. */

const frame = makeFrame(plan.frame);

/** The mapped dirt path from the street to the door, in building coordinates. */
const PATH: [number, number][] = [
  [-L2, DOOR_Z],
  [-45.7, -3.4],
  [-99.5, -10.6],
  [-106.1, -26.0],
];
function nearPath(x: number, z: number, d: number) {
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i];
    const [bx, bz] = PATH[i + 1];
    const t = THREE.MathUtils.clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2), 0, 1);
    if (Math.hypot(x - (ax + (bx - ax) * t), z - (az + (bz - az) * t)) < d) return true;
  }
  return false;
}
/** No trees on the building, the pavers, the path where the queue stands, or the beer garden. */
function siteClear(x: number, z: number) {
  const l = frame.toLocal(new THREE.Vector3(x, 0, z));
  if (l.x > -L2 - 15 && l.x < L2 + 6 && Math.abs(l.z) < W2 + 7) return true;
  if (nearPath(l.x, l.z, 6.5)) return true;
  return x > -24 && x < 2 && z > -58 && z < -30;
}
/** The path is lined with scrubby trees on both sides. */
function pathTrees() {
  const out: { x: number; z: number }[] = [];
  for (let x = -52; x > -98; x -= 5.5) {
    const z = -3.4 + ((x + 45.7) / -53.8) * -7.2;
    for (const side of [-1, 1]) {
      const w = frame.toWorld(x + Math.sin(x) * 1.5, 0, z + side * (8 + Math.abs(Math.cos(x * 1.7)) * 3));
      out.push({ x: w.x, z: w.z });
    }
  }
  return out;
}

export const surroundings: Surroundings = {
  own: [BERGHAIN_ID, KANTINE_ID, BIERHOF_ID],
  venueIds: [BERGHAIN_ID],
  clear: siteClear,
  trees: pathTrees(),
  // the scrubby birches and poplars on the old railway land around the club
  scatterTrees: { count: 70, centre: [30, 40], near: 60, spread: 160, clearOfBuildings: 25 },
  // along the queue side and the garden
  placedTrees: [[-30, 62], [-55, -10], [-58, -60], [-12, -88], [5, -86], [-70, -40], [-74, 10], [-96, 30], [-100, 48]],
  extras: {
    building(b, { batch, facades, roof }) {
      if (b.kind !== 'church') return;
      // St. Antonius has a slim bell tower
      const [cx, cz] = centroid(b.p);
      batch.add(facades.brick, boxAt(cx - 3, 0, cz - 3, cx + 3, 38, cz + 3, 4));
      batch.add(roof, new THREE.ConeGeometry(4.3, 8, 4).rotateY(Math.PI / 4).translate(cx, 42, cz));
    },
    structures({ batch, map }) {
      // The Umspannwerk: transformers and steel gantries behind the fence
      const sub = map.fences.find((f) => f.p.length > 3 && Math.abs(centroid(f.p)[0] - 60) < 30);
      if (!sub) return;
      const [cx, cz] = centroid(sub.p);
      const grey = new THREE.MeshStandardMaterial({ color: '#5f6262', roughness: 0.7, metalness: 0.3 });
      const green = new THREE.MeshStandardMaterial({ color: '#4c5a4c', roughness: 0.7, metalness: 0.2 });
      for (let i = 0; i < 3; i++) {
        const x = cx - 14 + i * 10;
        batch.add(green, boxAt(x - 2.4, 0, cz - 3, x + 2.4, 4.2, cz + 3));
        for (let k = 0; k < 10; k++) batch.add(grey, boxAt(x - 2.6, 0.4 + k * 0.38, cz - 3.2, x + 2.6, 0.5 + k * 0.38, cz + 3.2));
        for (const dz of [-1.6, 0, 1.6]) batch.add(grey, new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8).translate(x, 5.3, cz + dz));
      }
      for (const dx of [-20, -8, 4, 16]) {
        batch.add(grey, boxAt(cx + dx - 0.25, 0, cz - 9, cx + dx + 0.25, 11, cz - 8.5));
        batch.add(grey, boxAt(cx + dx - 0.25, 0, cz + 8.5, cx + dx + 0.25, 11, cz + 9));
        batch.add(grey, boxAt(cx + dx - 0.3, 10.5, cz - 9, cx + dx + 0.3, 11.1, cz + 9));
      }
    },
    landmark() {
      // The Fernsehturm: 2.5 km to the west-north-west, on the skyline from almost everywhere in Friedrichshain
      const tower = new THREE.Group();
      tower.position.set(-2280, 0, -1072);
      const towerMat = new THREE.MeshStandardMaterial({ color: '#b9b8b4', roughness: 0.6, fog: false });
      const ballMat = new THREE.MeshStandardMaterial({ color: '#c7c8c8', roughness: 0.25, metalness: 0.6, fog: false });
      tower.add(new THREE.Mesh(new THREE.CylinderGeometry(4.8, 16, 250, 24).translate(0, 125, 0), towerMat));
      tower.add(new THREE.Mesh(new THREE.SphereGeometry(16, 32, 20).translate(0, 213, 0), ballMat));
      tower.add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 18, 20).translate(0, 236, 0), towerMat));
      tower.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 115, 8).translate(0, 305, 0), new THREE.MeshStandardMaterial({ color: '#c74a3b', roughness: 0.6, fog: false })));
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(12 - k * 3, 12 - k * 3, 2.5, 20), towerMat);
        ring.position.y = 30 + k * 6;
        tower.add(ring);
      }
      const towerLights: THREE.Mesh[] = [];
      const redMat = new THREE.MeshBasicMaterial({ color: '#ff2a1a', fog: false });
      for (const y of [252, 290, 330, 366]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), redMat);
        l.position.y = y;
        tower.add(l);
        towerLights.push(l);
      }
      // the ring of windows round the sphere
      const band = new THREE.Mesh(new THREE.CylinderGeometry(16.2, 16.2, 3, 32, 1, true).translate(0, 210, 0), new THREE.MeshBasicMaterial({ color: '#ffd9a0', fog: false }));
      tower.add(band);
      return {
        object: tower,
        update(t, night) {
          const blink = Math.sin(t * 2.2) > 0.4;
          towerLights.forEach((l, i) => (l.visible = night && (i % 2 ? blink : !blink || i === 0)));
          band.visible = night;
        },
      };
    },
    // the S-Bahn on the Ringbahn
    train: { body: '#7d1d1d', stripe: '#d9a21b', windows: '#fff0d0', cycle: 46 },
  },
};

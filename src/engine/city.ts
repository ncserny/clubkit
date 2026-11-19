import * as THREE from 'three';
import { canvasTexture, rng } from './util';
import { Batch, along, boxAt, extrude, groundPolygon, offsetPath, polylineLength, ribbon, centroid } from './geom';
import { asphalt, brick, gravel, scrub, tiled } from './materials';
import type { Solid } from './nav';
import type { Obstacle, Surroundings, TimeState } from './types';

/**
 * The neighbourhood, from OpenStreetMap (© OpenStreetMap contributors, ODbL):
 * every building in the map data extruded to its storey count, the roads, paths,
 * railway tracks, grass and fences. Coordinates are metres from the venue, x east,
 * z south. What only one neighbourhood has (a landmark on the skyline, a substation)
 * comes in through the venue's extras.
 */

type P = [number, number];
export interface MapBuilding { id: number; kind: string; name: string | null; h: number; roof: boolean; p: P[] }
export interface MapLine { kind: string; name?: string | null; surface?: string | null; p: P[]; bridge?: boolean; service?: string | null; /** Width in metres, where the map says. */ w?: number }
export interface MapData { buildings: MapBuilding[]; roads: MapLine[]; rails: MapLine[]; areas: { kind: string; p: P[] }[]; fences: { kind: string; p: P[] }[]; entrances: [number, number, string][] }

export function mapBuilding(map: MapData, id: number) {
  return map.buildings.find((b) => b.id === id)!;
}

export type FacadeKind = 'platte' | 'platte2' | 'altbau' | 'shed' | 'office' | 'brick';

/** What a venue's extras are given to draw with. */
export interface CityContext {
  map: MapData;
  batch: Batch;
  group: THREE.Group;
  facades: Record<FacadeKind, THREE.MeshStandardMaterial>;
  roof: THREE.MeshStandardMaterial;
}

export interface CityExtras {
  /** Which facade a building gets; null for the default choice. */
  facade?(b: MapBuilding): FacadeKind | null;
  /** A material of the venue's own for a building's walls (UVs in metres: distance round, height); null for the usual choice. */
  material?(b: MapBuilding): THREE.Material | null;
  /** A material of the venue's own for the viaduct, in place of the plain colour (same UVs). */
  viaduct?(): THREE.Material | null;
  /** Called for each building after it is extruded: a tower on a church, say. */
  building?(b: MapBuilding, ctx: CityContext): void;
  /** Called once after the fences: yards, plant, anything standing in the open. */
  structures?(ctx: CityContext): void;
  /** Something far off on the skyline. */
  landmark?(ctx: CityContext): { object: THREE.Object3D; update?(t: number, night: boolean): void } | null;
  /** A train runs up and down the longest railway line in the map, in these colours. */
  train?: { body: string; stripe: string; windows: string; cycle: number };
}

/** Facade texture: a storey-high, bay-wide tile with a window, plus a night map of which windows are lit. */
function facade(kind: 'platte' | 'altbau' | 'shed' | 'office' | 'brick', seed: number) {
  const rand = rng(seed);
  const W = 128;
  const H = 128;
  const cols = 8;
  const rows = 8;
  const lit: boolean[] = [];
  for (let i = 0; i < cols * rows; i++) lit.push(rand() < (kind === 'shed' ? 0.03 : kind === 'office' ? 0.12 : 0.28));
  const base = { platte: '#8d877c', altbau: '#9c8c78', shed: '#6c6a66', office: '#6f7276', brick: '#6b4434' }[kind];
  const draw = (ctx: CanvasRenderingContext2D, night: boolean) => {
    ctx.fillStyle = night ? '#000' : base;
    ctx.fillRect(0, 0, W * cols, H * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * W;
        const y = r * H;
        if (!night) {
          const v = rand() * 14 - 7;
          ctx.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) / 120})`;
          ctx.fillRect(x, y, W, H);
          if (kind === 'platte') {
            ctx.strokeStyle = 'rgba(40,36,30,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, W - 2, H - 2);
          }
          if (kind === 'brick') {
            ctx.fillStyle = 'rgba(30,15,10,0.25)';
            for (let k = 0; k < H; k += 8) ctx.fillRect(x, y + k, W, 1);
          }
        }
        if (kind === 'shed' && r % 4 !== 1) continue;
        const ww = kind === 'office' ? W * 0.8 : kind === 'shed' ? W * 0.5 : W * 0.42;
        const wh = kind === 'office' ? H * 0.55 : kind === 'altbau' ? H * 0.55 : H * 0.45;
        const wx = x + (W - ww) / 2;
        const wy = y + H * 0.28;
        const on = lit[r * cols + c];
        if (night) {
          if (on) {
            const warm = rand();
            ctx.fillStyle = warm < 0.6 ? '#ffcf8a' : warm < 0.85 ? '#fff2dc' : '#9fc4ff';
            ctx.globalAlpha = 0.5 + rand() * 0.5;
            ctx.fillRect(wx, wy, ww, wh);
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = '#2a2d30';
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(160,175,190,0.25)';
          ctx.fillRect(wx, wy, ww, wh * 0.35);
          ctx.fillStyle = 'rgba(30,30,30,0.6)';
          ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
          if (kind === 'platte' && r % 2 === 0 && c % 3 === 1) {
            // balcony slab
            ctx.fillStyle = 'rgba(70,66,60,0.9)';
            ctx.fillRect(x + 6, wy + wh, W - 12, 10);
          }
        }
      }
    }
  };
  const map = canvasTexture(W * cols, H * rows, (ctx) => draw(ctx, false));
  const night = canvasTexture(W * cols, H * rows, (ctx) => draw(ctx, true));
  const storey = kind === 'shed' ? 4 : kind === 'office' ? 3.6 : kind === 'altbau' ? 3.6 : 2.85;
  const bay = kind === 'office' ? 3 : 3.6;
  for (const t of [map, night]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / (bay * cols), 1 / (storey * rows));
  }
  return new THREE.MeshStandardMaterial({ map, emissiveMap: night, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1, roughness: 0.9 });
}

export interface City {
  group: THREE.Group;
  nightMaterials: THREE.MeshStandardMaterial[];
  lampHeads: THREE.Mesh;
  sky: THREE.Mesh;
  skylineMaterial: THREE.MeshBasicMaterial;
  skylineNight: THREE.Texture;
  skylineDay: THREE.Texture;
  /** Buildings as masses, and fences, trees and lamp posts as obstacles, for walking. World frame. */
  solids: Solid[];
  obstacles: Obstacle[];
  /** Moves what moves: the train, the lights on the landmark. */
  update(t: number, time: TimeState): void;
}

export function buildCity(data: MapData, opts: Surroundings): City {
  const extras = opts.extras ?? {};
  const group = new THREE.Group();
  group.name = 'city';
  const batch = new Batch();

  /* ---------------------------------------------------------- ground ---- */
  const scrubMat = new THREE.MeshStandardMaterial({ map: tiled(scrub(), 1 / 14, 1 / 14), roughness: 1 });
  scrubMat.map!.repeat.set(1 / 14, 1 / 14);
  // a city centre is paved from wall to wall; elsewhere open land is scrub
  const groundMat = opts.paved ? new THREE.MeshStandardMaterial({ map: tiled(asphalt(31), 1 / 12, 1 / 12), color: '#8f8c86', roughness: 0.95 }) : scrubMat;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), groundMat);
  // planar UV in metres
  const gp = ground.geometry.attributes.position as THREE.BufferAttribute;
  const guv = ground.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) guv.setXY(i, gp.getX(i), gp.getZ(i));
  ground.receiveShadow = true;
  group.add(ground);

  const grassMat = new THREE.MeshStandardMaterial({ map: tiled(scrub(18), 1 / 9, 1 / 9), color: '#8fa070', roughness: 1 });
  const pavingMat = new THREE.MeshStandardMaterial({ map: tiled(asphalt(31), 1 / 12, 1 / 12), color: '#9a978f', roughness: 0.95 });
  const ballastMat = new THREE.MeshStandardMaterial({ map: tiled(gravel(41), 1 / 6, 1 / 6), color: '#8d8478', roughness: 1 });
  for (const a of data.areas) {
    const mat = ['grass', 'park', 'garden', 'playground', 'pitch'].includes(a.kind) ? grassMat : a.kind === 'railway' || a.kind === 'brownfield' ? ballastMat : pavingMat;
    if (a.p.length < 3) continue;
    batch.add(mat, groundPolygon(a.p, a.kind === 'residential' || a.kind === 'commercial' || a.kind === 'retail' ? 0.01 : 0.02));
  }

  /* ----------------------------------------------------------- roads ---- */
  const roadMat = new THREE.MeshStandardMaterial({ map: tiled(asphalt(), 1 / 10, 1 / 10), roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -2 });
  roadMat.map!.repeat.set(1, 1 / 10);
  const pathMat = new THREE.MeshStandardMaterial({ map: tiled(asphalt(13), 1, 1 / 6), color: '#a19c94', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 });
  const settMat = new THREE.MeshStandardMaterial({ map: tiled(brick(17), 1, 1 / 3), color: '#8c8c8c', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
  const lampSpots: { x: number; z: number; angle: number }[] = [];
  const treeSpots: { x: number; z: number }[] = [];
  const rand = rng(77);
  for (const r of data.roads) {
    const w = r.w ?? { trunk: 16, primary: 14, secondary: 12, tertiary: 10, unclassified: 7.5, residential: 7.5, living_street: 6, pedestrian: 5, service: 4.5, footway: 2.4, cycleway: 2.2, steps: 2.4, platform: 3 }[r.kind] ?? 3;
    const streetTrees = opts.streetTrees !== false;
    const y = r.kind === 'footway' || r.kind === 'cycleway' ? 0.04 : 0.06;
    const mat = r.surface === 'sett' || r.surface === 'cobblestone' ? settMat : w >= 4.5 ? roadMat : pathMat;
    batch.add(mat, ribbon(r.p, w, y));
    if (['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential'].includes(r.kind)) {
      for (const s of along(r.p, 32, 8)) {
        const nx = Math.cos(s.angle);
        const nz = -Math.sin(s.angle);
        const lx = s.x + nx * (w / 2 + 0.8);
        const lz = s.z + nz * (w / 2 + 0.8);
        if (!opts.keepClear?.(lx, lz)) lampSpots.push({ x: lx, z: lz, angle: s.angle });
      }
      for (const s of streetTrees ? along(r.p, opts.streetTreeSpacing ?? 11, 3) : []) {
        if (rand() < 0.35) continue;
        const nx = Math.cos(s.angle);
        const nz = -Math.sin(s.angle);
        const side = rand() < 0.5 ? 1 : -1;
        treeSpots.push({ x: s.x + nx * side * (w / 2 + 2.5), z: s.z + nz * side * (w / 2 + 2.5) });
      }
    }
  }

  /* ----------------------------------------------------------- rails ---- */
  const steel = new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 0.6, metalness: 0.6 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: '#3b3330', roughness: 1 });
  const sleeper = new THREE.BoxGeometry(2.6, 0.16, 0.26);
  const sleeperSpots: { x: number; y: number; z: number; angle: number }[] = [];
  let mainline: P[] | null = null;
  let mainlineLevel = 0;
  const solids: Solid[] = [];
  const via = opts.viaduct;
  const viaMat = via ? (extras.viaduct?.() ?? new THREE.MeshStandardMaterial({ color: via.colour, roughness: 0.95 })) : null;
  for (const r of data.rails) {
    // a line the map marks as a bridge runs on a viaduct: a solid mass up to the level of the track
    const up = via && viaMat && r.bridge ? via.level : 0;
    if (via && viaMat && r.bridge) {
      const outline = [...offsetPath(r.p, via.width / 2), ...offsetPath(r.p, -via.width / 2).reverse()];
      const { walls, roof } = extrude(outline, via.level);
      batch.add(viaMat, walls);
      batch.add(viaMat, roof);
      solids.push({ outline, top: via.level });
    }
    batch.add(ballastMat, ribbon(r.p, 3.6, up + 0.07));
    for (const side of [-0.72, 0.72]) {
      const offset = r.p.map((pt, i) => {
        const a = r.p[Math.min(i + 1, r.p.length - 1)];
        const b = r.p[Math.max(i - 1, 0)];
        const dx = a[0] - b[0];
        const dz = a[1] - b[1];
        const l = Math.hypot(dx, dz) || 1;
        return [pt[0] + (-dz / l) * side, pt[1] + (dx / l) * side] as P;
      });
      for (let i = 0; i < offset.length - 1; i++) {
        const [x0, z0] = offset[i];
        const [x1, z1] = offset[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const g = new THREE.BoxGeometry(0.08, 0.14, len);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3((x0 + x1) / 2, up + 0.27, (z0 + z1) / 2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(x1 - x0, z1 - z0), 0)),
          new THREE.Vector3(1, 1, 1),
        );
        batch.add(steel, g, m);
      }
    }
    for (const s of along(r.p, 0.7, 0.3)) sleeperSpots.push({ ...s, y: up });
    if (r.kind === 'rail' && polylineLength(r.p) > 200) {
      mainline = r.p;
      mainlineLevel = up;
    }
  }
  const sleepers = new THREE.InstancedMesh(sleeper, sleeperMat, sleeperSpots.length);
  sleeperSpots.forEach((s, i) => {
    sleepers.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(s.x, s.y + 0.15, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.angle, 0)), new THREE.Vector3(1, 1, 1)));
  });
  sleepers.receiveShadow = true;
  group.add(sleepers);

  /* ------------------------------------------------------- buildings ---- */
  const mats: Record<FacadeKind, THREE.MeshStandardMaterial> = {
    platte: facade('platte', 1),
    platte2: facade('platte', 2),
    altbau: facade('altbau', 3),
    shed: facade('shed', 4),
    office: facade('office', 5),
    brick: facade('brick', 6),
  };
  const roofMat = new THREE.MeshStandardMaterial({ color: '#3f3d3a', roughness: 0.95 });
  const ctx: CityContext = { map: data, batch, group, facades: mats, roof: roofMat };
  const obstacles: Obstacle[] = [];
  for (const b of data.buildings) {
    if (b.p.length < 3) continue;
    if (!b.roof && !opts.venueIds.includes(b.id)) solids.push({ outline: b.p, top: b.h });
    if (opts.own.includes(b.id)) continue;
    let mat: THREE.Material;
    const own = extras.material?.(b) ?? null;
    const chosen = extras.facade?.(b) ?? null;
    if (own) mat = own;
    else if (chosen) mat = mats[chosen];
    else if (b.kind === 'apartments' && b.h > 25) mat = b.id % 2 ? mats.platte : mats.platte2;
    else if (b.kind === 'apartments' || b.kind === 'dormitory') mat = mats.altbau;
    else if (b.kind === 'church') mat = mats.brick;
    else if (['commercial', 'public', 'government', 'school'].includes(b.kind) && b.h > 9) mat = mats.office;
    else mat = mats.shed;
    if (b.roof) {
      // a canopy on posts
      const { roof } = extrude(b.p, 0.3, b.h - 0.3);
      batch.add(roofMat, roof);
      for (const [x, z] of b.p) batch.add(roofMat, boxAt(x - 0.12, 0, z - 0.12, x + 0.12, b.h, z + 0.12));
      continue;
    }
    const { walls, roof } = extrude(b.p, b.h);
    batch.add(mat, walls);
    batch.add(roofMat, roof);
    extras.building?.(b, ctx);
  }

  /* ---------------------------------------------------------- fences ---- */
  const fenceTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(170,172,170,1)';
    ctx.lineWidth = 3;
    for (let i = -h; i < w + h; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.moveTo(i + h, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
  });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
  const fenceMat = new THREE.MeshStandardMaterial({ map: fenceTex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.6 });
  const postMat = new THREE.MeshStandardMaterial({ color: '#77797a', metalness: 0.7, roughness: 0.5 });
  for (const f of data.fences) {
    const { walls } = extrude(f.p, 2.4);
    const uv = walls.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.6, uv.getY(i) / 0.6);
    batch.add(fenceMat, walls);
    for (const s of along(f.p, 3)) batch.add(postMat, boxAt(s.x - 0.04, 0, s.z - 0.04, s.x + 0.04, 2.5, s.z + 0.04));
    obstacles.push({ label: 'fence', frame: 'world', y0: 0, y1: 2.4, path: f.p, width: 0.1, closed: f.p.length > 2 });
  }
  extras.structures?.(ctx);

  /* ------------------------------------------------------- lamp posts ---- */
  const pole = new THREE.MeshStandardMaterial({ color: '#3a3c3e', metalness: 0.6, roughness: 0.5 });
  for (const s of lampSpots) {
    batch.add(pole, new THREE.CylinderGeometry(0.07, 0.11, 8.5, 6).translate(s.x, 4.25, s.z));
    obstacles.push({ label: 'lamp post', frame: 'world', y0: 0, y1: 8.5, circle: [s.x, s.z, 0.11] });
  }
  const headGeo = new THREE.BoxGeometry(0.4, 0.18, 0.9);
  const headMat = new THREE.MeshStandardMaterial({ color: '#222', emissive: new THREE.Color('#ffae57'), emissiveIntensity: 6 });
  const lampHeads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  lampSpots.forEach((s, i) => lampHeads.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(s.x, 8.5, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.angle, 0)), new THREE.Vector3(1, 1, 1))));
  group.add(lampHeads);
  // pools of sodium light on the asphalt, cheaper than a light per lamp
  const poolTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,170,80,0.55)');
    g.addColorStop(0.5, 'rgba(255,150,60,0.18)');
    g.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2), poolMat, lampSpots.length);
  lampSpots.forEach((s, i) => pools.setMatrixAt(i, new THREE.Matrix4().makeTranslation(s.x, 0.09, s.z)));
  pools.name = 'pools';
  group.add(pools);

  /* ------------------------------------------------------------ trees ---- */
  const r2 = rng(5);
  // scrubby trees scattered on open land round the venue, and a few placed by hand
  const sc = opts.scatterTrees;
  if (sc) {
    for (let i = 0; i < sc.count; i++) {
      const a = r2() * Math.PI * 2;
      const d = sc.near + r2() * sc.spread;
      const x = sc.centre[0] + Math.cos(a) * d;
      const z = sc.centre[1] + Math.sin(a) * d;
      if (data.buildings.some((b) => Math.hypot(centroid(b.p)[0] - x, centroid(b.p)[1] - z) < sc.clearOfBuildings)) continue;
      treeSpots.push({ x, z });
    }
  }
  for (const [x, z] of opts.placedTrees ?? []) treeSpots.push({ x, z });
  const filtered = treeSpots.filter((t) => !data.buildings.some((b) => b.p.length > 2 && insideBox(b.p, t.x, t.z, 2)) && !opts.clear?.(t.x, t.z) && !opts.keepClear?.(t.x, t.z));
  if (opts.trees) filtered.push(...opts.trees);
  for (const t of filtered) obstacles.push({ label: 'tree', frame: 'world', y0: 0, y1: 4, circle: [t.x, t.z, 0.24] });
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1, 6).translate(0, 0.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a443d', roughness: 1 });
  const crownGeo = new THREE.IcosahedronGeometry(1, 2);
  {
    const p = crownGeo.attributes.position as THREE.BufferAttribute;
    const rr = rng(3);
    for (let i = 0; i < p.count; i++) {
      // lumpy, but the same lump wherever vertices coincide, so the surface stays closed
      const k = 0.82 + 0.1 * Math.sin(p.getX(i) * 7 + p.getY(i) * 5) + 0.1 * Math.cos(p.getZ(i) * 6 - p.getY(i) * 4) + rr() * 0;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    crownGeo.computeVertexNormals();
  }
  const crownMat = new THREE.MeshStandardMaterial({ color: '#56683f', roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, filtered.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, filtered.length * 5);
  const c = new THREE.Color();
  filtered.forEach((t, i) => {
    const h = 7 + r2() * 9;
    trunks.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t.x, 0, t.z), new THREE.Quaternion(), new THREE.Vector3(1, h * 0.7, 1)));
    for (let k = 0; k < 5; k++) {
      const s = 2.2 + r2() * 2.2;
      crowns.setMatrixAt(
        i * 5 + k,
        new THREE.Matrix4().compose(
          new THREE.Vector3(t.x + (r2() - 0.5) * 3.6, h * (0.58 + k * 0.09), t.z + (r2() - 0.5) * 2.4),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(r2(), r2() * 6, r2())),
          new THREE.Vector3(s, s * (0.8 + r2() * 0.4), s),
        ),
      );
      c.setHSL(0.2 + r2() * 0.08, 0.25 + r2() * 0.15, 0.18 + r2() * 0.1);
      crowns.setColorAt(i * 5 + k, c);
    }
  });
  for (const m of [trunks, crowns]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  /* --------------------------------------------------------- landmark ---- */
  const landmark = extras.landmark?.(ctx) ?? null;
  if (landmark) group.add(landmark.object);

  /* ---------------------------------------------- skyline and sky dome ---- */
  const skyline = (night: boolean) =>
    canvasTexture(4096, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const rr = rng(night ? 90 : 90);
      let x = 0;
      while (x < w) {
        const bw = 10 + rr() * 60;
        const bh = 20 + rr() * rr() * 120;
        ctx.fillStyle = night ? '#0d0e12' : `rgb(${150 + rr() * 20},${155 + rr() * 20},${165 + rr() * 15})`;
        ctx.fillRect(x, h - bh, bw, bh);
        if (night) {
          for (let wy = h - bh + 4; wy < h - 4; wy += 6) {
            for (let wx = x + 2; wx < x + bw - 2; wx += 5) {
              if (rr() < 0.18) {
                ctx.fillStyle = rr() < 0.7 ? 'rgba(255,200,130,0.9)' : 'rgba(200,220,255,0.8)';
                ctx.fillRect(wx, wy, 2, 2);
              }
            }
          }
          if (rr() < 0.1) {
            ctx.fillStyle = '#ff3020';
            ctx.fillRect(x + bw / 2, h - bh - 2, 2, 2);
          }
        }
        x += bw + rr() * 6;
      }
    });
  const skylineNight = skyline(true);
  const skylineDay = skyline(false);
  const skylineMaterial = new THREE.MeshBasicMaterial({ map: skylineNight, transparent: true, fog: false, depthWrite: false });
  const skylineMesh = new THREE.Mesh(new THREE.CylinderGeometry(1500, 1500, 90, 96, 1, true), skylineMaterial);
  skylineMaterial.side = THREE.BackSide;
  skylineMesh.position.y = 44;
  skylineMesh.renderOrder = -1;
  group.add(skylineMesh);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color('#05060b') },
        mid: { value: new THREE.Color('#141420') },
        horizon: { value: new THREE.Color('#5a3a2a') },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color('#000000') },
        moonDir: { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() },
        moon: { value: 1 },
        time: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 moonDir; uniform float moon; varying vec3 vDir;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){
          float h = vDir.y;
          vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.18, h));
          c = mix(c, top, smoothstep(0.18, 0.7, h));
          float s = max(dot(vDir, sunDir), 0.0);
          c += sunColor * (pow(s, 600.0) * 30.0 + pow(s, 8.0) * 0.35);
          float m = max(dot(vDir, moonDir), 0.0);
          c += vec3(0.85,0.88,1.0) * moon * (smoothstep(0.9996, 0.9998, m) * 1.6 + pow(m, 60.0) * 0.08);
          // stars, washed out by the city glow near the horizon
          vec3 q = floor(vDir * 420.0);
          float st = step(0.9985, hash(q)) * smoothstep(0.15, 0.6, h) * moon;
          c += vec3(st) * 0.6;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -2;
  group.add(sky);

  /* ---------------------------------------------------------- train ---- */
  let train: { mesh: THREE.Group; path: P[]; length: number; cycle: number; y: number } | null = null;
  if (mainline && extras.train) {
    const t = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: extras.train.body, roughness: 0.5, metalness: 0.3 });
    const yellow = new THREE.MeshStandardMaterial({ color: extras.train.stripe, roughness: 0.5, metalness: 0.3 });
    const win = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color(extras.train.windows), emissiveIntensity: 1.6 });
    for (let k = 0; k < 4; k++) {
      const car = new THREE.Group();
      car.add(new THREE.Mesh(boxAt(-1.5, 0.9, -8.9, 1.5, 2.4, 8.9), body));
      car.add(new THREE.Mesh(boxAt(-1.5, 2.4, -8.9, 1.5, 3.7, 8.9), yellow));
      car.add(new THREE.Mesh(boxAt(-1.52, 2.5, -8, 1.52, 3.3, 8), win));
      car.position.z = k * 18.4;
      t.add(car);
    }
    group.add(t);
    train = { mesh: t, path: mainline, length: polylineLength(mainline), cycle: extras.train.cycle, y: mainlineLevel + 3.2 };
  }

  batch.build(group);

  function update(t: number, time: TimeState) {
    landmark?.update?.(t, time.night);
    if (train) {
      const k = (t % train.cycle) / train.cycle;
      const d = k * (train.length + 200) - 100;
      const p = pointAt(train.path, THREE.MathUtils.clamp(d, 0, train.length));
      train.mesh.position.set(p.x, train.y, p.z);
      train.mesh.rotation.y = p.angle;
      train.mesh.visible = d > 0 && d < train.length;
    }
  }

  return {
    group,
    nightMaterials: Object.values(mats),
    lampHeads,
    sky,
    skylineMaterial,
    skylineNight,
    skylineDay,
    solids,
    obstacles,
    update,
  };
}

function insideBox(poly: P[], x: number, z: number, pad: number) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [px, pz] of poly) {
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    z0 = Math.min(z0, pz);
    z1 = Math.max(z1, pz);
  }
  return x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
}

/** Position and heading along a polyline at distance d. */
export function pointAt(path: P[], d: number) {
  let run = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i];
    const [x1, z1] = path[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (run + len >= d) {
      const k = (d - run) / len;
      return { x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, angle: Math.atan2(x1 - x0, z1 - z0) };
    }
    run += len;
  }
  const [x, z] = path[path.length - 1];
  return { x, z, angle: 0 };
}

// Fetch the surroundings of a venue from OpenStreetMap and write them in the engine's map format.
//
//   node tools/fetch-osm.mjs <lat> <lon> <radius-m> <out.json> [raw.json]
//
// Coordinates in the output are metres from <lat, lon>: x east, z south, rounded to 0.1 m.
// Overpass servers are often busy, so the query is retried with a growing wait, going round the mirrors.
// If raw.json exists it is used instead of the network; otherwise the raw reply is saved there.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [lat0, lon0, radius] = process.argv.slice(2, 5).map(Number);
const out = process.argv[5];
const rawFile = process.argv[6];
if (!out || !Number.isFinite(radius)) {
  console.error('usage: node tools/fetch-osm.mjs <lat> <lon> <radius-m> <out.json> [raw.json]');
  process.exit(2);
}

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const around = `(around:${radius},${lat0},${lon0})`;
const query = `[out:json][timeout:120];
(
  way["building"]${around};
  relation["building"]["type"="multipolygon"]${around};
  way["highway"]${around};
  way["railway"~"^(rail|light_rail|tram)$"]${around};
  way["landuse"]${around};
  way["leisure"~"^(park|garden|playground|pitch)$"]${around};
  way["barrier"~"^(fence|wall)$"]${around};
  node["entrance"]${around};
);
out body geom;`;

async function ask(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 150000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      headers: { 'User-Agent': 'club-3d map fetch (one-off, per venue)', Accept: 'application/json' },
      signal: ctrl.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
    const json = JSON.parse(text);
    if (!Array.isArray(json.elements) || !json.elements.length) throw new Error(`empty reply${json.remark ? `: ${json.remark}` : ''}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRaw() {
  let wait = 4000;
  for (let round = 1; round <= 5; round++) {
    for (const url of MIRRORS) {
      try {
        const json = await ask(url);
        console.log(`round ${round}: ${url} answered with ${json.elements.length} elements`);
        return json;
      } catch (error) {
        console.log(`round ${round}: ${url} failed: ${error.name === 'AbortError' ? 'timed out' : error.message}`);
      }
    }
    console.log(`waiting ${wait / 1000} s before the next round`);
    await new Promise((r) => setTimeout(r, wait));
    wait *= 2;
  }
  throw new Error('no Overpass server answered');
}

const raw = rawFile && existsSync(rawFile) ? JSON.parse(readFileSync(rawFile, 'utf8')) : await fetchRaw();
if (rawFile && !existsSync(rawFile)) writeFileSync(rawFile, JSON.stringify(raw));

/* ------------------------------------------------------------ convert ---- */
const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
const kz = 110574;
const round = (v) => Math.round(v * 10) / 10;
const xz = (g) => [round((g.lon - lon0) * kx), round(-(g.lat - lat0) * kz)];
const line = (geometry) => {
  const p = [];
  for (const g of geometry ?? []) {
    if (!g) continue;
    const q = xz(g);
    const last = p[p.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) p.push(q);
  }
  return p;
};
const ring = (geometry) => {
  const p = line(geometry);
  if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
  return p;
};
const metres = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
/** Height from the tags: a stated height, else storeys, else a low guess. */
function height(t) {
  const h = metres(t.height) ?? metres(t['building:height']);
  if (h) return round(h);
  const levels = metres(t['building:levels']);
  if (levels) return round(levels * 3.3 + 1);
  return t.building === 'roof' ? 4 : 9;
}
const kind = (t) => (t.building && t.building !== 'yes' ? t.building : (t.amenity ?? t.office ?? t.shop ?? 'yes'));
const underground = (t) => t.tunnel === 'yes' || t.tunnel === 'building_passage' || Number(t.layer) < 0 || t.location === 'underground' || t.indoor === 'yes';

const map = { buildings: [], roads: [], rails: [], areas: [], fences: [], entrances: [] };
for (const e of raw.elements) {
  const t = e.tags ?? {};
  if (e.type === 'node') {
    if (t.entrance) map.entrances.push([...xz(e), t.entrance]);
    continue;
  }
  if (e.type === 'relation') {
    if (!t.building) continue;
    for (const m of e.members ?? []) {
      if (m.type !== 'way' || m.role !== 'outer' || !m.geometry) continue;
      const p = ring(m.geometry);
      if (p.length > 2) map.buildings.push({ id: m.ref, kind: kind(t), name: t.name ?? null, h: height(t), roof: t.building === 'roof', p });
    }
    continue;
  }
  if (t.building) {
    const p = ring(e.geometry);
    if (p.length > 2) map.buildings.push({ id: e.id, kind: kind(t), name: t.name ?? null, h: height(t), roof: t.building === 'roof', p });
  } else if (t.highway) {
    if (underground(t) || ['proposed', 'construction', 'corridor', 'elevator', 'bus_stop'].includes(t.highway)) continue;
    const p = line(e.geometry);
    const k = t.highway.replace(/_link$/, '');
    // the map's own width where it gives one; a one-way main road is half a main road
    const lanes = metres(t.lanes);
    const w = metres(t.width) ?? (lanes ? lanes * 3.2 + 0.6 : t.oneway === 'yes' && ['trunk', 'primary', 'secondary', 'tertiary'].includes(k) ? 8 : null);
    const road = { id: e.id, kind: k, name: t.name ?? null, surface: t.surface ?? null, p };
    if (w) road.w = round(w);
    if (p.length > 1) map.roads.push(road);
  } else if (['rail', 'light_rail', 'tram'].includes(t.railway)) {
    if (underground(t)) continue;
    const p = line(e.geometry);
    if (p.length > 1) map.rails.push({ id: e.id, kind: t.railway, service: t.service ?? null, bridge: !!t.bridge && t.bridge !== 'no', embankment: t.embankment === 'yes', p });
  } else if (t.landuse || t.leisure) {
    const p = ring(e.geometry);
    if (p.length > 2) map.areas.push({ kind: t.landuse ?? t.leisure, p });
  } else if (t.barrier) {
    const p = line(e.geometry);
    if (p.length > 1) map.fences.push({ kind: t.barrier, p });
  }
}
// a building that is a relation and also has its outer way tagged is listed once
const seen = new Set();
map.buildings = map.buildings.filter((b) => (seen.has(b.id) ? false : seen.add(b.id)));

writeFileSync(out, JSON.stringify(map));
console.log(`${out}: ${Object.entries(map).map(([k, v]) => `${v.length} ${k}`).join(', ')}`);

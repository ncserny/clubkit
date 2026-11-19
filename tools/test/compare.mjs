// Compare two directories of PNGs pixel by pixel. Usage: node compare.mjs dirA dirB
import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decode(file) {
  const b = readFileSync(file);
  let p = 8;
  let w = 0;
  let h = 0;
  let ct = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const up = y ? out[dst + x - stride] : 0;
      const c = x >= bpp && y ? out[dst + x - stride - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const pa = Math.abs(up - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + up - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      out[dst + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}

const [A, B] = process.argv.slice(2);
let worst = 0;
let identical = 0;
let total = 0;
for (const f of readdirSync(A).filter((f) => f.endsWith('.png')).sort()) {
  total++;
  let a;
  let b;
  try {
    a = decode(`${A}/${f}`);
    b = decode(`${B}/${f}`);
  } catch (e) {
    console.log(f, 'MISSING', e.message);
    continue;
  }
  if (a.w !== b.w || a.h !== b.h) {
    console.log(f, 'SIZE DIFFERS', a.w, a.h, b.w, b.h);
    continue;
  }
  let diff = 0;
  let max = 0;
  let sum = 0;
  // the box round what differs: left, top, right, bottom
  const box = [a.w, a.h, 0, 0];
  for (let i = 0; i < a.px.length; i += a.bpp) {
    const d = Math.max(Math.abs(a.px[i] - b.px[i]), Math.abs(a.px[i + 1] - b.px[i + 1]), Math.abs(a.px[i + 2] - b.px[i + 2]));
    if (d) {
      diff++;
      sum += d;
      if (d > max) max = d;
      const x = (i / a.bpp) % a.w;
      const y = Math.floor(i / a.bpp / a.w);
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
    }
  }
  const n = a.px.length / a.bpp;
  if (!diff) identical++;
  worst = Math.max(worst, max);
  console.log(f.padEnd(10), `${a.w}x${a.h}`, diff ? `DIFF pixels=${diff} (${((100 * diff) / n).toFixed(3)}%) max=${max} mean=${(sum / diff).toFixed(2)} within x ${box[0]}..${box[2]}, y ${box[1]}..${box[3]}` : 'identical');
}
console.log(`${identical}/${total} identical, worst channel delta ${worst}`);

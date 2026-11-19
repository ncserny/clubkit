import { canvasTexture, rng } from '../engine/util';

/**
 * A wall sprayed from the pavement to as high as an arm or a ladder reaches: tags, throw-ups,
 * pieces, buffed patches, stickers. All invented: the words are random letters. One tile is a
 * square of wall; lay it about 5 m high. `sheet` is what it is sprayed on: false for rusticated
 * render, true for ribbed steel sheet, or a colour for a plain wall.
 */
export function graffitiWall(seed: number, sheet: boolean | string = false) {
  const rand = rng(seed);
  const palette = ['#e8402a', '#f2c230', '#36b37e', '#2f6fd6', '#d94a9c', '#8c52d9', '#f07c1e', '#47c7d9', '#c8e04a', '#f4f1ea', '#141414'];
  const pick = () => palette[Math.floor(rand() * palette.length)];
  const letters = 'ABCDEKMNORSTVWXYZ';
  const word = (n: number) => Array.from({ length: n }, () => letters[Math.floor(rand() * letters.length)]).join('');
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    if (typeof sheet === 'string') {
      ctx.fillStyle = sheet;
      ctx.fillRect(0, 0, w, h);
    } else if (sheet) {
      ctx.fillStyle = '#5c5f61';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, 0, 3, h);
      }
    } else {
      ctx.fillStyle = '#77726a';
      ctx.fillRect(0, 0, w, h);
      // rustication: a channel every 0.6 m
      for (let y = h; y > 0; y -= h / (5.2 / 0.6)) {
        ctx.fillStyle = 'rgba(20,18,16,0.5)';
        ctx.fillRect(0, y - 5, w, 8);
      }
    }
    // patches buffed over in grey, beige and black
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#8c867c', '#6d6a64', '#a39a88', '#262626', '#56524c'][Math.floor(rand() * 5)];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(rand() * w, h * 0.25 + rand() * h * 0.6, 80 + rand() * 260, 60 + rand() * 200);
      ctx.globalAlpha = 1;
    }
    ctx.lineJoin = 'round';
    // pieces: big filled letters with outlines and a highlight
    for (let i = 0; i < 6; i++) {
      const size = 120 + rand() * 170;
      const x = rand() * w * 0.8 - 40;
      const y = h * 0.42 + rand() * h * 0.5;
      const t = word(3 + Math.floor(rand() * 3));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * 0.2);
      ctx.font = `900 ${size}px Impact, 'Arial Black', sans-serif`;
      const fill = pick();
      ctx.lineWidth = size * 0.12;
      ctx.strokeStyle = '#111';
      ctx.strokeText(t, 6, 6);
      ctx.strokeText(t, 0, 0);
      const g = ctx.createLinearGradient(0, -size, 0, 0);
      g.addColorStop(0, fill);
      g.addColorStop(1, pick());
      ctx.fillStyle = g;
      ctx.fillText(t, 0, 0);
      ctx.lineWidth = size * 0.025;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.strokeText(t, -size * 0.02, -size * 0.02);
      ctx.restore();
    }
    // throw-ups: silver fill, black line
    for (let i = 0; i < 4; i++) {
      const size = 90 + rand() * 90;
      ctx.save();
      ctx.translate(rand() * w * 0.85, h * 0.35 + rand() * h * 0.55);
      ctx.font = `900 ${size}px 'Arial Black', Impact, sans-serif`;
      const t = word(2 + Math.floor(rand() * 2));
      ctx.lineWidth = size * 0.08;
      ctx.strokeStyle = '#0d0d0d';
      ctx.strokeText(t, 0, 0);
      ctx.fillStyle = rand() < 0.7 ? '#cfcfcf' : '#f0e6c8';
      ctx.fillText(t, 0, 0);
      ctx.restore();
    }
    // tags
    for (let i = 0; i < 45; i++) {
      const size = 28 + rand() * 50;
      ctx.save();
      ctx.translate(rand() * w, h * 0.15 + rand() * h * 0.82);
      ctx.rotate((rand() - 0.5) * 0.5);
      ctx.transform(1, 0, -0.3, 1, 0, 0);
      ctx.font = `italic 700 ${size}px 'Brush Script MT', 'Comic Sans MS', cursive`;
      ctx.lineWidth = 2 + rand() * 3;
      ctx.strokeStyle = rand() < 0.5 ? '#0f0f0f' : pick();
      ctx.strokeText(word(3 + Math.floor(rand() * 4)), 0, 0);
      ctx.restore();
    }
    // drips under the pieces
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = pick();
      ctx.globalAlpha = 0.7;
      ctx.fillRect(rand() * w, h * 0.4 + rand() * h * 0.5, 2 + rand() * 3, 10 + rand() * 50);
    }
    ctx.globalAlpha = 1;
    // stickers and torn posters
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = ['#f4f1ea', '#e8402a', '#141414', '#f2c230', '#2f6fd6'][Math.floor(rand() * 5)];
      const sw = 20 + rand() * 60;
      const sx = rand() * w;
      const sy = h * 0.45 + rand() * h * 0.4;
      ctx.fillRect(sx, sy, sw, sw * (0.4 + rand()));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx + 4, sy + 6, sw * 0.6, 3);
    }
    // grime at the foot and weather on top
    const g = ctx.createLinearGradient(0, h, 0, h * 0.8);
    g.addColorStop(0, 'rgba(20,16,12,0.55)');
    g.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
  });
}

/**
 * Texturas procedurais pequenas (Canvas 2D): partículas, chuva, névoa, coração
 * e vinheta. A arte do cenário e dos personagens vem de PNGs em public/assets
 * (gerados por scripts/generate-art.mjs e scripts/build-sprites.mjs).
 */
import { createRng } from '../core/rng.js';

const TAU = Math.PI * 2;

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
}

function vGrad(ctx, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function createTextures(scene) {
  // ---------------------------------------------------------------- partículas
  canvasTex(scene, 'spark', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
  canvasTex(scene, 'glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  canvasTex(scene, 'leaf', 28, 16, (ctx) => {
    ctx.fillStyle = '#4f9a36';
    ctx.beginPath();
    ctx.moveTo(1, 8);
    ctx.quadraticCurveTo(14, -3, 27, 8);
    ctx.quadraticCurveTo(14, 19, 1, 8);
    ctx.fill();
    ctx.strokeStyle = '#2b5e1d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(26, 8);
    ctx.stroke();
  });
  canvasTex(scene, 'drop', 4, 22, (ctx) => {
    ctx.fillStyle = vGrad(ctx, 22, [[0, 'rgba(200,220,255,0)'], [1, 'rgba(210,230,255,0.85)']]);
    ctx.fillRect(1, 0, 2, 22);
  });

  // ---------------------------------------------------------------- chuva (tile)
  for (const [key, count, len, alpha, seed] of [['rain_far', 140, 16, 0.25, 3], ['rain_near', 60, 34, 0.42, 5]]) {
    canvasTex(scene, key, 256, 256, (ctx) => {
      const rng = createRng(seed);
      ctx.strokeStyle = `rgba(190,210,255,${alpha})`;
      ctx.lineWidth = key === 'rain_near' ? 1.6 : 1;
      for (let i = 0; i < count; i++) {
        const x = rng.range(0, 256);
        const y = rng.range(0, 256);
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.lineTo(x + ox - len * 0.28, y + oy + len);
          ctx.stroke();
        }
      }
    });
  }

  // ---------------------------------------------------------------- névoa (tile)
  canvasTex(scene, 'fog', 1024, 256, (ctx, w, h) => {
    const rng = createRng(11);
    for (let i = 0; i < 46; i++) {
      const x = rng.range(0, w);
      const y = rng.range(h * 0.25, h * 0.85);
      const r = rng.range(50, 140);
      for (const ox of [-w, 0, w]) {
        const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        g.addColorStop(0, 'rgba(150,170,210,0.16)');
        g.addColorStop(1, 'rgba(150,170,210,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
  });

  // Coração e exclamação para a cena final
  canvasTex(scene, 'heart', 128, 116, (ctx) => {
    ctx.fillStyle = '#ff3b5c';
    ctx.beginPath();
    ctx.moveTo(64, 112);
    ctx.bezierCurveTo(8, 72, -4, 30, 26, 12);
    ctx.bezierCurveTo(46, 0, 60, 12, 64, 26);
    ctx.bezierCurveTo(68, 12, 82, 0, 102, 12);
    ctx.bezierCurveTo(132, 30, 120, 72, 64, 112);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(36, 32, 12, 7, -0.6, 0, TAU);
    ctx.fill();
  });

  // Vinheta (bordas escuras da tela)
  canvasTex(scene, 'vignette', 512, 288, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

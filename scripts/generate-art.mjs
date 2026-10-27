/**
 * Gera a arte do cenário (estilo cartoon, contornos orgânicos) em SVG e
 * converte para PNG em public/assets/environment/.
 *
 * Uso: npm run art            (só cria os PNGs que ainda não existem)
 *      npm run art -- --force (recria todos, apagando a arte atual!)
 *
 * Cada arquivo é independente: para trocar por uma arte desenhada à mão,
 * substitua o PNG mantendo o nome e o tamanho aproximado.
 *   sky.png, mountains.png, jungle_far.png, jungle_mid.png  → paralaxe (tileáveis na horizontal)
 *   foreground.png                                         → folhagem de primeiro plano (tileável)
 *   canopy_0..3.png                                        → copas que seguram os cipós
 *   trunk.png                                              → tronco (tileável na vertical)
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRng } from '../src/core/rng.js';

const OUT = 'public/assets/environment';
const TAU = Math.PI * 2;
const OUTLINE = '#0a1a10';
// nunca sobrescreve arte que você colocou na pasta, a menos que peça --force
const FORCE = process.argv.includes('--force');

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

async function render(name, w, h, body, defs) {
  if (!FORCE && existsSync(`${OUT}/${name}`)) { console.log('   (mantido)', name); return; }
  await sharp(Buffer.from(svg(w, h, body, defs))).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}`);
  console.log('  ', name);
}

/** Contorno "recortado" de copa de árvore: bolhas ao redor de uma elipse. */
function crownPath(cx, cy, rx, ry, rng, { bumps = 14, depth = 0.22, flatBottom = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * TAU + rng.range(-0.08, 0.08);
    let r = 1 + rng.range(-0.1, 0.1);
    let y = cy + Math.sin(a) * ry * r;
    if (flatBottom && Math.sin(a) > 0.2) y = cy + ry * (0.35 + 0.65 * (1 - flatBottom)) * Math.sin(a) * r;
    pts.push({ x: cx + Math.cos(a) * rx * r, y });
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    // empurra o ponto de controle para fora → "bolha"
    const ox = mx - cx;
    const oy = my - cy;
    const len = Math.hypot(ox / rx, oy / ry) || 1;
    const k = 1 + depth * rng.range(0.7, 1.3);
    d += ` Q${(cx + (ox / len) * k * 1.04).toFixed(1)},${(cy + (oy / len) * k * 1.04).toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;
  }
  return d + ' Z';
}

/** Folha pontuda (estilo cartoon) apontando para "angle". */
function leaf(x, y, len, wid, angle, fill, { vein = '#9be06a', stroke = OUTLINE, sw = 2.2, opacity = 1 } = {}) {
  const d = `M0,0 C${len * 0.25},${-wid} ${len * 0.7},${-wid * 0.9} ${len},0 C${len * 0.7},${wid * 0.9} ${len * 0.25},${wid} 0,0 Z`;
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${((angle * 180) / Math.PI).toFixed(1)})" opacity="${opacity}">
    <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    <path d="M${len * 0.06},0 Q${len * 0.5},${-wid * 0.12} ${len * 0.92},0" fill="none" stroke="${vein}" stroke-width="${sw * 0.7}" stroke-linecap="round" opacity="0.7"/></g>`;
}

/** Três camadas (sombra, base, luz) de uma copa — dá volume no estilo desenho animado. */
function crown(cx, cy, rx, ry, rng, pal, opts = {}) {
  const base = crownPath(cx, cy, rx, ry, rng, opts);
  const light = crownPath(cx - rx * 0.12, cy - ry * 0.16, rx * 0.72, ry * 0.62, rng, { bumps: 11, depth: 0.25 });
  const top = crownPath(cx - rx * 0.22, cy - ry * 0.3, rx * 0.4, ry * 0.32, rng, { bumps: 8, depth: 0.3 });
  return `<path d="${base}" fill="${pal.dark}" stroke="${pal.outline ?? OUTLINE}" stroke-width="${pal.sw ?? 5}" stroke-linejoin="round"/>
    <path d="${light}" fill="${pal.mid}" opacity="0.95"/>
    <path d="${top}" fill="${pal.light}" opacity="${pal.lightOpacity ?? 0.9}"/>`;
}

// ------------------------------------------------------------------ copas (seguram os cipós)
async function canopies() {
  const pal = { dark: '#163f22', mid: '#24652f', light: '#4e9a3c' };
  for (let v = 0; v < 4; v++) {
    const rng = createRng(100 + v);
    const W = 640, H = 440;
    let body = '';
    // massa de fundo (mais escura)
    for (let i = 0; i < 4; i++) {
      body += crown(175 + i * 97 + rng.range(-12, 12), 175 + rng.range(-25, 15), rng.range(105, 130), rng.range(85, 110), rng,
        { dark: '#0f2f1a', mid: '#173f22', light: '#21522a', sw: 5 }, { bumps: 13 });
    }
    // copas principais
    for (let i = 0; i < 3; i++) {
      body += crown(190 + i * 130 + rng.range(-15, 15), 205 + rng.range(-20, 20), rng.range(115, 135), rng.range(85, 105), rng, pal, { bumps: 15 });
    }
    // folhas pendentes na borda de baixo
    for (let i = 0; i < 26; i++) {
      const x = rng.range(90, W - 90);
      const y = rng.range(255, 300);
      body += leaf(x, y, rng.range(34, 60), rng.range(10, 16), Math.PI / 2 + rng.range(-0.7, 0.7), rng.pick(['#2e7d34', '#3d9440', '#256b2d']));
    }
    // musgo e fiapos pendurados
    for (let i = 0; i < 14; i++) {
      const x = rng.range(60, W - 60);
      const y0 = rng.range(270, 300);
      const len = rng.range(30, 110);
      body += `<path d="M${x},${y0} q${rng.range(-10, 10)},${len / 2} ${rng.range(-6, 6)},${len}" fill="none" stroke="#2d5e22" stroke-width="${rng.range(2, 4).toFixed(1)}" stroke-linecap="round"/>`;
      body += `<circle cx="${x}" cy="${y0 + len}" r="2.5" fill="#9fd8ff" opacity="0.7"/>`;
    }
    // folhas soltas por cima (detalhe e brilho da chuva)
    for (let i = 0; i < 34; i++) {
      const x = rng.range(110, W - 110);
      const y = rng.range(110, 260);
      body += leaf(x, y, rng.range(26, 46), rng.range(8, 13), rng.range(-0.6, 0.6) + (rng.chance(0.5) ? 0 : Math.PI), rng.pick(['#3f9a3e', '#58ad44', '#2f7f35']), { sw: 1.8 });
    }
    // brilho frio da tempestade no topo
    body += `<ellipse cx="${W / 2}" cy="120" rx="${W * 0.45}" ry="70" fill="url(#rim)" opacity="0.35"/>`;
    const defs = `<radialGradient id="rim"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#bfe8ff" stop-opacity="0"/></radialGradient>`;
    await render(`canopy_${v}.png`, W, H, body, defs);
  }
}

// ------------------------------------------------------------------ tronco (tileável na vertical)
async function trunk() {
  const W = 240, H = 512;
  const rng = createRng(7);
  let body = `<rect x="22" y="0" width="${W - 44}" height="${H}" fill="url(#bark)"/>`;
  // sulcos da casca (periódicos em H para encaixar)
  for (let i = 0; i < 9; i++) {
    const x0 = 40 + i * 20 + rng.range(-5, 5);
    const amp = rng.range(4, 9);
    const ph = rng.range(0, TAU);
    let d = `M${x0},0`;
    for (let y = 0; y <= H; y += 16) d += ` L${(x0 + Math.sin((y / H) * TAU * 2 + ph) * amp).toFixed(1)},${y}`;
    body += `<path d="${d}" fill="none" stroke="#2a1608" stroke-width="${rng.range(2.5, 4.5).toFixed(1)}" stroke-linecap="round" opacity="0.75"/>`;
    body += `<path d="${d}" fill="none" stroke="#c98a4e" stroke-width="1.4" opacity="0.35" transform="translate(3,0)"/>`;
  }
  // musgo e hera (repetidos em y e y+H para tileamento)
  for (let i = 0; i < 10; i++) {
    const x = rng.range(30, W - 30);
    const y = rng.range(0, H);
    for (const oy of [-H, 0, H]) {
      body += `<ellipse cx="${x}" cy="${y + oy}" rx="${rng.range(10, 22).toFixed(1)}" ry="${rng.range(6, 12).toFixed(1)}" fill="#3d7a2c" opacity="0.8"/>`;
      body += leaf(x - 8, y + oy, 22, 8, rng.range(-1, 1), '#4e9a3c', { sw: 1.5 });
    }
  }
  // contorno grosso nas laterais (estilo desenho)
  body += `<path d="M22,0 L22,${H}" stroke="${OUTLINE}" stroke-width="8"/><path d="M${W - 22},0 L${W - 22},${H}" stroke="${OUTLINE}" stroke-width="8"/>`;
  // luz quente à esquerda, luz fria (raios) à direita
  body += `<rect x="26" y="0" width="28" height="${H}" fill="#ffb066" opacity="0.18"/>`;
  body += `<rect x="${W - 46}" y="0" width="20" height="${H}" fill="#8fc4ff" opacity="0.12"/>`;
  const defs = `<linearGradient id="bark" x1="0" x2="1"><stop offset="0" stop-color="#8a5228"/><stop offset="0.45" stop-color="#6a3b1d"/><stop offset="1" stop-color="#2b170b"/></linearGradient>`;
  await render('trunk.png', W, H, body, defs);
}

// ------------------------------------------------------------------ paralaxe
/** Repete elementos em x-W, x e x+W para a textura encaixar nas bordas. */
const wrap3 = (W, fn) => [-W, 0, W].map((ox) => `<g transform="translate(${ox},0)">${fn()}</g>`).join('');

async function sky() {
  const W = 2048, H = 900;
  const rng = createRng(11);
  let clouds = '';
  for (let i = 0; i < 16; i++) {
    const cx = rng.range(0, W);
    const cy = rng.range(60, 420);
    const rx = rng.range(140, 300);
    const ry = rng.range(45, 90);
    const p = crownPath(cx, cy, rx, ry, rng, { bumps: 12, depth: 0.28, flatBottom: 0.6 });
    const lp = crownPath(cx - rx * 0.1, cy - ry * 0.25, rx * 0.7, ry * 0.5, rng, { bumps: 9, depth: 0.3 });
    clouds += `<path d="${p}" fill="#1a2550" stroke="#0c1230" stroke-width="4" opacity="0.95"/><path d="${lp}" fill="#2c3d78" opacity="0.8"/>`;
    clouds += `<path d="${p}" fill="none" stroke="#7f9fe0" stroke-width="2" opacity="0.25" transform="translate(0,-3)"/>`;
  }
  const body = `<rect width="${W}" height="${H}" fill="url(#g)"/>
    <ellipse cx="${W * 0.7}" cy="380" rx="420" ry="190" fill="url(#glow)" opacity="0.55"/>
    <ellipse cx="${W * 0.2}" cy="300" rx="300" ry="140" fill="url(#glow)" opacity="0.35"/>
    ${wrap3(W, () => clouds)}`;
  const defs = `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a1c"/><stop offset="0.55" stop-color="#142452"/><stop offset="1" stop-color="#2a4776"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#8fb4ff"/><stop offset="1" stop-color="#8fb4ff" stop-opacity="0"/></radialGradient>`;
  await render('sky.png', W, H, body, defs);
}

async function mountains() {
  const W = 2048, H = 620;
  const rng = createRng(21);
  let shapes = '';
  // morros arredondados (cartoon) em duas fileiras, com cachoeiras finas
  for (const [row, color, light, count, yTop] of [[0, '#1c2a52', '#2a3d6e', 9, 230], [1, '#24365f', '#34507e', 7, 300]]) {
    for (let i = 0; i < count; i++) {
      const x = (i + rng.range(0.1, 0.9)) * (W / count);
      const rx = rng.range(150, 260) * (row ? 1.1 : 0.9);
      const ry = rng.range(150, 260);
      const cy = yTop + ry * 0.75;
      const p = crownPath(x, cy, rx, ry, rng, { bumps: 18, depth: 0.12 });
      const lp = crownPath(x - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.5, rng, { bumps: 12, depth: 0.15 });
      shapes += `<path d="${p}" fill="${color}" stroke="#101833" stroke-width="4"/><path d="${lp}" fill="${light}" opacity="0.55"/>`;
      // mata no topo do morro
      shapes += `<path d="${crownPath(x, cy - ry * 0.92, rx * 0.5, 18, rng, { bumps: 14, depth: 0.4 })}" fill="#1f4250" opacity="0.9"/>`;
      if (rng.chance(0.5)) {
        const wx = x + rng.range(-rx / 3, rx / 3);
        shapes += `<path d="M${wx},${cy - ry * 0.7} q${rng.range(-4, 4)},${ry} 0,${H}" stroke="url(#fall)" stroke-width="${rng.range(5, 9).toFixed(0)}" fill="none" stroke-linecap="round" opacity="0.35"/>`;
      }
    }
  }
  const body = wrap3(W, () => shapes) + `<rect y="${H * 0.45}" width="${W}" height="${H * 0.55}" fill="url(#mist)"/>`;
  const defs = `<linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dff2ff"/><stop offset="1" stop-color="#dff2ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5a86" stop-opacity="0"/><stop offset="1" stop-color="#3b5a86" stop-opacity="0.8"/></linearGradient>`;
  await render('mountains.png', W, H, body, defs);
}

/** Camada de selva: troncos + copas recortadas, com névoa na base. */
async function jungle(name, { seed, W, H, count, baseY, rMin, rMax, pal, trunkColor, trunkW, mist }) {
  const rng = createRng(seed);
  let shapes = '';
  const trees = [];
  for (let i = 0; i < count; i++) {
    trees.push({ x: (i + rng.range(0.1, 0.9)) * (W / count), r: rng.range(rMin, rMax), top: baseY - rng.range(40, 160) });
  }
  // troncos
  for (const t of trees) {
    const tw = trunkW * rng.range(0.7, 1.2);
    shapes += `<path d="M${t.x - tw / 2},${H} C${t.x - tw / 2},${t.top + 200} ${t.x - tw * 0.2},${t.top + 80} ${t.x - tw * 0.25},${t.top}
      L${t.x + tw * 0.25},${t.top} C${t.x + tw * 0.2},${t.top + 80} ${t.x + tw / 2},${t.top + 200} ${t.x + tw / 2},${H} Z" fill="${trunkColor}" stroke="${pal.outline}" stroke-width="3"/>`;
    for (let k = 0; k < 3; k++) {
      const vx = t.x + rng.range(-t.r * 0.8, t.r * 0.8);
      const len = rng.range(60, 200);
      shapes += `<path d="M${vx},${t.top + 20} q${rng.range(-15, 15)},${len / 2} ${rng.range(-8, 8)},${len}" fill="none" stroke="${pal.dark}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  // copas
  for (const t of trees) shapes += crown(t.x, t.top, t.r, t.r * 0.62, rng, pal, { bumps: 16, depth: 0.3 });
  // massa contínua na base
  let d = `M0,${H}`;
  for (let x = 0; x <= W; x += 64) d += ` L${x},${baseY + 60 + Math.sin((x / W) * TAU * 3) * 25 + Math.sin((x / W) * TAU * 7) * 10}`;
  d += ` L${W},${H} Z`;
  shapes += `<path d="${d}" fill="${pal.dark}"/>`;
  for (let x = 0; x < W; x += 70) shapes += crown(x, baseY + 70 + Math.sin((x / W) * TAU * 3) * 25, 60, 30, rng, pal, { bumps: 9, depth: 0.35 });
  const body = wrap3(W, () => shapes) + (mist ? `<rect y="${baseY}" width="${W}" height="${H - baseY}" fill="url(#mist)"/>` : '');
  const defs = mist ? `<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mist}" stop-opacity="0"/><stop offset="1" stop-color="${mist}" stop-opacity="0.85"/></linearGradient>` : '';
  await render(name, W, H, body, defs);
}

async function foreground() {
  const W = 2048, H = 320;
  const rng = createRng(61);
  let shapes = '';
  for (let i = 0; i < 40; i++) {
    const x = rng.range(0, W);
    const len = rng.range(120, 300);
    const ang = -Math.PI / 2 + rng.range(-1.1, 1.1);
    shapes += leaf(x, H + 20, len, len * rng.range(0.16, 0.26), ang, rng.pick(['#071510', '#0a1d14', '#0d2418']), { vein: '#1d3d2a', stroke: '#030805', sw: 3 });
  }
  // samambaias
  for (let i = 0; i < 12; i++) {
    const x = rng.range(0, W);
    let fern = `<path d="M${x},${H} Q${x + 20},${H - 120} ${x + 90},${H - 200}" fill="none" stroke="#08180f" stroke-width="5"/>`;
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const px = x + 90 * t * t + 20 * t;
      const py = H - 200 * t;
      fern += leaf(px, py, 40 * (1 - t * 0.6), 7, -Math.PI / 2 - 0.9, '#0a1d14', { sw: 1.5, vein: '#163323' });
      fern += leaf(px, py, 40 * (1 - t * 0.6), 7, -Math.PI / 2 + 0.6, '#0a1d14', { sw: 1.5, vein: '#163323' });
    }
    shapes += fern;
  }
  await render('foreground.png', W, H, wrap3(W, () => shapes));
}

await mkdir(OUT, { recursive: true });
console.log('Gerando arte do cenário em', OUT);
await canopies();
await trunk();
await sky();
await mountains();
await jungle('jungle_far.png', {
  seed: 31, W: 2048, H: 640, count: 14, baseY: 300, rMin: 80, rMax: 140, trunkColor: '#1b3046', trunkW: 22,
  pal: { dark: '#1b3550', mid: '#23466a', light: '#2f5d80', outline: '#0e1c30', sw: 3, lightOpacity: 0.8 }, mist: '#2c4a74',
});
await jungle('jungle_mid.png', {
  seed: 41, W: 2048, H: 760, count: 9, baseY: 330, rMin: 120, rMax: 200, trunkColor: '#1e2a24', trunkW: 44,
  pal: { dark: '#12302a', mid: '#1b4638', light: '#2a6048', outline: '#07130f', sw: 4, lightOpacity: 0.85 }, mist: '#1d3550',
});
await foreground();
console.log('Pronto.');

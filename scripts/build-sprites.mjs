/**
 * Recorta as folhas de animação de /assets em PNGs individuais (um por quadro)
 * e gera public/assets/sprites.json com animações, pontos de apoio (pivots) e escalas.
 *
 * Uso: npm run sprites
 *
 * Para trocar uma arte no futuro, basta substituir o PNG em public/assets mantendo
 * o mesmo nome (ou ajustar sprites.json). As folhas originais ficam em /assets.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'public/assets';
const MONKEY_JUMP = 'assets/Gorila Herói em Salto Dinâmico.png';
const JAGUAR_SHEET = 'assets/movimentação_jaguar.png';
const JAGUAR_POSE = 'assets/jaguar.png';

// ------------------------------------------------------------------ utilitários
async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/** Rotula componentes conectados (alpha > threshold). */
function label(img, threshold) {
  const { data, W, H } = img;
  const parent = new Int32Array(W * H).fill(-1);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (data[i * 4 + 3] <= threshold) continue;
    parent[i] = i;
    if (x > 0 && parent[i - 1] >= 0) { const a = find(i - 1); const b = find(i); if (a !== b) parent[b] = a; }
    if (y > 0 && parent[i - W] >= 0) { const a = find(i - W); const b = find(i); if (a !== b) parent[b] = a; }
  }
  const root = new Int32Array(W * H).fill(-1);
  const stats = new Map();
  for (let i = 0; i < W * H; i++) {
    if (parent[i] < 0) continue;
    const r = find(i);
    root[i] = r;
    const x = i % W, y = (i / W) | 0;
    let s = stats.get(r);
    if (!s) stats.set(r, (s = { sx: 0, sy: 0, n: 0 }));
    s.sx += x; s.sy += y; s.n++;
  }
  return { root, stats };
}

/**
 * Extrai um quadro: pixels dos componentes cujo centro está dentro da caixa,
 * mais a borda suave (antialias) ao redor deles. Remove sujeira e vizinhos.
 */
function extract(img, lab, box) {
  const { data, W } = img;
  const keep = new Set();
  for (const [r, s] of lab.stats) {
    const cx = s.sx / s.n, cy = s.sy / s.n;
    if (s.n >= 40 && cx >= box.x1 && cx <= box.x2 && cy >= box.y1 && cy <= box.y2) keep.add(r);
  }
  const pad = 6;
  const x1 = Math.max(0, box.x1 - pad), y1 = Math.max(0, box.y1 - pad);
  const x2 = Math.min(W - 1, box.x2 + pad), y2 = Math.min(img.H - 1, box.y2 + pad);
  const w = x2 - x1 + 1, h = y2 - y1 + 1;
  const out = Buffer.alloc(w * h * 4);
  const inSet = (x, y) => x >= 0 && y >= 0 && x < W && y < img.H && keep.has(lab.root[y * W + x]);
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    const i = y * W + x;
    let ok = keep.has(lab.root[i]);
    if (!ok && lab.root[i] < 0 && data[i * 4 + 3] > 0) {
      // borda suave: vizinho a até 2px de um pixel do quadro
      for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) ok = inSet(x + dx, y + dy);
    }
    if (!ok) continue;
    const o = ((y - y1) * w + (x - x1)) * 4;
    data.copy(out, o, i * 4, i * 4 + 4);
    // "fecha" o alpha quase opaco (as folhas vêm com alpha ~250)
    if (out[o + 3] > 200) out[o + 3] = 255;
  }
  return { buf: out, w, h };
}

/** Recorta o retângulo útil (alpha > 8), salva com escala e devolve medidas/pivots. */
async function save(frame, file, scale) {
  const { buf, w, h } = frame;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (buf[(y * w + x) * 4 + 3] > 8) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  // medidas no recorte (antes da escala)
  let topX = 0, sx = 0, sy = 0, n = 0, footSum = 0, footN = 0, topSum = 0, topN = 0;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (buf[(y * w + x) * 4 + 3] < 128) continue;
    sx += x; sy += y; n++;
    if (y >= maxY - 10) { footSum += x; footN++; }
    if (y <= minY + 14) { topSum += x; topN++; }
  }
  topX = topSum / Math.max(1, topN);
  const out = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(Math.round(cw * scale), Math.round(ch * scale))
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
  const k = out.width / cw;
  return {
    file,
    w: out.width,
    h: out.height,
    // pivots normalizados (0..1) — usados como origin no Phaser
    center: { x: ((sx / n) - minX) / cw, y: ((sy / n) - minY) / ch },
    feet: { x: ((footSum / Math.max(1, footN)) - minX) / cw, y: 1 },
    top: { x: (topX - minX) / cw, y: 0 },
    // ângulo do vetor ponto-mais-alto → centro (para pendurar pelo punho)
    hangAngle: Math.atan2((sx / n) - topX, (sy / n) - minY),
    scaleBuilt: k,
  };
}

// ------------------------------------------------------------------ macaco
const MONKEY_BOXES = {
  walk_0: [48, 13, 364, 373], walk_1: [411, 21, 715, 372], walk_2: [757, 20, 1077, 369], walk_3: [1127, 20, 1426, 373],
  crouch: [29, 490, 332, 727], jump: [375, 389, 716, 741], fly: [753, 403, 1124, 668], land: [1138, 476, 1436, 720],
  reachback: [19, 792, 364, 1071], leap: [364, 742, 717, 999], dive: [726, 775, 1164, 1025], idle: [1164, 802, 1442, 1057],
};

// ------------------------------------------------------------------ macaca (companheira)
const FEMALE_ROWS = [
  { anim: 'idle', y: [55, 290], x: [0, 800] },
  { anim: 'happy', y: [30, 292], x: [810, 1536] },
  { anim: 'walk', y: [335, 550], x: [0, 920] },
  { anim: 'scared', y: [340, 550], x: [920, 1536] },
];

async function buildCharacters(manifest) {
  await mkdir(`${OUT}/characters/monkey`, { recursive: true });
  await mkdir(`${OUT}/characters/companion`, { recursive: true });
  await mkdir(`${OUT}/characters/jaguar`, { recursive: true });

  // Macaco
  const mImg = await loadRaw('assets/movimentação_personagem_principal.png');
  const mLab = label(mImg, 100);
  const monkey = { scale: 0.34 / 0.6, frames: {} };
  for (const [name, [x1, y1, x2, y2]] of Object.entries(MONKEY_BOXES)) {
    monkey.frames[name] = await save(extract(mImg, mLab, { x1, y1, x2, y2 }), `characters/monkey/${name}.png`, 0.6);
  }
  // pulo/pendurado em alta resolução (arte avulsa). A cabeça nessa imagem é
  // ~2,8× maior que na folha, por isso a escala menor.
  if (existsSync(MONKEY_JUMP)) {
    const img = await loadRaw(MONKEY_JUMP);
    const lab = label(img, 100);
    monkey.frames.jump = await save(extract(img, lab, { x1: 0, y1: 0, x2: img.W - 1, y2: img.H - 1 }), 'characters/monkey/jump.png', 0.6 * 0.36);
  }
  manifest.monkey = monkey;

  // Companheira: detecta os quadros de cada linha (ignora as plaquinhas de texto)
  const fImg = await loadRaw('assets/macaca_femea_a_ser_resgatada.png');
  const fLab = label(fImg, 100);
  const companion = { scale: 0.47 / 0.9, frames: {}, anims: {} };
  const comps = [...fLab.stats.entries()].filter(([, s]) => s.n > 3000).map(([r, s]) => ({ r, cx: s.sx / s.n, cy: s.sy / s.n }));
  for (const row of FEMALE_ROWS) {
    // caixas: componentes grandes desta linha, ordenados por x
    const inRow = comps.filter((c) => c.cx >= row.x[0] && c.cx < row.x[1] && c.cy >= row.y[0] && c.cy <= row.y[1]).sort((a, b) => a.cx - b.cx);
    const names = [];
    for (let i = 0; i < inRow.length; i++) {
      const c = inRow[i];
      // caixa do componente
      let x1 = Infinity, y1 = Infinity, x2 = -1, y2 = -1;
      for (let y = row.y[0]; y <= row.y[1]; y++) for (let x = Math.max(0, Math.floor(c.cx - 160)); x < Math.min(fImg.W, c.cx + 160); x++) {
        if (fLab.root[y * fImg.W + x] === c.r) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); }
      }
      const h = y2 - y1;
      if (h < 120) continue; // plaquinha de texto
      const name = `${row.anim}_${names.length}`;
      companion.frames[name] = await save(extract(fImg, { ...fLab, stats: new Map([[c.r, fLab.stats.get(c.r)]]) }, { x1, y1, x2, y2 }), `characters/companion/${name}.png`, 0.9);
      names.push(name);
    }
    companion.anims[row.anim] = names;
  }
  manifest.companion = companion;

  manifest.jaguar = await buildJaguar();
}

/**
 * Onça: assets/movimentação_jaguar.png (2 linhas × 6 quadros, de perfil olhando
 * para a direita). Linha de cima = escalada; linha de baixo = virando de costas
 * (usada na fuga). assets/jaguar.png = pose grande do rugido.
 */
async function buildJaguar() {
  const img = await loadRaw(JAGUAR_SHEET);
  const lab = label(img, 100);
  const comps = [];
  for (const [r, s] of lab.stats) {
    if (s.n < 2000) continue;
    comps.push({ r, cx: s.sx / s.n, cy: s.sy / s.n });
  }
  // caixa de cada componente grande
  const box = new Map(comps.map((c) => [c.r, { x1: Infinity, y1: Infinity, x2: -1, y2: -1 }]));
  for (let i = 0; i < img.W * img.H; i++) {
    const b = box.get(lab.root[i]);
    if (!b) continue;
    const x = i % img.W, y = (i / img.W) | 0;
    b.x1 = Math.min(b.x1, x); b.x2 = Math.max(b.x2, x); b.y1 = Math.min(b.y1, y); b.y2 = Math.max(b.y2, y);
  }
  const rows = [[], []];
  for (const c of comps) rows[c.cy < img.H / 2 ? 0 : 1].push({ ...c, ...box.get(c.r) });
  for (const row of rows) row.sort((a, b) => a.x1 - b.x1);

  const SCALE = 0.6;
  const jaguar = { scale: 0.5 / SCALE, frames: {}, anims: { climb: [], turn: [] } };
  // linha de cima: os dois primeiros quadros estão encostados (pata do 1º toca o 2º).
  // Usamos só a parte da direita (2º quadro em diante) — corte em x≈306 (y<395) / 240.
  const top = rows[0];
  for (const c of top) {
    let pred = null;
    let b = c;
    if (c.x2 - c.x1 > 380) {
      pred = (x, y) => x >= (y < 395 ? 306 : 240);
      b = { ...c, x1: 240 };
    }
    const name = `climb_${jaguar.anims.climb.length}`;
    jaguar.frames[name] = await save(extractRoot(img, lab, c.r, b, pred), `characters/jaguar/${name}.png`, SCALE);
    jaguar.anims.climb.push(name);
  }
  for (const c of rows[1]) {
    const name = `turn_${jaguar.anims.turn.length}`;
    jaguar.frames[name] = await save(extractRoot(img, lab, c.r, c, null), `characters/jaguar/${name}.png`, SCALE);
    jaguar.anims.turn.push(name);
  }
  // pose do rugido (imagem grande): mesma altura dos quadros de escalada (+8%)
  const pose = await loadRaw(JAGUAR_POSE);
  const pLab = label(pose, 100);
  let py1 = pose.H, py2 = 0;
  for (let i = 0; i < pose.W * pose.H; i++) if (pose.data[i * 4 + 3] > 100) { const y = (i / pose.W) | 0; py1 = Math.min(py1, y); py2 = Math.max(py2, y); }
  const climbH = top.reduce((s, c) => s + (c.y2 - c.y1), 0) / top.length;
  jaguar.frames.roar = await save(extract(pose, pLab, { x1: 0, y1: 0, x2: pose.W - 1, y2: pose.H - 1 }), 'characters/jaguar/roar.png', SCALE * (climbH * 1.08) / (py2 - py1));
  return jaguar;
}

/** Extrai um único componente (com borda suave), opcionalmente filtrando pixels. */
function extractRoot(img, lab, r, b, pred) {
  const { data, W } = img;
  const pad = 6;
  const x1 = Math.max(0, b.x1 - pad), y1 = Math.max(0, b.y1 - pad);
  const x2 = Math.min(W - 1, b.x2 + pad), y2 = Math.min(img.H - 1, b.y2 + pad);
  const w = x2 - x1 + 1, h = y2 - y1 + 1;
  const out = Buffer.alloc(w * h * 4);
  const mine = (x, y) => x >= 0 && y >= 0 && x < W && y < img.H && lab.root[y * W + x] === r && (!pred || pred(x, y));
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    const i = y * W + x;
    if (pred && !pred(x, y)) continue;
    let ok = lab.root[i] === r;
    if (!ok && lab.root[i] < 0 && data[i * 4 + 3] > 0) {
      for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) ok = mine(x + dx, y + dy);
    }
    if (!ok) continue;
    const o = ((y - y1) * w + (x - x1)) * 4;
    data.copy(out, o, i * 4, i * 4 + 4);
    if (out[o + 3] > 200) out[o + 3] = 255;
  }
  return { buf: out, w, h };
}

// ------------------------------------------------------------------ cipós
async function buildVines(manifest) {
  await mkdir(`${OUT}/environment/vine`, { recursive: true });
  for (const [kind, file] of [['normal', 'assets/cipo_nnormal_movimentos.png'], ['magic', 'assets/cipo_magico-movimentos.png']]) {
    const img = await loadRaw(file);
    const lab = label(img, 60);
    const comps = [...lab.stats.entries()].filter(([, s]) => s.n > 20000).map(([r, s]) => ({ r, cx: s.sx / s.n })).sort((a, b) => a.cx - b.cx);
    const list = [];
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      const left = i === 0 ? 0 : (comps[i - 1].cx + c.cx) / 2;
      const right = i === comps.length - 1 ? img.W - 1 : (comps[i + 1].cx + c.cx) / 2;
      const name = `${kind}_${i}`;
      const f = await save(extract(img, lab, { x1: Math.floor(left), y1: 0, x2: Math.ceil(right), y2: img.H - 1 }), `environment/vine/${name}.png`, 0.6);
      list.push({ ...f, name });
    }
    manifest.vines[kind] = list;
  }
}

// ------------------------------------------------------------------ capa
// (As árvores de início/fim e o resto do cenário são PNGs próprios em
//  public/assets/environment; as medidas deles ficam em public/assets/art.json.)
async function buildCover() {
  await mkdir(`${OUT}/ui`, { recursive: true });
  await sharp('assets/capa_monkey_fast.png').resize(1774).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}/ui/cover.jpg`);
}

const manifest = { version: 2, vines: {} };
await buildCharacters(manifest);
await buildVines(manifest);
await buildCover();
await writeFile(`${OUT}/sprites.json`, JSON.stringify(manifest, null, 1));
console.log('Sprites gerados em', OUT);

/**
 * Desenha o cenário do mundo (escala 1:1 com a física):
 *  - árvore do ponto de partida com o galho inicial
 *  - copa contínua de árvores no alto, de onde pendem os cipós
 *  - troncos de árvores gigantes descendo até a névoa
 *  - árvore mais alta da floresta no final (galho da companheira)
 * Também faz o "culling": esconde o que está fora da câmera.
 *
 * Todas as peças são PNGs em public/assets/environment (substituíveis); as
 * medidas de cada uma ficam em public/assets/art.json.
 */
import { DEPTH } from '../config/depths.js';
import { createRng } from '../core/rng.js';
import { VineView } from '../entities/Vine.js';

export class LevelRenderer {
  constructor(scene, level, { quality = 'high' } = {}) {
    this.scene = scene;
    this.level = level;
    this.decor = []; // { obj, x1, x2 }
    this.vineViews = level.vines.map((v) => new VineView(scene, v, { glow: quality !== 'low' }));
    const rng = createRng(level.seed ^ 0x5eed);

    const start = level.platforms[0];
    this.startTree = placeTree(scene, 'start', start, this);
    const fin = level.platforms.find((p) => p.final);
    this.finalTree = placeTree(scene, 'final', fin, this);
    this.trunkFaceX = this.finalTree.trunkFaceX;

    placeCanopies(scene, level.vines, rng, this, { from: start.x2 + 60, to: fin.x1 - 40 });
    placeTrunks(scene, level.vines, rng, this);
  }

  add(obj, x1, x2) {
    this.decor.push({ obj, x1, x2 });
    return obj;
  }

  /** Mostra só o que está perto da câmera (economia em celulares). */
  cull(cam, magic, dt) {
    const view = cam.worldView;
    const x1 = view.x - 500;
    const x2 = view.right + 500;
    for (const d of this.decor) {
      const vis = d.x2 >= x1 && d.x1 <= x2;
      if (d.obj.visible !== vis) d.obj.setVisible(vis);
    }
    for (const vv of this.vineViews) {
      const v = vv.vine;
      vv.setVisible(v.ax + v.length >= x1 && v.ax - v.length <= x2);
      vv.update(dt, magic);
    }
  }

  viewFor(vineId) {
    return this.vineViews[vineId];
  }

  destroy() {
    for (const d of this.decor) d.obj.destroy();
    for (const v of this.vineViews) v.destroy();
  }
}

/** Largura da casca dentro de trunk.png (fração) e posição do centro dela. */
function barkInfo(scene) {
  const art = scene.cache.json.get('art');
  const tw = scene.textures.get('trunk').getSourceImage().width;
  const x1 = art.trunk?.barkX1 ?? 0;
  const x2 = art.trunk?.barkX2 ?? tw;
  return { tw, frac: (x2 - x1) / tw, center: (x1 + x2) / 2 / tw };
}

/** Tronco repetido na vertical cuja casca (sem as folhas laterais) tem largura barkW. */
function trunkTile(scene, cx, top, barkW, height, depth, tint) {
  const b = barkInfo(scene);
  const w = barkW / b.frac;
  const k = w / b.tw;
  const t = scene.add.tileSprite(cx - (b.center - 0.5) * w, top, w, height, 'trunk')
    .setOrigin(0.5, 0).setDepth(depth).setTileScale(k, k);
  if (tint != null) t.setTint(tint);
  return t;
}

/**
 * Posiciona a árvore inicial/final de forma que o topo do galho coincida com a
 * plataforma da física. Devolve informações úteis (ex.: face do tronco).
 */
export function placeTree(scene, kind, platform, sink) {
  const info = scene.cache.json.get('art').trees[kind];
  const key = `tree_${kind}`;
  const src = scene.textures.get(key).getSourceImage();
  const s = (platform.x2 - platform.x1) / (info.branchX2 - info.branchX1);
  const left = platform.x1 - info.branchX1 * s;
  const top = platform.y - info.branchTopY * s;
  const img = scene.add.image(left, top, key).setOrigin(0, 0).setScale(s).setDepth(DEPTH.platforms);
  sink.add(img, left, left + src.width * s);
  // o tronco continua para baixo (atrás do degradê da borda da árvore), sumindo na névoa
  const trunkCenter = left + ((info.trunkX1 + info.trunkX2) / 2) * s;
  const barkW = (info.trunkX2 - info.trunkX1) * s;
  const tileTop = top + (src.height - (info.fadeBottom ?? 0) - 30) * s;
  const below = trunkTile(scene, trunkCenter, tileTop, barkW, 3200, DEPTH.platforms - 0.5, 0xc8b8a8);
  sink.add(below, trunkCenter - below.width, trunkCenter + below.width);
  const face = info.trunkFaceX ?? info.trunkX2;
  return { image: img, scale: s, trunkFaceX: left + face * s };
}

/** Copa contínua: uma copa por cipó + copas de preenchimento entre eles. */
export function placeCanopies(scene, vines, rng, sink, { from = -Infinity, to = Infinity } = {}) {
  const art = scene.cache.json.get('art');
  const dispW = art.canopy?.displayWidth ?? 700;
  const put = (x, y, scale, tint, depth) => {
    const key = `canopy_${rng.int(0, 3)}`;
    const k = (dispW / scene.textures.get(key).getSourceImage().width) * scale;
    const img = scene.add.image(x, y, key).setOrigin(0.5, art.canopyAnchors?.[key] ?? 0.5)
      .setScale(k * (rng.chance(0.5) ? -1 : 1), k).setTint(tint).setDepth(depth);
    const half = (dispW * scale) / 2;
    sink.add(img, x - half, x + half);
    return img;
  };
  for (let i = 0; i < vines.length; i++) {
    const v = vines[i];
    // camada de trás (mais escura e mais alta) cobre o topo da tela
    put(v.ax + rng.range(-60, 60), v.ay - 170, rng.range(1.25, 1.5), 0x7f9a8c, DEPTH.branches - 0.5);
    // copa que segura o cipó
    put(v.ax + rng.range(-25, 25), v.ay + 12, rng.range(0.92, 1.08), 0xffffff, DEPTH.branches);
    // preenchimento entre este cipó e o próximo
    const n = vines[i + 1];
    if (n && n.ax - v.ax > 230) {
      const mx = (v.ax + n.ax) / 2;
      if (mx > from && mx < to) put(mx + rng.range(-30, 30), Math.min(v.ay, n.ay) - 30, rng.range(0.85, 1.0), 0xd0dcd4, DEPTH.branches - 0.2);
    }
  }
}

/** Troncos de árvores gigantes entre os cipós (atrás da ação). */
export function placeTrunks(scene, vines, rng, sink) {
  for (let i = 0; i + 1 < vines.length; i += 2) {
    const a = vines[i];
    const b = vines[i + 1];
    const x = (a.ax + b.ax) / 2 + rng.range(-40, 40);
    const w = rng.range(110, 170);
    const top = Math.min(a.ay, b.ay) - 120;
    const t = trunkTile(scene, x, top, w, 3600, DEPTH.trunks, 0x8a8078);
    t.tilePositionY = rng.range(0, 512);
    sink.add(t, x - t.width / 2, x + t.width / 2);
  }
}

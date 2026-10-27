/**
 * Paralaxe com múltiplas camadas independentes, reagindo ao movimento
 * horizontal E vertical da câmera:
 *   1. Céu noturno com nuvens de tempestade (sky.png)
 *   2. Montanhas/planaltos com cachoeiras (mountains.png) + névoa
 *   3. Selva distante (jungle_far.png) + névoa
 *   4. Selva intermediária (jungle_mid.png)
 *   (5. troncos e copas próximas, 6. cipós e 7. chuva/partículas ficam no
 *    mundo — LevelRenderer — e no WeatherSystem)
 * Todas as camadas são PNGs em public/assets/environment (substituíveis).
 */
import { DEPTH } from '../config/depths.js';

const LAYERS = [
// size = altura da camada em frações da altura da tela (vale para qualquer tamanho de PNG)
  { key: 'mountains', depth: DEPTH.mountains, fx: 0.05, fy: 0.03, baseY: 0.12, size: 0.75, fill: 0x2c4670 },
  { key: 'fog', depth: DEPTH.fog - 0.5, fx: 0.1, fy: 0.05, baseY: 0.42, scale: 1.4, fill: null, alpha: 0.7, drift: 10 },
  { key: 'jungle_far', depth: DEPTH.treesFar, fx: 0.14, fy: 0.08, baseY: 0.26, size: 0.78, fill: 0x284569 },
  { key: 'fog', depth: DEPTH.fog, fx: 0.22, fy: 0.1, baseY: 0.5, scale: 1.6, fill: null, alpha: 0.6, drift: 18 },
  { key: 'jungle_mid', depth: DEPTH.treesMid, fx: 0.3, fy: 0.16, baseY: 0.34, size: 0.9, fill: 0x1b3550 },
];

export class ParallaxBackground {
  constructor(scene, { quality = 'high', refY = 0 } = {}) {
    this.scene = scene;
    this.refY = refY;
    this.offset = 0;
    this.sky = scene.add.tileSprite(0, 0, 10, 10, 'sky').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.sky);
    this.layers = [];
    for (const def of LAYERS) {
      if (quality === 'low' && def.key === 'fog' && def.fx > 0.15) continue;
      const tex = scene.textures.get(def.key).getSourceImage();
      const ts = scene.add.tileSprite(0, 0, 10, tex.height, def.key).setOrigin(0, 0).setScrollFactor(0)
        .setDepth(def.depth).setAlpha(def.alpha ?? 1);
      // abaixo da camada, um retângulo da cor da base da própria arte (fica atrás dela)
      const fill = def.fill != null ? scene.add.rectangle(0, 0, 10, 10, baseColor(scene, def.key, def.fill)).setOrigin(0, 0).setScrollFactor(0).setDepth(def.depth - 0.01) : null;
      this.layers.push({ def, ts, fill, texH: tex.height });
    }
    this.resize();
  }

  resize() {
    const { width, height } = this.scene.scale;
    // céu cobre a tela inteira
    this.skyH = this.scene.textures.get('sky').getSourceImage().height;
    this.skyScale = (height / this.skyH) * 1.15;
    this.sky.setSize(width, height).setTileScale(this.skyScale, this.skyScale);
    for (const l of this.layers) {
      const sc = l.def.size ? (height * l.def.size) / l.texH : (height / 720) * l.def.scale;
      l.scale = sc;
      l.ts.setSize(width, Math.ceil(l.texH * sc));
      l.ts.setTileScale(sc, sc);
    }
    this.width = width;
    this.height = height;
  }

  /**
   * @param cam        câmera principal
   * @param dt         segundos
   * @param intensity  1 = normal; >1 durante power-ups (paralaxe mais intensa)
   */
  update(cam, dt, intensity = 1) {
    const { width, height } = this;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;
    this.offset += dt * 30 * (intensity - 1);
    const dyWorld = cy - this.refY;
    this.sky.tilePositionX = (cx * 0.02 + this.scene.time.now * 0.004) / this.skyScale;
    this.sky.tilePositionY = Math.max(0, Math.min(this.skyH * 0.12, 60 - dyWorld * 0.01));
    for (const l of this.layers) {
      const d = l.def;
      const fx = d.fx * intensity;
      const drift = (d.drift ?? 0) * this.scene.time.now * 0.001;
      l.ts.tilePositionX = (cx * fx + this.offset * d.fx * 10 + drift) / l.scale;
      const top = height * d.baseY - dyWorld * d.fy * cam.zoom;
      l.ts.setPosition(0, top);
      if (l.fill) {
        // começa um pouco acima da borda de baixo (cobre falhas transparentes na base da arte)
        const fy = top + l.texH * l.scale * 0.94;
        l.fill.setPosition(0, fy).setSize(width, Math.max(0, height - fy));
      }
    }
  }

  /** Relâmpago: céu e camadas distantes clareiam por instantes (k = 0..1). */
  setFlash(k) {
    // silhuetas distantes ficam azuladas/recortadas contra o clarão
    const tint = k > 0.01 ? 0xb8c8ff : 0xffffff;
    for (const l of this.layers) {
      if (l.def.key !== 'fog') l.ts.setTint(tint);
    }
  }

  destroy() {
    this.sky.destroy();
    for (const l of this.layers) {
      l.ts.destroy();
      l.fill?.destroy();
    }
  }
}

/** Cor média da faixa de baixo da imagem (pixels opacos), para emendar com o preenchimento. */
function baseColor(scene, key, fallback) {
  try {
    const src = scene.textures.get(key).getSourceImage();
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      for (const fy of [0.97, 0.99]) {
        const c = scene.textures.getPixel(Math.floor(((i + 0.5) / 40) * src.width), Math.floor(src.height * fy), key);
        if (c && c.alpha > 200) { r += c.red; g += c.green; b += c.blue; n++; }
      }
    }
    return n > 10 ? (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n) : fallback;
  } catch {
    return fallback;
  }
}

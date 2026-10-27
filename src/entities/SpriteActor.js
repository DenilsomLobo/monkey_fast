/**
 * Personagem animado a partir de quadros PNG individuais (public/assets/characters/...).
 * Os quadros, pivots e escalas vêm de public/assets/sprites.json (gerado por
 * scripts/build-sprites.mjs). Trocar a arte = trocar os PNGs.
 *
 * Cada animação: { frames: [...nomes], fps, loop, pivot: 'feet' | 'center' | 'top' }
 */
export class SpriteActor {
  /**
   * @param scene   cena Phaser
   * @param group   'monkey' | 'companion' | 'jaguar' (chave no sprites.json)
   * @param anims   tabela de animações
   */
  constructor(scene, group, anims, { depth = 0, scaleMul = 1 } = {}) {
    this.scene = scene;
    this.group = group;
    this.meta = scene.cache.json.get('sprites')[group];
    this.anims = anims;
    this.scale = this.meta.scale * scaleMul;
    const first = Object.values(anims)[0].frames[0];
    this.image = scene.add.image(0, 0, this.key(first)).setDepth(depth).setScale(this.scale);
    this.current = null;
    this.frameIndex = 0;
    this.time = 0;
    this.frameName = first;
    this.facing = 1;
    this.pivot = 'feet';
  }

  key(frame) {
    return `${this.group}/${frame}`;
  }

  frameMeta(name = this.frameName) {
    return this.meta.frames[name];
  }

  play(name, { restart = false } = {}) {
    if (this.current === name && !restart) return;
    const a = this.anims[name];
    if (!a) return;
    this.current = name;
    this.frameIndex = 0;
    this.time = 0;
    this.applyFrame();
  }

  applyFrame() {
    const a = this.anims[this.current];
    const name = a.frames[this.frameIndex % a.frames.length];
    this.frameName = name;
    this.pivot = a.pivot ?? 'feet';
    this.image.setTexture(this.key(name));
    const p = this.frameMeta(name)[this.pivot];
    // com espelhamento, o pivô também espelha no eixo x
    this.image.setOrigin(this.facing < 0 ? 1 - p.x : p.x, p.y);
  }

  update(dt, speed = 1) {
    const a = this.anims[this.current];
    if (!a) return;
    this.time += dt * speed;
    const step = 1 / (a.fps || 1);
    if (a.frames.length > 1 && this.time >= step) {
      const n = Math.floor(this.time / step);
      this.time -= n * step;
      if (a.loop === false) this.frameIndex = Math.min(a.frames.length - 1, this.frameIndex + n);
      else if (a.pingpong) {
        const len = a.frames.length * 2 - 2;
        this.pp = ((this.pp ?? 0) + n) % len;
        this.frameIndex = this.pp < a.frames.length ? this.pp : len - this.pp;
      } else this.frameIndex = (this.frameIndex + n) % a.frames.length;
      this.applyFrame();
    }
  }

  setFacing(f) {
    const nf = f < 0 ? -1 : 1;
    if (nf === this.facing) return;
    this.facing = nf;
    this.image.setFlipX(nf < 0);
    if (this.current) this.applyFrame();
  }

  /** Converte um ponto normalizado do quadro atual (0..1) para o mundo. */
  framePointToWorld(nx, ny) {
    const img = this.image;
    const fw = img.width;
    const fh = img.height;
    const fx = this.facing < 0 ? 1 - nx : nx;
    const lx = (fx - img.originX) * fw * img.scaleX;
    const ly = (ny - img.originY) * fh * img.scaleY;
    const c = Math.cos(img.rotation);
    const s = Math.sin(img.rotation);
    return { x: img.x + lx * c - ly * s, y: img.y + lx * s + ly * c };
  }

  setPosition(x, y) { this.image.setPosition(x, y); return this; }
  setRotation(r) { this.image.setRotation(r); return this; }
  setVisible(v) { this.image.setVisible(v); return this; }
  setAlpha(a) { this.image.setAlpha(a); return this; }
  setDepth(d) { this.image.setDepth(d); return this; }
  setScaleMul(k) { this.image.setScale(this.scale * k); return this; }
  destroy() { this.image.destroy(); }
}

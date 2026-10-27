/**
 * Carrega a arte (PNGs em public/assets), gera texturas procedurais pequenas
 * e pré-calcula a fase. A lista de quadros dos personagens e cipós vem de
 * public/assets/sprites.json (gerado por `npm run sprites`).
 */
import Phaser from 'phaser';
import { createTextures } from '../systems/TextureFactory.js';
import { prepareArt } from '../systems/ArtPrep.js';
import { generateLayout } from '../core/levelGenerator.js';
import { showLoading } from '../ui/screens.js';

const ENVIRONMENT = ['sky', 'mountains', 'jungle_far', 'jungle_mid', 'foreground', 'trunk', 'canopy_0', 'canopy_1', 'canopy_2', 'canopy_3', 'tree_start', 'tree_final'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.loading = showLoading();
    this.load.on('progress', (p) => this.loading.progress(p * 0.9));
    this.load.image('banana', 'assets/collectibles/banana.png');
    this.load.image('manga', 'assets/collectibles/manga.png');
    this.load.image('goiaba', 'assets/collectibles/goiaba.png');
    this.load.image('cover', 'assets/ui/cover.jpg');
    for (const k of ENVIRONMENT) this.load.image(k, `assets/environment/${k}.png`);

    // quadros dos personagens e cipós (lista no sprites.json)
    this.load.json('sprites', 'assets/sprites.json');
    // medidas das artes do cenário (editável à mão)
    this.load.json('art', 'assets/art.json');
    this.load.once('filecomplete-json-sprites', (key, type, data) => {
      for (const group of ['monkey', 'companion', 'jaguar']) {
        for (const [name, f] of Object.entries(data[group].frames)) this.load.image(`${group}/${name}`, `assets/${f.file}`);
      }
      for (const kind of ['normal', 'magic']) {
        data.vines[kind].forEach((f, i) => this.load.image(`vine/${kind}_${i}`, `assets/${f.file}`));
      }
    });
  }

  create() {
    createTextures(this);
    prepareArt(this);
    // a fase é determinística: calcular agora evita travadinha ao iniciar
    generateLayout();
    this.loading.progress(1);
    // garante que as fontes do HUD estejam prontas antes do menu
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      this.loading.remove();
      this.scene.launch('BgLayer');
      this.scene.launch('FxLayer');
      this.scene.start('Menu');
    });
  }
}

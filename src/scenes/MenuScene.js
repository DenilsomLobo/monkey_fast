/**
 * Menu principal: floresta escura animada com chuva e relâmpagos, título,
 * campo de nome (obrigatório) e botões Jogar / Ranking / Como jogar / Configurações.
 */
import Phaser from 'phaser';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { showMenu, showSettings } from '../ui/screens.js';
import { startGame } from './flow.js';
import { storage } from '../services/storage.js';
import { resolveQuality } from '../config/quality.js';
import { DEPTH } from '../config/depths.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const quality = resolveQuality(storage.getSettings().quality);
    this.bg = this.add.image(0, 0, 'cover').setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.sky);
    this.shade = this.add.rectangle(0, 0, 10, 10, 0x050810, 0.08).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky + 0.1);
    this.weather = new WeatherSystem(this, null, { quality });
    this.weather.fg.setVisible(false);
    this.t = 0;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.removeMenu?.();
      this.weather.destroy();
    });

    const startMusic = () => {
      AudioManager.unlock();
      AudioManager.startAmbience();
      AudioManager.setAmbienceIntensity(0.8);
      AudioManager.setMusic('menu');
    };
    if (AudioManager.ctx) startMusic();
    else window.addEventListener('pointerdown', startMusic, { once: true });

    this.openMenu();
  }

  openMenu() {
    this.removeMenu = showMenu({
      onPlay: (name) => {
        this.removeMenu();
        startGame(this, name);
      },
      onRanking: () => {
        this.removeMenu();
        this.scene.launch('Ranking', { onClose: () => this.openMenu() });
      },
      onSettings: () => {
        this.removeMenu();
        showSettings({ onClose: () => this.openMenu() });
      },
    });
  }

  layout() {
    const { width, height } = this.scale;
    const img = this.textures.get('cover').getSourceImage();
    const s = Math.max(width / img.width, height / img.height) * 1.04;
    this.bg.setScale(s).setPosition(width / 2, height / 2);
    this.shade.setSize(width, height);
    this.weather.resize();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    this.t += dt;
    // movimento lento de câmera no fundo (sensação de vida)
    const { width, height } = this.scale;
    this.bg.setPosition(width / 2 + Math.sin(this.t * 0.15) * 8, height / 2 + Math.cos(this.t * 0.11) * 5);
    this.weather.update(dt, this.cameras.main, 1);
  }
}

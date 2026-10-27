/**
 * Cena principal: a fase "Floresta da Tempestade".
 *
 * Loop com PASSO FIXO (1/120 s): a física é idêntica em qualquer taxa de
 * quadros. A renderização interpola entre os dois últimos passos.
 * O cronômetro só avança dentro dos passos de jogo (não conta na pausa).
 */
import Phaser from 'phaser';
import { FIXED_DT, MAX_FRAME_DT, PHYS } from '../core/constants.js';
import { buildLevel, makeKillY } from '../core/levelGenerator.js';
import { createMonkeySim, stepWorld } from '../core/monkeySim.js';
import { stepFreeVine } from '../core/vinePhysics.js';
import { Monkey } from '../entities/Monkey.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { LevelRenderer } from '../systems/LevelRenderer.js';
import { CollectibleSystem } from '../systems/CollectibleSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { CameraController } from '../systems/CameraController.js';
import { InputManager } from '../systems/InputManager.js';
import { VictoryCutscene } from '../systems/VictoryCutscene.js';
import { AudioManager } from '../systems/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { showControlsHint } from '../ui/ControlsHint.js';
import { uiRoot, clearUI } from '../ui/dom.js';
import { showPause, showSettings } from '../ui/screens.js';
import { storage } from '../services/storage.js';
import { resolveQuality } from '../config/quality.js';
import { DEPTH } from '../config/depths.js';
import { goTo, startGame } from './flow.js';
import { createAutoPilot } from '../core/autoPilot.js';

const NO_INPUT = { x: 0, y: 0, jumpPressed: false };

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.playerName = data.name || storage.getName() || 'Macaco';
    this.run = data.run || { seed: 1, runId: null, mode: 'local' };
    this.preparedLevel = data.level || null;
  }

  create() {
    clearUI();
    const settings = storage.getSettings();
    this.settings = settings;
    this.quality = resolveQuality(settings.quality);
    this.bg = this.scene.get('BgLayer');
    this.fx = this.scene.get('FxLayer');
    this.state = 'playing';
    this.acc = 0;
    this.paused = false;

    // ---- fase e física
    this.level = this.preparedLevel || buildLevel(this.run.seed);
    const support = makeKillY(this.level, 0);
    this.world = {
      vines: this.level.vines,
      platforms: this.level.platforms,
      killY: makeKillY(this.level),
      supportY: support,
    };
    const start = this.level.platforms[0];
    this.finalPlatform = this.level.platforms.find((p) => p.final);
    this.sim = createMonkeySim(start.x1 + 220, start.y - PHYS.GRAB_TO_FEET, 'ground', 0);
    this.progressStart = start.x2;
    this.progressEnd = this.finalPlatform.x1;

    // ---- visual
    this.parallax = new ParallaxBackground(this.bg, { quality: this.quality, refY: start.y - 200 });
    this.levelView = new LevelRenderer(this, this.level, { quality: this.quality });
    this.collectibles = new CollectibleSystem(this, this.level, { quality: this.quality });
    this.monkey = new Monkey(this, this.sim, { quality: this.quality });
    this.weather = new WeatherSystem(this.fx, this.parallax, { quality: this.quality });
    this.powerups = new PowerUpSystem(this, { quality: this.quality, fxScene: this.fx });
    this.score = new ScoreSystem(this.level);
    this.cutscene = new VictoryCutscene(this, { platform: this.finalPlatform, trunkFaceX: this.levelView.trunkFaceX, fxScene: this.fx });
    this.hint = this.add.image(0, 0, 'glow').setTint(0xfff3a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.hint).setScale(0.5).setAlpha(0);
    this.hintVine = 0;

    this.cameraCtl = new CameraController(this, this.cameras.main);
    const body = this.monkey.bodyCenter();
    this.cameraCtl.snapTo(body.x + 200, body.y - 40);
    this.prevBody = body;

    // ---- entrada, HUD
    this.inputMgr = new InputManager(this, { uiRoot: uiRoot(), onPause: () => this.togglePause() });
    this.hud = new HUD(uiRoot(), { name: this.playerName, totalBananas: this.level.bananas.length, onPause: () => this.togglePause() });
    // aviso rápido dos controles ao entrar na fase
    this.ctrlHint = showControlsHint(uiRoot());
    this.controlsHint = () => this.ctrlHint.remove();

    // ---- áudio
    AudioManager.unlock();
    AudioManager.startAmbience();
    AudioManager.setAmbienceIntensity(1);
    AudioManager.setMusic('game');
    AudioManager.setMusicRate(1);

    // ---- eventos de janela
    this.scale.on('resize', this.onResize, this);
    this.onVisibility = () => { if (document.hidden && this.state === 'playing' && !this.paused) this.togglePause(); };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once('shutdown', () => this.cleanup());

    this.cameras.main.fadeIn(500, 0, 0, 0);
    if (import.meta.env.DEV) this.devHooks();
  }

  /** Somente em desenvolvimento: ?vine=N começa agarrado no cipó N; ?autoplay=1 joga sozinho. */
  devHooks() {
    const q = new URLSearchParams(location.search);
    const n = Number(q.get('vine'));
    if (Number.isInteger(n) && n > 0 && n < this.world.vines.length) {
      const v = this.world.vines[n];
      Object.assign(this.sim, { mode: 'vine', vine: v, r: v.length - 20, x: v.ax, y: v.ay + v.length - 20 });
      this.sim.prevX = this.sim.x;
      this.sim.prevY = this.sim.y;
      v.occupied = true;
      v.theta = 0;
      this.cameraCtl.snapTo(v.ax, v.ay + v.length);
    }
    if (q.get('autoplay')) {
      const pilot = createAutoPilot(this.world);
      this.inputMgr.step = () => pilot.decide(this.sim, this.powerups.mods());
    }
  }

  onResize() {
    this.cameraCtl.resize();
    this.parallax.resize();
    this.weather.resize();
    this.powerups.resize();
  }

  togglePause() {
    if (this.state !== 'playing') return;
    if (this.paused) return this.resume();
    this.paused = true;
    this.inputMgr.setEnabled(false);
    this.scene.pause();
    AudioManager.setAmbienceIntensity(0.4);
    this.closePause = showPause({
      onResume: () => this.resume(),
      onRestart: () => { this.closePause(); startGame(this, this.playerName); },
      onSettings: () => {
        this.closePause();
        showSettings({ onClose: () => { this.settings = storage.getSettings(); this.paused = false; this.togglePause(); } });
      },
      onMenu: () => { this.closePause(); goTo(this, 'Menu'); },
    });
  }

  resume() {
    this.closePause?.();
    this.closePause = null;
    this.paused = false;
    this.inputMgr.setEnabled(true);
    AudioManager.setAmbienceIntensity(1);
    this.scene.resume();
  }

  // ------------------------------------------------------------------ loop
  update(time, delta) {
    const dt = Math.min(delta / 1000, MAX_FRAME_DT);
    this.acc += dt;
    while (this.acc >= FIXED_DT) {
      this.fixedStep();
      this.acc -= FIXED_DT;
    }
    const alpha = this.acc / FIXED_DT;
    this.render(dt, alpha, time);
  }

  fixedStep() {
    const sim = this.sim;
    if (this.state === 'cutscene') {
      for (const v of this.world.vines) if (!v.occupied) stepFreeVine(v, FIXED_DT, 1);
      this.powerups.update(FIXED_DT);
      return;
    }
    if (this.state === 'dying') {
      // queda livre continua após a linha da morte (a câmera acompanha um pouco)
      sim.prevX = sim.x;
      sim.prevY = sim.y;
      sim.vy = Math.min(sim.vy + PHYS.GRAVITY * FIXED_DT, PHYS.MAX_FALL_SPEED);
      sim.x += sim.vx * FIXED_DT;
      sim.y += sim.vy * FIXED_DT;
      for (const v of this.world.vines) if (!v.occupied) stepFreeVine(v, FIXED_DT, 1);
      return;
    }

    const input = this.inputMgr.step();
    const mods = this.powerups.update(FIXED_DT);
    stepWorld(sim, input, this.world, FIXED_DT, mods);
    this.score.tick(FIXED_DT);

    for (const e of sim.events) {
      this.monkey.onEvent(e);
      if (e.type === 'jump' || e.type === 'release') this.ctrlHint.dismissSoon();
      if (e.type === 'grab') {
        this.score.grab(e.vineId);
        this.levelView.viewFor(e.vineId)?.pulse();
      } else if (e.type === 'finish') {
        this.startVictory();
      } else if (e.type === 'dead') {
        this.startDeath();
      }
    }
    sim.events.length = 0;

    // coleta (teste por segmento entre passos)
    const body = this.monkey.bodyCenter();
    const got = this.collectibles.update(this.time.now, body, this.prevBody, this.cameras.main);
    this.prevBody = body;
    for (const it of got) {
      if (it.kind === 'banana') {
        this.score.addBanana(it.entity.data.id);
        AudioManager.play('banana', { minGap: 0.02 });
        this.monkey.flashCollect();
      } else {
        this.score.addPowerUp(it.entity.data.id);
        this.powerups.activate(it.entity.data.type);
        this.monkey.flashPowerUp(it.entity.data.type);
      }
    }
  }

  render(dt, alpha, time) {
    const sim = this.sim;
    const mods = this.powerups.mods();
    const cam = this.cameras.main;
    if (this.state === 'cutscene') { sim.prevX = sim.x; sim.prevY = sim.y; }
    this.monkey.update(dt, alpha, this.world, this.inputMgr.axes(), mods.mango);

    if (this.state === 'playing' || this.state === 'dying') {
      const body = this.monkey.bodyWorld();
      this.cameraCtl.follow({ x: body.x, y: body.y, vx: sim.vx, vy: sim.vy, facing: sim.facing }, dt);
    }
    const intensity = this.powerups.intensity();
    this.parallax.update(cam, dt, intensity);
    this.weather.update(dt, cam, intensity);
    this.levelView.cull(cam, this.powerups.timers.level('guava'), dt);
    this.cutscene.update(dt, cam.worldView);
    if (this.state !== 'playing') this.collectibles.update(time, { x: -1e9, y: -1e9 }, { x: -1e9, y: -1e9 }, cam);
    this.updateHint(time);

    const progress = (sim.x - this.progressStart) / (this.progressEnd - this.progressStart);
    this.hud.update({
      score: this.score.current,
      bananas: this.score.bananas,
      timeMs: this.score.timeMs,
      progress,
      timers: this.powerups.timers,
    });
  }

  /** Destaque discreto no próximo cipó (pode ser desligado nas configurações). */
  updateHint(time) {
    const sim = this.sim;
    if (!this.settings.showHints || this.state !== 'playing') {
      this.hint.setAlpha(0);
      return;
    }
    const current = sim.mode === 'vine' && sim.vine ? sim.vine.id : sim.lastVineId;
    const next = this.world.vines[Math.max(0, current + 1)];
    if (!next) { this.hint.setAlpha(0); return; }
    const r = next.length * 0.82;
    this.hint.setPosition(next.ax + Math.sin(next.theta) * r, next.ay + Math.cos(next.theta) * r)
      .setAlpha(0.22 + 0.12 * Math.sin(time * 0.006));
  }

  // ------------------------------------------------------------------ fim de jogo
  result() {
    const s = this.score.final();
    return {
      name: this.playerName,
      timeMs: this.score.timeMs,
      bananas: this.score.bananas,
      powerups: this.score.powerups,
      totalBananas: this.score.totalBananas,
      totalPowerups: this.score.totalPowerups,
      score: s.total,
      basic: s.basic,
      bonus: s.bonus,
      perfect: s.perfect,
      bananaIds: this.score.bananaIds,
      powerupIds: this.score.powerupIds,
      events: this.score.events,
      seed: this.run.seed,
      runId: this.run.runId,
    };
  }

  startDeath() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.inputMgr.setEnabled(false);
    AudioManager.play('gameover');
    AudioManager.setMusic(null);
    this.time.delayedCall(700, () => { this.cameraCtl.frozen = true; });
    this.time.delayedCall(1500, () => {
      this.cameras.main.fade(400, 0, 0, 0);
      this.state = 'over';
      this.scene.launch('GameOver', { result: this.result() });
    });
  }

  startVictory() {
    if (this.state !== 'playing') return;
    this.state = 'cutscene';
    this.inputMgr.setEnabled(false);
    this.hud.el.style.opacity = '0.25';
    const result = this.result();
    this.cutscene.play({
      monkey: this.monkey,
      camera: this.cameraCtl,
      weather: this.weather,
      perfect: result.perfect,
      onComplete: () => {
        this.state = 'over';
        this.scene.launch('Victory', { result });
      },
    });
  }

  cleanup() {
    this.scale.off('resize', this.onResize, this);
    document.removeEventListener('visibilitychange', this.onVisibility);
    // cada etapa é independente: um erro numa não pode impedir o reinício da fase
    const steps = [
      () => this.closePause?.(),
      () => this.inputMgr.destroy(),
      () => this.input.keyboard?.clearCaptures(),
      () => this.hud.destroy(),
      () => this.controlsHint?.(),
      // objetos nas cenas de camada precisam ser destruídos explicitamente
      () => this.parallax.destroy(),
      () => this.weather.destroy(),
      () => this.powerups.destroy(),
      () => this.cutscene.destroy(),
      () => AudioManager.setMusicRate(1),
    ];
    for (const step of steps) {
      try { step(); } catch (err) { console.warn('[GameScene] limpeza:', err); }
    }
  }

}

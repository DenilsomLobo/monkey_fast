/**
 * Gerenciador de áudio (Web Audio API).
 *
 * - Todos os sons são SINTETIZADOS em tempo real (sem material protegido).
 * - Para trocar por arquivos definitivos, coloque-os em public/assets/audio/
 *   e mapeie em public/assets/audio/manifest.json (ver README da pasta).
 * - Só começa a tocar depois de uma interação do jogador (regra de autoplay).
 * - Trilha com sequenciador próprio: a mudança para 2X acontece no início do
 *   próximo compasso (variação sincronizada, sem cortes).
 */
import { storage } from '../services/storage.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Progressões (graus em MIDI)
const GAME_BARS = [
  { root: 38, chord: [50, 53, 57] }, // Dm
  { root: 34, chord: [46, 50, 53] }, // Bb
  { root: 36, chord: [48, 52, 55] }, // C
  { root: 33, chord: [45, 49, 52] }, // A
];
const VICTORY_BARS = [
  { root: 38, chord: [62, 66, 69], melody: [74, 73, 71, 69] }, // D
  { root: 33, chord: [61, 64, 69], melody: [69, 71, 73, 76] }, // A
  { root: 35, chord: [62, 66, 71], melody: [78, 76, 74, 73] }, // Bm
  { root: 31, chord: [62, 67, 71], melody: [71, 74, 73, 74] }, // G
];

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.settings = storage.getSettings();
    this.files = new Map();
    this.music = { mode: null, step: 0, bar: 0, nextTime: 0, rate: 1, pendingRate: 1, timer: null, fileSource: null };
    this.ambience = null;
    this.lastPlay = new Map();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Cria/retoma o AudioContext. Chamar dentro de um evento de clique/toque/tecla. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.buildGraph();
      this.loadManifest();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  buildGraph() {
    const c = this.ctx;
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.musicBus = c.createGain();
    this.sfxBus = c.createGain();
    this.ambBus = c.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.sfxBus);
    // Reverb simples (resposta ao impulso sintética) para dar ar de floresta
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.4, 2.2);
    this.reverbSend = c.createGain();
    this.reverbSend.gain.value = 0.25;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    this.applySettings(this.settings);
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  applySettings(s) {
    this.settings = { ...this.settings, ...s };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.9, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.05);
  }

  /** Arquivos opcionais que substituem os sons sintetizados. */
  async loadManifest() {
    try {
      const res = await fetch('/assets/audio/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const manifest = await res.json();
      const entries = Object.entries({ ...(manifest.sfx || {}), ...(manifest.music || {}) });
      await Promise.all(entries.map(async ([key, file]) => {
        try {
          const r = await fetch(`/assets/audio/${file}`);
          if (!r.ok) return;
          const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
          this.files.set(key, buf);
        } catch { /* arquivo ausente ou inválido: mantém o sintetizado */ }
      }));
    } catch { /* sem manifest: tudo sintetizado */ }
  }

  // ------------------------------------------------------------------ primitivas
  env(gainNode, when, { attack = 0.005, peak = 0.3, hold = 0, release = 0.2 }) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, when);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + attack);
    g.setValueAtTime(Math.max(peak, 0.0002), when + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
    return when + attack + hold + release;
  }

  tone({ type = 'sine', freq = 440, freqEnd, dur = 0.2, gain = 0.2, attack = 0.005, when, dest, filter, filterFreq = 2000, Q = 1, detune = 0, reverb = 0, glide = 'exp' }) {
    const c = this.ctx;
    const t = when ?? c.currentTime;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    if (freqEnd) {
      if (glide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + dur);
      else osc.frequency.linearRampToValueAtTime(freqEnd, t + dur);
    }
    const g = c.createGain();
    let node = osc;
    if (filter) {
      const f = c.createBiquadFilter();
      f.type = filter;
      f.frequency.value = filterFreq;
      f.Q.value = Q;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest ?? this.sfxBus);
    if (reverb) {
      const s = c.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(this.reverbSend);
    }
    const end = this.env(g, t, { attack, peak: gain, release: Math.max(0.01, dur - attack) });
    osc.start(t);
    osc.stop(end + 0.05);
    return osc;
  }

  noise({ dur = 0.2, gain = 0.2, attack = 0.003, when, dest, filter = 'bandpass', freq = 1000, freqEnd, Q = 1, reverb = 0, hold = 0 }) {
    const c = this.ctx;
    const t = when ?? c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = Q;
    const g = c.createGain();
    src.connect(f).connect(g).connect(dest ?? this.sfxBus);
    if (reverb) {
      const s = c.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(this.reverbSend);
    }
    const end = this.env(g, t, { attack, peak: gain, hold, release: Math.max(0.01, dur - attack) });
    src.start(t, Math.random() * 1.5);
    src.stop(end + 0.05);
  }

  playFile(key, { dest, rate = 1, gain = 1, loop = false } = {}) {
    const buf = this.files.get(key);
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest ?? this.sfxBus);
    src.start();
    return src;
  }

  // ------------------------------------------------------------------ efeitos
  /** Toca um efeito pelo nome. Limita repetições muito próximas. */
  play(name, opts = {}) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const minGap = opts.minGap ?? 0.03;
    if (now - (this.lastPlay.get(name) ?? -1) < minGap) return;
    this.lastPlay.set(name, now);
    if (this.files.has(name)) { this.playFile(name); return; }
    const fn = this.sfx[name];
    if (fn) fn.call(this, now, opts);
  }

  sfx = {
    click(t) { this.tone({ type: 'triangle', freq: 900, freqEnd: 1300, dur: 0.06, gain: 0.12, when: t }); },
    step(t) {
      this.noise({ dur: 0.07, gain: 0.12, filter: 'lowpass', freq: 500, when: t });
      this.tone({ freq: 110, freqEnd: 70, dur: 0.06, gain: 0.12, when: t });
    },
    jump(t) {
      this.tone({ type: 'sine', freq: 260, freqEnd: 520, dur: 0.16, gain: 0.16, when: t });
      this.noise({ dur: 0.18, gain: 0.08, filter: 'bandpass', freq: 900, freqEnd: 2400, Q: 0.7, when: t });
    },
    grab(t) {
      this.noise({ dur: 0.16, gain: 0.22, filter: 'bandpass', freq: 2600, Q: 0.6, when: t }); // folhas
      this.tone({ freq: 140, freqEnd: 80, dur: 0.12, gain: 0.2, when: t }); // tranco
      this.tone({ type: 'triangle', freq: 660, freqEnd: 990, dur: 0.08, gain: 0.05, when: t + 0.02 });
    },
    swing(t, { intensity = 1 }) {
      this.noise({ dur: 0.45, gain: 0.05 + 0.1 * intensity, attack: 0.18, filter: 'bandpass', freq: 400, freqEnd: 1100, Q: 1.2, when: t });
    },
    release(t) {
      this.noise({ dur: 0.25, gain: 0.14, attack: 0.02, filter: 'bandpass', freq: 1500, freqEnd: 600, Q: 0.8, when: t });
      this.tone({ freq: 420, freqEnd: 700, dur: 0.12, gain: 0.08, when: t });
    },
    land(t) {
      this.noise({ dur: 0.14, gain: 0.25, filter: 'lowpass', freq: 400, when: t });
      this.tone({ freq: 90, freqEnd: 50, dur: 0.15, gain: 0.25, when: t });
    },
    fall(t) {
      this.tone({ type: 'sine', freq: 1400, freqEnd: 180, dur: 1.4, gain: 0.12, when: t, glide: 'lin' });
      this.noise({ dur: 1.4, gain: 0.1, attack: 0.4, filter: 'bandpass', freq: 600, freqEnd: 1800, Q: 0.6, when: t });
    },
    gameover(t) {
      [62, 58, 55, 50].forEach((n, i) => {
        this.tone({ type: 'triangle', freq: midi(n), dur: 0.55, gain: 0.16, when: t + i * 0.28, reverb: 0.6 });
        this.tone({ type: 'sawtooth', freq: midi(n - 12), dur: 0.55, gain: 0.05, filter: 'lowpass', filterFreq: 700, when: t + i * 0.28 });
      });
      this.tone({ freq: 55, freqEnd: 35, dur: 2, gain: 0.25, when: t + 1.1 });
    },
    banana(t) {
      this.tone({ type: 'square', freq: midi(84), dur: 0.08, gain: 0.06, filter: 'lowpass', filterFreq: 4000, when: t });
      this.tone({ type: 'triangle', freq: midi(88), dur: 0.22, gain: 0.14, when: t + 0.06, reverb: 0.4 });
      this.tone({ type: 'sine', freq: midi(96), dur: 0.18, gain: 0.05, when: t + 0.06 });
    },
    mango(t) {
      // ativação elétrica
      this.tone({ type: 'sawtooth', freq: 80, freqEnd: 1600, dur: 0.5, gain: 0.12, filter: 'bandpass', filterFreq: 1200, Q: 3, when: t });
      for (let i = 0; i < 10; i++) this.noise({ dur: 0.04, gain: 0.2, filter: 'highpass', freq: 3000 + Math.random() * 4000, when: t + i * 0.045 + Math.random() * 0.02 });
      this.tone({ type: 'square', freq: midi(76), dur: 0.3, gain: 0.06, when: t + 0.42, reverb: 0.5 });
      this.tone({ type: 'square', freq: midi(83), dur: 0.4, gain: 0.06, when: t + 0.52, reverb: 0.5 });
    },
    crackle(t) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.noise({ dur: 0.025, gain: 0.07, filter: 'highpass', freq: 2500 + Math.random() * 5000, when: t + i * 0.03 });
    },
    guava(t) {
      // brilho mágico + distorção temporal
      [72, 76, 79, 84, 88].forEach((n, i) => this.tone({ type: 'sine', freq: midi(n), dur: 0.5, gain: 0.08, when: t + i * 0.06, reverb: 0.8, detune: (i % 2 ? 8 : -8) }));
      this.tone({ type: 'sine', freq: 300, freqEnd: 90, dur: 0.9, gain: 0.12, when: t + 0.1, glide: 'lin' });
    },
    warp(t) {
      this.tone({ type: 'triangle', freq: 220, freqEnd: 440, dur: 0.6, gain: 0.06, when: t, glide: 'lin', reverb: 0.6 });
      this.tone({ type: 'triangle', freq: 440, freqEnd: 220, dur: 0.6, gain: 0.06, when: t + 0.3, glide: 'lin', reverb: 0.6 });
    },
    powerEnd(t) {
      this.tone({ type: 'sine', freq: 700, freqEnd: 250, dur: 0.4, gain: 0.08, when: t, reverb: 0.4 });
    },
    scream(t) {
      // "Uh-uh-AAH!" — sintetizado com formantes
      const syl = [[330, 420, 0.16], [360, 460, 0.16], [420, 760, 0.55]];
      let w = t;
      for (const [f0, f1, d] of syl) {
        this.voice(w, f0, f1, d, 0.2);
        w += d + 0.05;
      }
    },
    chest(t) {
      this.tone({ freq: 95, freqEnd: 45, dur: 0.22, gain: 0.45, when: t });
      this.noise({ dur: 0.12, gain: 0.25, filter: 'lowpass', freq: 300, when: t });
    },
    roar(t) {
      this.growl(t, 1.5, 0.35);
    },
    jaguarScared(t) {
      this.tone({ type: 'sawtooth', freq: 500, freqEnd: 1200, dur: 0.18, gain: 0.1, filter: 'bandpass', filterFreq: 1500, Q: 2, when: t });
      this.tone({ type: 'sawtooth', freq: 1100, freqEnd: 600, dur: 0.35, gain: 0.08, filter: 'bandpass', filterFreq: 1300, Q: 2, when: t + 0.18, reverb: 0.5 });
    },
    thunder(t, { intensity = 1, delay = 0 }) { this.thunder(t + delay, intensity); },
    whoosh(t) { this.noise({ dur: 0.5, gain: 0.15, attack: 0.15, filter: 'bandpass', freq: 300, freqEnd: 2000, Q: 0.7, when: t }); },
    hug(t) {
      [74, 78, 81, 86].forEach((n, i) => this.tone({ type: 'sine', freq: midi(n), dur: 1.2, gain: 0.07, when: t + i * 0.12, reverb: 0.9 }));
    },
    heart(t) {
      this.tone({ freq: 70, freqEnd: 50, dur: 0.15, gain: 0.3, when: t });
      this.tone({ freq: 70, freqEnd: 50, dur: 0.15, gain: 0.25, when: t + 0.22 });
    },
    perfect(t) {
      [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => this.tone({ type: 'square', freq: midi(n), dur: 0.2, gain: 0.07, filter: 'lowpass', filterFreq: 3500, when: t + i * 0.09, reverb: 0.5 }));
      this.tone({ type: 'triangle', freq: midi(91), dur: 1, gain: 0.1, when: t + 0.65, reverb: 0.9 });
    },
  };

  /** Voz de macaco: dente-de-serra com dois formantes e vibrato. */
  voice(t, f0, f1, dur, gain) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    const vib = c.createOscillator();
    vib.frequency.value = 22;
    const vibG = c.createGain();
    vibG.gain.value = 18;
    vib.connect(vibG).connect(osc.frequency);
    const out = c.createGain();
    for (const [f, q, gmul] of [[800, 6, 1], [1250, 8, 0.7], [2600, 10, 0.25]]) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const g = c.createGain();
      g.gain.value = gmul;
      osc.connect(bp).connect(g).connect(out);
    }
    const env = c.createGain();
    out.connect(env).connect(this.sfxBus);
    const s = c.createGain();
    s.gain.value = 0.5;
    env.connect(s).connect(this.reverbSend);
    this.env(env, t, { attack: 0.02, peak: gain, release: dur });
    osc.start(t); vib.start(t);
    osc.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
  }

  /** Rugido da onça: ruído grave + serra modulada. */
  growl(t, dur, gain) {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(95, t + dur * 0.3);
    osc.frequency.linearRampToValueAtTime(55, t + dur);
    const am = c.createOscillator();
    am.frequency.value = 28;
    const amG = c.createGain();
    amG.gain.value = 0.5;
    const vca = c.createGain();
    vca.gain.value = 0.6;
    am.connect(amG).connect(vca.gain);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(3 * x); }
    shaper.curve = curve;
    const env = c.createGain();
    osc.connect(vca).connect(shaper).connect(lp).connect(env).connect(this.sfxBus);
    const s = c.createGain();
    s.gain.value = 0.6;
    env.connect(s).connect(this.reverbSend);
    this.env(env, t, { attack: 0.08, peak: gain, hold: dur * 0.4, release: dur * 0.6 });
    osc.start(t); am.start(t);
    osc.stop(t + dur + 0.2); am.stop(t + dur + 0.2);
    this.noise({ dur, gain: gain * 0.5, attack: 0.08, filter: 'lowpass', freq: 700, freqEnd: 300, when: t, hold: dur * 0.3 });
  }

  thunder(t, intensity = 1) {
    if (!this.ready) return;
    this.noise({ dur: 0.25, gain: 0.35 * intensity, filter: 'highpass', freq: 1200, when: t, dest: this.ambBus });
    this.noise({ dur: 2.8, gain: 0.5 * intensity, attack: 0.05, filter: 'lowpass', freq: 600, freqEnd: 90, Q: 0.5, when: t + 0.05, dest: this.ambBus, hold: 0.3 });
    this.tone({ freq: 48, freqEnd: 30, dur: 2.5, gain: 0.35 * intensity, attack: 0.1, when: t + 0.1, dest: this.ambBus });
  }

  // ------------------------------------------------------------------ ambiente
  startAmbience() {
    if (!this.ready || this.ambience) return;
    const c = this.ctx;
    const mk = (type, freq, Q, gain) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q;
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(gain, c.currentTime, 1);
      src.connect(f).connect(g).connect(this.ambBus);
      src.start(0, Math.random());
      return { src, f, g, base: gain };
    };
    const rain = mk('highpass', 900, 0.4, 0.16);
    const rainLow = mk('lowpass', 500, 0.5, 0.1);
    const wind = mk('bandpass', 380, 0.9, 0.08);
    // vento com rajadas (LFO)
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoG = c.createGain();
    lfoG.gain.value = 0.06;
    lfo.connect(lfoG).connect(wind.g.gain);
    const lfoF = c.createGain();
    lfoF.gain.value = 180;
    lfo.connect(lfoF).connect(wind.f.frequency);
    lfo.start();
    this.ambience = { rain, rainLow, wind, lfo };
  }

  setAmbienceIntensity(k) {
    if (!this.ambience) return;
    const t = this.ctx.currentTime;
    for (const key of ['rain', 'rainLow', 'wind']) {
      const a = this.ambience[key];
      a.g.gain.setTargetAtTime(a.base * k, t, 0.4);
    }
  }

  stopAmbience() {
    if (!this.ambience) return;
    const t = this.ctx.currentTime;
    for (const key of ['rain', 'rainLow', 'wind']) {
      const a = this.ambience[key];
      a.g.gain.setTargetAtTime(0, t, 0.3);
      a.src.stop(t + 1.5);
    }
    this.ambience.lfo.stop(t + 1.5);
    this.ambience = null;
  }

  // ------------------------------------------------------------------ música
  /** mode: 'menu' | 'game' | 'victory' | null */
  setMusic(mode) {
    if (!this.ctx) return;
    if (this.music.mode === mode) return;
    this.stopFileMusic();
    this.music.mode = mode;
    this.music.step = 0;
    this.music.bar = 0;
    this.music.rate = 1;
    this.music.pendingRate = 1;
    this.music.nextTime = this.ctx.currentTime + 0.1;
    if (!mode) {
      clearInterval(this.music.timer);
      this.music.timer = null;
      return;
    }
    const fileKey = mode === 'game' ? 'music_game' : `music_${mode}`;
    if (this.files.has(fileKey)) {
      this.music.fileSource = this.playFile(fileKey, { dest: this.musicBus, loop: true });
      return;
    }
    if (!this.music.timer) this.music.timer = setInterval(() => this.schedule(), 25);
  }

  stopFileMusic() {
    if (this.music.fileSource) {
      try { this.music.fileSource.stop(); } catch { /* já parado */ }
      this.music.fileSource = null;
    }
  }

  /** 1 = normal, 2 = power-up. Entra em vigor no próximo compasso. */
  setMusicRate(rate) {
    this.music.pendingRate = rate;
    const fs = this.music.fileSource;
    if (fs) fs.playbackRate.setTargetAtTime(rate === 2 ? 1.25 : 1, this.ctx.currentTime, 0.3);
  }

  schedule() {
    if (!this.ready || !this.music.mode) return;
    const ahead = this.ctx.currentTime + 0.15;
    while (this.music.nextTime < ahead) {
      this.playStep(this.music.nextTime);
      const bpm = this.music.mode === 'victory' ? 76 : this.music.mode === 'menu' ? 84 : 100;
      const stepDur = 60 / bpm / 4 / this.music.rate;
      this.music.nextTime += stepDur;
      this.music.step++;
      if (this.music.step >= 16) {
        this.music.step = 0;
        this.music.bar++;
        this.music.rate = this.music.pendingRate; // troca sincronizada no compasso
      }
    }
  }

  playStep(t) {
    const { mode, step, bar, rate } = this.music;
    const bus = this.musicBus;
    const bpm = mode === 'victory' ? 76 : mode === 'menu' ? 84 : 100;
    const stepDur = 60 / bpm / 4 / rate;
    if (mode === 'victory') return this.playVictoryStep(t, step, bar, stepDur);

    const chord = GAME_BARS[bar % 4];
    const fast = rate > 1;
    const calm = mode === 'menu';

    // Pad de cordas
    if (step === 0) {
      for (const n of chord.chord) {
        for (const det of [-7, 7]) {
          this.tone({ type: 'sawtooth', freq: midi(n), dur: stepDur * 16, gain: calm ? 0.022 : 0.03, attack: stepDur * 4, when: t, dest: bus, filter: 'lowpass', filterFreq: calm ? 700 : 1000, detune: det, reverb: 0.4 });
        }
      }
      this.tone({ type: 'sine', freq: midi(chord.root), dur: stepDur * 16, gain: 0.12, attack: 0.3, when: t, dest: bus });
    }
    // Tambores estilo taiko
    const kicks = calm ? [0, 8] : [0, 3, 7, 8, 10];
    if (kicks.includes(step) || (fast && step % 2 === 0)) {
      this.tone({ freq: 130, freqEnd: 42, dur: 0.35, gain: calm ? 0.3 : 0.5, when: t, dest: bus });
      this.noise({ dur: 0.05, gain: 0.1, filter: 'lowpass', freq: 1200, when: t, dest: bus });
    }
    if (!calm && (step === 4 || step === 12)) {
      this.noise({ dur: 0.18, gain: 0.22, filter: 'bandpass', freq: 1800, Q: 0.8, when: t, dest: bus, reverb: 0.5 });
    }
    // Baixo pulsante
    if (!calm && [0, 2, 6, 8, 10, 14].includes(step)) {
      this.tone({ type: 'sawtooth', freq: midi(chord.root + 12), dur: stepDur * 1.6, gain: 0.09, when: t, dest: bus, filter: 'lowpass', filterFreq: 520, Q: 4 });
    }
    // Ostinato (arpejo tenso)
    if (!calm) {
      const arp = [0, 1, 2, 1, 2, 0, 1, 2];
      const notes = chord.chord.map((n) => n + (fast ? 24 : 12));
      const n = notes[arp[step % 8]];
      this.tone({ type: 'triangle', freq: midi(n), dur: stepDur * 0.9, gain: fast ? 0.06 : 0.045, when: t, dest: bus, filter: 'lowpass', filterFreq: 2600 });
    }
    // Chimbal na variação rápida
    if (fast) {
      this.noise({ dur: 0.04, gain: step % 4 === 2 ? 0.08 : 0.04, filter: 'highpass', freq: 7000, when: t, dest: bus });
    }
  }

  playVictoryStep(t, step, bar, stepDur) {
    const b = VICTORY_BARS[bar % 4];
    const bus = this.musicBus;
    if (step === 0) {
      for (const n of b.chord) this.tone({ type: 'triangle', freq: midi(n), dur: stepDur * 16, gain: 0.04, attack: 0.4, when: t, dest: bus, reverb: 0.7 });
      this.tone({ type: 'sine', freq: midi(b.root), dur: stepDur * 16, gain: 0.14, attack: 0.2, when: t, dest: bus });
    }
    if (step % 4 === 0) {
      const n = b.melody[step / 4];
      this.tone({ type: 'sine', freq: midi(n), dur: stepDur * 4, gain: 0.12, attack: 0.02, when: t, dest: bus, reverb: 0.8 });
      this.tone({ type: 'triangle', freq: midi(n + 12), dur: stepDur * 2, gain: 0.025, when: t, dest: bus, reverb: 0.8 });
    }
    if (step % 2 === 1) {
      const n = b.chord[(step >> 1) % 3] + 12;
      this.tone({ type: 'sine', freq: midi(n), dur: stepDur * 1.5, gain: 0.03, when: t, dest: bus, reverb: 0.6 });
    }
    if (step === 0 || step === 8) this.tone({ freq: 90, freqEnd: 45, dur: 0.4, gain: 0.25, when: t, dest: bus });
  }
}

export const AudioManager = new AudioManagerClass();

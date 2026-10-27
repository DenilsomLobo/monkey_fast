/** Persistência local (nome, configurações, tutorial visto, ranking offline). */
const PREFIX = 'monkeyfast.';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* modo privado / armazenamento cheio: ignora */
  }
}

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.6,
  sfx: 0.85,
  muted: false,
  quality: 'auto', // auto | high | medium | low
  showHints: true,
};

export const storage = {
  getName: () => read('name', ''),
  setName: (n) => write('name', n),
  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read('settings', {}) }),
  setSettings: (s) => write('settings', s),
  getLocalRanking: () => read('ranking', []),
  setLocalRanking: (list) => write('ranking', list),
};

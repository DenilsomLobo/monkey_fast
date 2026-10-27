/**
 * Telas em HTML sobre o canvas: menu, configurações, pausa, game over,
 * vitória e ranking. Cada função monta a tela e devolve uma função que a remove.
 */
import { h, mount } from './dom.js';
import { storage } from '../services/storage.js';
import { validateName, sanitizeName, NAME_MAX } from '../core/validation.js';
import { formatTime } from '../core/scoring.js';
import { AudioManager } from '../systems/AudioManager.js';

const click = (fn) => (e) => {
  AudioManager.unlock();
  AudioManager.play('click');
  fn?.(e);
};

// ------------------------------------------------------------------ menu (capa)
export function showMenu({ onPlay, onRanking, onSettings }) {
  let removeModal = null;

  const openName = () => {
    if (removeModal) return;
    const input = h('input', {
      id: 'player-name', type: 'text', maxlength: String(NAME_MAX), autocomplete: 'nickname',
      placeholder: 'Seu nome de aventureiro', value: storage.getName(), enterkeyhint: 'go', spellcheck: 'false',
    });
    const error = h('div', { class: 'error', role: 'alert' });
    const field = h('div', { class: 'field' }, [h('label', { for: 'player-name' }, 'Nome do jogador'), input, error]);
    const play = () => {
      const msg = validateName(input.value);
      if (msg) {
        error.textContent = msg;
        field.classList.remove('shake');
        void field.offsetWidth;
        field.classList.add('shake');
        input.focus();
        return;
      }
      const name = sanitizeName(input.value);
      storage.setName(name);
      input.blur();
      close();
      onPlay(name);
    };
    const close = () => { removeModal?.(); removeModal = null; };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') click(play)();
      if (e.key === 'Escape') close();
    });
    input.addEventListener('input', () => { error.textContent = ''; });
    removeModal = mount(h('div', { class: 'screen dim' }, [
      h('div', { class: 'panel stack', style: { width: 'min(420px, 100%)' } }, [
        h('h2', { class: 'title md' }, 'Quem vai salvar a Macaquita?'),
        field,
        h('div', { class: 'row center' }, [
          h('button', { class: 'btn big', onclick: click(play) }, '▶ Começar'),
          h('button', { class: 'btn ghost', onclick: click(close) }, 'Voltar'),
        ]),
      ]),
    ]));
    setTimeout(() => input.focus(), 50);
  };

  const iconBtn = (icon, label, fn) => h('button', { class: 'btn secondary icon-btn', onclick: click(fn), 'aria-label': label }, [h('span', { class: 'ico' }, icon), h('span', { class: 'lbl' }, label)]);
  const onKey = (e) => {
    if (removeModal) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(openName)(); }
  };
  window.addEventListener('keydown', onKey);
  const el = h('div', { class: 'screen title-screen' }, [
    h('div', { class: 'title-actions' }, [
      h('button', { class: 'btn big play-btn', onclick: click(openName) }, '▶ JOGAR'),
      h('div', { class: 'title-icons' }, [
        iconBtn('🏆', 'Ranking', () => { removeAll(); onRanking(); }),
        iconBtn('⚙', 'Ajustes', () => { removeAll(); onSettings(); }),
      ]),
    ]),
    h('p', { class: 'title-hint' }, 'Atravesse a floresta na tempestade e salve a Macaquita!'),
  ]);
  const removeMain = mount(el);
  const removeAll = () => { window.removeEventListener('keydown', onKey); removeModal?.(); removeMain(); };
  return removeAll;
}

// ------------------------------------------------------------------ configurações
export function showSettings({ onClose, onChange }) {
  const s = storage.getSettings();
  const slider = (key, label) => {
    const val = h('span', {}, `${Math.round(s[key] * 100)}`);
    const inp = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(s[key]), 'aria-label': label });
    inp.addEventListener('input', () => {
      s[key] = Number(inp.value);
      val.textContent = `${Math.round(s[key] * 100)}`;
      save();
    });
    return h('label', { class: 'setting' }, [h('span', {}, label), inp, val]);
  };
  const mute = h('input', { type: 'checkbox', checked: s.muted });
  mute.addEventListener('change', () => { s.muted = mute.checked; save(); });
  const quality = h('select', { 'aria-label': 'Qualidade gráfica' }, [
    ['auto', 'Automática'], ['high', 'Alta'], ['medium', 'Média'], ['low', 'Baixa (celulares simples)'],
  ].map(([v, t]) => h('option', { value: v, selected: s.quality === v }, t)));
  quality.addEventListener('change', () => { s.quality = quality.value; save(); });
  const hints = h('input', { type: 'checkbox', checked: s.showHints });
  hints.addEventListener('change', () => { s.showHints = hints.checked; save(); });

  function save() {
    storage.setSettings(s);
    AudioManager.applySettings(s);
    onChange?.(s);
  }

  const el = h('div', { class: 'screen dim' }, [
    h('div', { class: 'panel stack', style: { width: 'min(460px, 100%)' } }, [
      h('h2', { class: 'title md' }, 'Configurações'),
      slider('master', 'Volume geral'),
      slider('music', 'Música'),
      slider('sfx', 'Efeitos'),
      h('label', { class: 'toggle' }, [mute, 'Silenciar tudo']),
      h('label', { class: 'toggle' }, [hints, 'Destacar o próximo cipó']),
      h('label', { class: 'setting', style: { gridTemplateColumns: '120px 1fr' } }, [h('span', {}, 'Gráficos'), quality]),
      h('div', { class: 'row center' }, [h('button', { class: 'btn', onclick: click(() => { remove(); onClose?.(); }) }, 'Voltar')]),
    ]),
  ]);
  const remove = mount(el);
  return remove;
}

// ------------------------------------------------------------------ pausa
export function showPause({ onResume, onRestart, onSettings, onMenu }) {
  const el = h('div', { class: 'screen dim' }, [
    h('div', { class: 'panel stack center', style: { width: 'min(380px, 100%)' } }, [
      h('h2', { class: 'title lg' }, 'PAUSA'),
      h('button', { class: 'btn big', onclick: click(onResume) }, '▶ Continuar'),
      h('button', { class: 'btn secondary', onclick: click(onRestart) }, '↻ Recomeçar'),
      h('button', { class: 'btn secondary', onclick: click(onSettings) }, '⚙ Configurações'),
      h('button', { class: 'btn ghost', onclick: click(onMenu) }, 'Menu principal'),
    ]),
  ]);
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      onResume();
    }
  };
  window.addEventListener('keydown', onKey);
  const remove = mount(el);
  return () => { window.removeEventListener('keydown', onKey); remove(); };
}

function statsList(r, { showBonus }) {
  const rows = [
    ['Jogador', r.name],
    ['Tempo', formatTime(r.timeMs)],
    ['Bananas', `${r.bananas} / ${r.totalBananas}`],
    ['Power-ups', `${r.powerups} / ${r.totalPowerups}`],
  ];
  if (showBonus) rows.push(['Bônus perfeito', r.perfect ? `+${r.bonus}` : '—']);
  const dl = h('dl', { class: 'stats' });
  for (const [k, v] of rows) dl.append(h('dt', {}, k), h('dd', {}, String(v)));
  dl.append(h('dt', { class: 'total' }, 'Pontuação'), h('dd', { class: 'total' }, String(r.score)));
  return dl;
}

// ------------------------------------------------------------------ game over
export function showGameOver(result, { onRetry, onMenu }) {
  const el = h('div', { class: 'screen dim' }, [
    h('div', { class: 'panel center', style: { width: 'min(440px, 100%)' } }, [
      h('h2', { class: 'title lg', style: { filter: 'drop-shadow(0 4px 0 #400) drop-shadow(0 0 18px rgba(255,60,40,.5))' } }, 'GAME OVER'),
      h('p', { class: 'subtitle' }, 'Você caiu no vazio... a onça está chegando perto!'),
      statsList(result, { showBonus: false }),
      h('div', { class: 'row center' }, [
        h('button', { class: 'btn big', onclick: click(onRetry), autofocus: true }, '↻ Tentar novamente'),
        h('button', { class: 'btn secondary', onclick: click(onMenu) }, 'Menu principal'),
      ]),
    ]),
  ]);
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRetry(); } };
  window.addEventListener('keydown', onKey);
  const remove = mount(el);
  return () => { window.removeEventListener('keydown', onKey); remove(); };
}

// ------------------------------------------------------------------ vitória
export function showVictory(result, { onReplay, onRanking, onMenu }) {
  const rank = h('p', { class: 'subtitle' }, 'Registrando no ranking...');
  const el = h('div', { class: 'screen dim' }, [
    h('div', { class: 'panel center', style: { width: 'min(460px, 100%)' } }, [
      h('h2', { class: 'title lg' }, 'VITÓRIA!!!'),
      h('p', { class: 'subtitle' }, 'Você salvou sua amada!'),
      result.perfect ? h('p', {}, [h('span', { class: 'badge perfect' }, 'PERFECT RUN! ×3')]) : null,
      statsList(result, { showBonus: true }),
      rank,
      h('div', { class: 'row center', style: { marginTop: '12px' } }, [
        h('button', { class: 'btn big', onclick: click(onReplay) }, '↻ Jogar novamente'),
        h('button', { class: 'btn secondary', onclick: click(onRanking) }, '🏆 Ver ranking'),
        h('button', { class: 'btn ghost', onclick: click(onMenu) }, 'Menu principal'),
      ]),
    ]),
  ]);
  const remove = mount(el);
  return {
    remove,
    setRank(info) {
      if (!info) { rank.textContent = 'Ranking indisponível no momento.'; return; }
      const where = info.mode === 'global' ? 'ranking global' : 'ranking local (offline)';
      rank.textContent = info.rank ? `Sua posição no ${where}: ${info.rank}º` : `Resultado salvo no ${where}.`;
      if (info.warning) rank.textContent += ` — ${info.warning}`;
    },
  };
}

// ------------------------------------------------------------------ ranking
export function showRanking({ loader, onClose, highlightId }) {
  const body = h('tbody', {}, [h('tr', {}, [h('td', { colspan: '6' }, 'Carregando...')])]);
  const mode = h('span', { class: 'badge' }, '...');
  const el = h('div', { class: 'screen dim' }, [
    h('div', { class: 'panel', style: { width: 'min(720px, 100%)' } }, [
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, [h('h2', { class: 'title md' }, 'RANKING TOP 10'), mode]),
      h('table', { class: 'ranking-table' }, [
        h('thead', {}, h('tr', {}, [
          h('th', {}, '#'), h('th', {}, 'Jogador'), h('th', { class: 'num' }, 'Pontos'), h('th', { class: 'num' }, 'Tempo'),
          h('th', { class: 'num' }, '🍌'), h('th', { class: 'num' }, '✨'),
        ])),
        body,
      ]),
      h('p', { class: 'subtitle' }, 'Ordenado por maior pontuação; no empate, menor tempo. Só entram partidas vencidas.'),
      h('div', { class: 'row center', style: { marginTop: '12px' } }, [h('button', { class: 'btn', onclick: click(() => { remove(); onClose?.(); }) }, 'Voltar')]),
    ]),
  ]);
  const remove = mount(el);
  loader().then(({ entries, mode: m }) => {
    mode.textContent = m === 'global' ? 'Global (Firebase)' : 'Local (offline)';
    body.replaceChildren();
    if (!entries.length) {
      body.append(h('tr', {}, [h('td', { colspan: '6' }, 'Ninguém salvou a Macaquita ainda. Seja o primeiro!')]));
      return;
    }
    entries.slice(0, 10).forEach((e, i) => {
      const cls = [i < 3 ? `top${i + 1}` : '', e.id && e.id === highlightId ? 'me' : ''].join(' ');
      body.append(h('tr', { class: cls }, [
        h('td', {}, h('span', { class: 'medal' }, String(i + 1))),
        h('td', {}, [e.name, ' ', e.perfect ? h('span', { class: 'badge perfect' }, 'PERFECT') : null]),
        h('td', { class: 'num' }, String(e.score)),
        h('td', { class: 'num' }, formatTime(e.timeMs)),
        h('td', { class: 'num' }, String(e.bananas)),
        h('td', { class: 'num' }, String(e.powerups)),
      ]));
    });
  }).catch(() => {
    body.replaceChildren(h('tr', {}, [h('td', { colspan: '6' }, 'Não foi possível carregar o ranking.')]));
  });
  return remove;
}

// ------------------------------------------------------------------ carregamento
export function showLoading() {
  const bar = h('div');
  const el = h('div', { class: 'screen loading' }, [
    h('h1', { class: 'title lg' }, 'MONKEY FAST'),
    h('div', { class: 'bar' }, [bar]),
    h('p', { class: 'subtitle' }, 'Preparando a floresta...'),
  ]);
  const remove = mount(el);
  return { remove, progress: (p) => { bar.style.width = `${Math.round(p * 100)}%`; } };
}

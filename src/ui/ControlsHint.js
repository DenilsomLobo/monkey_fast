/**
 * Aviso rápido e discreto de controles mostrado ao entrar na fase.
 * Teclado: faixa pequena no canto inferior esquerdo (direcionais + ESPAÇO).
 * Celular: balõezinhos apontando para o joystick e o botão PULAR.
 * Some sozinho depois de alguns segundos ou logo após o primeiro pulo.
 */
import { h, isTouchDevice } from './dom.js';

const key = (k, wide) => h('span', { class: `key${wide ? ' wide' : ''}` }, k);

const chip = (keys, label) => h('div', { class: 'hint-chip' }, [h('div', { class: 'keys' }, keys), h('span', {}, label)]);

export function showControlsHint(root, { duration = 6000 } = {}) {
  const touch = isTouchDevice();
  let el;
  if (touch) {
    el = h('div', { class: 'controls-hint touch-hint' }, [
      h('div', { class: 'hint-bubble left' }, [h('strong', {}, 'Joystick'), h('span', {}, 'andar, balançar, subir/descer')]),
      h('div', { class: 'hint-bubble right' }, [h('strong', {}, 'PULAR'), h('span', {}, 'pular / soltar')]),
    ]);
  } else {
    el = h('div', { class: 'controls-hint' }, [
      h('div', { class: 'hint-strip' }, [
        chip([key('←'), key('→')], 'andar / balançar'),
        chip([key('↑'), key('↓')], 'subir / descer'),
        chip([key('ESPAÇO', true)], 'pular / soltar'),
      ]),
    ]);
  }
  root.appendChild(el);
  let timer = setTimeout(hide, duration);
  let gone = false;

  function hide() {
    if (gone) return;
    gone = true;
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 600);
  }

  return {
    hide,
    /** Chamar quando o jogador pular: o aviso some logo depois. */
    dismissSoon() {
      if (gone) return;
      clearTimeout(timer);
      timer = setTimeout(hide, 1800);
    },
    remove() { gone = true; clearTimeout(timer); el.remove(); },
  };
}

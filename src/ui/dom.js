/** Pequenos utilitários para a camada de interface em HTML (sobre o canvas). */

export const uiRoot = () => document.getElementById('ui');

/** Cria um elemento: h('div', { class: 'x', onclick: fn }, [filhos]) */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

/** Monta uma tela na camada de UI e devolve uma função para removê-la. */
export function mount(el) {
  uiRoot().appendChild(el);
  return () => el.remove();
}

export function clearUI() {
  uiRoot().replaceChildren();
}

export function escapeText(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const isTouchDevice = () =>
  (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) &&
  window.matchMedia?.('(pointer: coarse)').matches;

/** Mostra uma mensagem rápida no centro da tela (ex.: "PERFECT RUN!"). */
export function toast(text, color = '#ffcc33', duration = 1600) {
  const el = h('div', { class: 'toast', style: { color } }, text);
  uiRoot().appendChild(el);
  setTimeout(() => el.remove(), duration);
}

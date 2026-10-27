/**
 * MONKEY FAST — ponto de entrada.
 * Phaser 3 + Vite. Veja README.md para arquitetura, execução e publicação.
 */
import Phaser from 'phaser';
import './styles/main.css';
import { gameConfig } from './config/gameConfig.js';
import { AudioManager } from './systems/AudioManager.js';

// O áudio só pode começar após uma interação do jogador (política de autoplay).
const unlock = () => AudioManager.unlock();
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });

// Evita zoom/rolagem/seleção acidentais durante o jogo (principalmente no iOS).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  e.preventDefault();
}, { passive: false });

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) window.__game = game;

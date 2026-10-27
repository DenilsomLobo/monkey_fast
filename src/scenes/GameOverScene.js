/** Tela de GAME OVER (sobre a fase congelada): estatísticas + tentar de novo / menu. */
import Phaser from 'phaser';
import { showGameOver } from '../ui/screens.js';
import { goTo, startGame } from './flow.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ result }) {
    this.remove = showGameOver(result, {
      onRetry: () => { this.remove(); startGame(this, result.name); },
      onMenu: () => { this.remove(); goTo(this, 'Menu'); },
    });
    this.events.once('shutdown', () => this.remove?.());
  }
}

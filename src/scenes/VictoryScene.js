/**
 * Resultado da vitória: estatísticas, bônus perfeito, envio ao ranking
 * (global se houver Firebase, senão local) e posição alcançada.
 */
import Phaser from 'phaser';
import { showVictory } from '../ui/screens.js';
import { submitRun } from '../services/rankingService.js';
import { goTo, startGame } from './flow.js';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create({ result }) {
    this.highlightId = null;
    const open = () => {
      this.screen = showVictory(result, {
        onReplay: () => { this.screen.remove(); startGame(this, result.name); },
        onRanking: () => {
          this.screen.remove();
          this.scene.launch('Ranking', { highlightId: this.highlightId, onClose: () => { open(); this.screen.setRank(this.rankInfo); } });
        },
        onMenu: () => { this.screen.remove(); goTo(this, 'Menu'); },
      });
    };
    open();
    this.events.once('shutdown', () => this.screen?.remove());

    submitRun(result)
      .then((info) => {
        this.rankInfo = info;
        this.highlightId = info?.id ?? null;
        this.screen?.setRank(info);
      })
      .catch(() => this.screen?.setRank(null));
  }
}

/** Ranking Top 10 (global ou local), acessível pelo menu e após vencer. */
import Phaser from 'phaser';
import { showRanking } from '../ui/screens.js';
import { getTop10 } from '../services/rankingService.js';

export class RankingScene extends Phaser.Scene {
  constructor() {
    super('Ranking');
  }

  create({ onClose, highlightId } = {}) {
    this.remove = showRanking({
      loader: getTop10,
      highlightId,
      onClose: () => {
        this.scene.stop();
        onClose?.();
      },
    });
    this.events.once('shutdown', () => this.remove?.());
  }
}

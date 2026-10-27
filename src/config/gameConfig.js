import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { VictoryScene } from '../scenes/VictoryScene.js';
import { RankingScene } from '../scenes/RankingScene.js';
import { BgLayerScene, FxLayerScene } from '../scenes/LayerScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05070d',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
    roundPixels: false,
  },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 4, keyboard: true },
  disableContextMenu: true,
  banner: false,
  // A ordem define a ordem de desenho: BgLayer (fundo) → mundo → FxLayer (efeitos de tela)
  scene: [BootScene, MenuScene, BgLayerScene, GameScene, FxLayerScene, GameOverScene, VictoryScene, RankingScene],
};

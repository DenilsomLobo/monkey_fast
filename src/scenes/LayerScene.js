/**
 * Cenas de camada sem zoom, sempre ativas:
 *  - 'BgLayer' fica ATRÁS do mundo (céu e paralaxe)
 *  - 'FxLayer' fica NA FRENTE do mundo (chuva, folhas, clarões, vinheta, textos de tela)
 *
 * Assim a câmera do mundo pode dar zoom (celular, cena final) sem distorcer
 * o que é desenhado em coordenadas de tela. Quem cria objetos aqui é
 * responsável por destruí-los (os sistemas têm destroy()).
 */
import Phaser from 'phaser';

export class LayerScene extends Phaser.Scene {
  constructor(key) {
    super({ key, active: false });
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.input.enabled = false;
  }
}

export class BgLayerScene extends LayerScene {
  constructor() { super('BgLayer'); }
}

export class FxLayerScene extends LayerScene {
  constructor() { super('FxLayer'); }
}

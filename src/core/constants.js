/**
 * Constantes de física e regras do jogo.
 * Este módulo é PURO (sem Phaser / DOM): é usado pelo jogo, pelos testes
 * e pela Cloud Function que valida o ranking.
 *
 * Unidades: pixels do mundo, segundos, radianos. Eixo Y cresce para baixo.
 */

export const LEVEL_VERSION = 'v3';
/** Semente fixa do LAYOUT dos cipós (igual para todos os jogadores). */
export const LEVEL_SEED = 20261027;

/** Passo fixo da simulação: a física é idêntica em 30, 60 ou 144 FPS. */
export const FIXED_DT = 1 / 120;
/** Maior intervalo de quadro aceito (evita "espiral da morte" após travadas). */
export const MAX_FRAME_DT = 0.1;

export const PHYS = {
  GRAVITY: 1500,
  MAX_FALL_SPEED: 1500,

  // Chão (galhos grandes)
  WALK_SPEED: 210,
  RUN_SPEED: 330,
  RUN_AFTER: 0.35, // segundos segurando a direção para começar a correr
  GROUND_ACCEL: 1900,
  GROUND_FRICTION: 2400,
  JUMP_SPEED: 640,
  JUMP_PREP_TIME: 0.06, // agachamento antes do salto (animação "preparando salto")

  // Ar
  AIR_ACCEL: 520,
  AIR_CONTROL_MAX: 260, // controle aéreo não acelera além disso

  // Cipós
  CAPTURE_RADIUS: 30,
  REGRAB_COOLDOWN: 0.45,
  VINE_MIN_R: 46, // não dá para agarrar dentro da folhagem do galho
  VINE_TIP_MARGIN: 6,
  CLIMB_SPEED: 175,
  PUMP_ACCEL: 560, // aceleração tangencial ao "bombear" o balanço
  SWING_DAMPING: 0.06,
  MAX_SWING_ANGLE: 1.36, // limite suave (~78°)
  HARD_SWING_ANGLE: 1.55,
  RELEASE_BOOST: 1.05,
  RELEASE_UP_KICK: 150,
  GRAB_MOMENTUM_SHARE: 0.85, // quanto do impulso do macaco vai para o balanço ao agarrar

  // Cipós livres (balançam sozinhos com amplitude regulada)
  VINE_GRAVITY: 1500,
  VINE_COM_FACTOR: 0.62, // centro de massa do cipó (fração do comprimento)
  VINE_REGULATION: 1.6,

  // Geometria do macaco relativa ao ponto de agarre (mãos)
  GRAB_TO_SHOULDER: 38,
  GRAB_TO_FEET: 112,
  GRAB_TO_BODY: 66,
  PICKUP_RADIUS: 52,
  HALF_WIDTH: 18,
};

/** Multiplicadores da Manga Mágica (velocidade do macaco). */
export const MANGO = {
  GROUND_SPEED: 1.55,
  PUMP: 1.4,
  RELEASE_BOOST: 1.1,
  CLIMB: 1.5,
  AIR_ACCEL: 1.3,
};

/** Multiplicador de velocidade de oscilação dos cipós na Goiaba Mágica. */
export const GUAVA_VINE_SPEED = 1.45;

export const POWERUP_DURATION = 7; // segundos
export const POWERUP_RAMP = 0.6; // transição suave de entrada/saída
export const MAX_MANGOS = 2;
export const MAX_GUAVAS = 2;
export const TOTAL_BANANAS = 100;

export const SECTIONS = [
  { id: 1, name: 'Travessia horizontal' },
  { id: 2, name: 'Subida vertical' },
  { id: 3, name: 'Horizontal elevado' },
  { id: 4, name: 'Descida vertical' },
  { id: 5, name: 'Nova travessia' },
  { id: 6, name: 'Subida diagonal final' },
];

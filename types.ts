
export enum GameState {
  IDLE = 'IDLE',       // Waiting for player to aim
  AIMING = 'AIMING',   // Player is dragging the cue
  MOVING = 'MOVING',   // Balls are in motion
  GAME_OVER = 'GAME_OVER'
}

export enum Player {
  ONE = 'Player 1',
  TWO = 'Player 2'
}

export interface BallConfig {
  id: number;
  x: number;
  y: number;
  color: string;
  isStripe: boolean;
  isEightBall?: boolean;
  isCue?: boolean;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameScore {
  player1Balls: number[]; // List of IDs potted by P1
  player2Balls: number[]; // List of IDs potted by P2
  currentTurn: Player;
  message: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

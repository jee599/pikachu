import {
  type GameState,
  type PlayerSync,
  type BallSync,
  type PlayerSide,
  P1_INITIAL_X,
  P2_INITIAL_X,
  BALL_INITIAL_X_P1,
  BALL_INITIAL_X_P2,
  PLAYER_TOUCHING_GROUND_Y,
} from "./types";

export function createInitialPlayer(side: PlayerSide): PlayerSync {
  return {
    x: side === "left" ? P1_INITIAL_X : P2_INITIAL_X,
    y: PLAYER_TOUCHING_GROUND_Y,
    state: 0,
    frameNumber: 0,
    isCollisionWithBallHappened: false,
  };
}

export function createInitialBall(servingSide: PlayerSide): BallSync {
  return {
    x: servingSide === "left" ? BALL_INITIAL_X_P1 : BALL_INITIAL_X_P2,
    y: 0,
    xVelocity: 0,
    yVelocity: 0,
    rotation: 0,
    fineRotation: 0,
    isPowerHit: false,
  };
}

export function createInitialGameState(): GameState {
  return {
    phase: "lobby",
    player1: createInitialPlayer("left"),
    player2: createInitialPlayer("right"),
    ball: createInitialBall("left"),
    score: { left: 0, right: 0 },
    servingSide: "left",
    roomId: null,
    mySide: null,
    winner: null,
  };
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  type GameState,
  type PlayerSync,
  type BallSync,
  GROUND_WIDTH,
  GROUND_HEIGHT,
} from "@/lib/game/types";
import { render, loadAssets, isAssetsLoaded } from "@/lib/game/renderer";

interface GameCanvasProps {
  gameState: GameState;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPlayer(a: PlayerSync, b: PlayerSync, t: number): PlayerSync {
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    state: b.state,
    frameNumber: b.frameNumber,
    isCollisionWithBallHappened: b.isCollisionWithBallHappened,
  };
}

function lerpBall(a: BallSync, b: BallSync, t: number): BallSync {
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    xVelocity: b.xVelocity,
    yVelocity: b.yVelocity,
    rotation: b.rotation,
    fineRotation: b.fineRotation,
    isPowerHit: b.isPowerHit,
  };
}

export default function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(2);

  // 보간용: 이전 상태 + 현재 상태 + 수신 시각
  const prevStateRef = useRef<GameState>(gameState);
  const currStateRef = useRef<GameState>(gameState);
  const lastUpdateTimeRef = useRef<number>(performance.now());
  const SERVER_TICK_MS = 40; // 25fps

  // 새 서버 상태가 들어오면 prev/curr 교체
  useEffect(() => {
    prevStateRef.current = currStateRef.current;
    currStateRef.current = gameState;
    lastUpdateTimeRef.current = performance.now();
  }, [gameState]);

  useEffect(() => {
    loadAssets().then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const newScale = Math.min(containerWidth / GROUND_WIDTH, 2);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isAssetsLoaded()) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const prev = prevStateRef.current;
    const curr = currStateRef.current;
    const elapsed = performance.now() - lastUpdateTimeRef.current;
    const t = Math.min(elapsed / SERVER_TICK_MS, 1);

    // playing/scored/gameOver일 때만 보간 (waiting은 그대로)
    let renderState: GameState;
    if (curr.phase === "playing" || curr.phase === "scored" || curr.phase === "gameOver") {
      renderState = {
        ...curr,
        player1: lerpPlayer(prev.player1, curr.player1, t),
        player2: lerpPlayer(prev.player2, curr.player2, t),
        ball: lerpBall(prev.ball, curr.ball, t),
      };
    } else {
      renderState = curr;
    }

    render(ctx, renderState);
    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, renderLoop]);

  return (
    <div ref={containerRef} className="flex w-full items-center justify-center">
      {!loaded && (
        <div
          style={{ width: GROUND_WIDTH * scale, height: GROUND_HEIGHT * scale }}
          className="flex items-center justify-center bg-black text-gray-500"
        >
          Loading sprites...
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={GROUND_WIDTH}
        height={GROUND_HEIGHT}
        className="block"
        style={{
          width: GROUND_WIDTH * scale,
          height: GROUND_HEIGHT * scale,
          imageRendering: "pixelated",
          display: loaded ? "block" : "none",
        }}
      />
    </div>
  );
}

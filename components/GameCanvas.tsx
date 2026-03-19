"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { type GameState, GROUND_WIDTH, GROUND_HEIGHT } from "@/lib/game/types";
import { render, loadAssets, isAssetsLoaded } from "@/lib/game/renderer";

interface GameCanvasProps {
  gameState: GameState;
}

export default function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(gameState);
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(2);

  stateRef.current = gameState;

  useEffect(() => {
    loadAssets().then(() => setLoaded(true));
  }, []);

  // 반응형 스케일 계산
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth;
      // 모바일: 화면 너비에 맞추되 최대 2배
      const newScale = Math.min(containerWidth / GROUND_WIDTH, 2);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isAssetsLoaded()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    render(ctx, stateRef.current);
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

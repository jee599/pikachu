"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { type InputState } from "@/lib/game/types";

interface TouchControlsProps {
  onInput: (state: Partial<InputState>) => void;
}

export default function TouchControls({ onInput }: TouchControlsProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickStateRef = useRef<"none" | "left" | "right">("none");

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // 조이스틱 터치 핸들링
  const handleJoystickStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystickRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;

      const centerX = rect.left + rect.width / 2;
      const dx = touch.clientX - centerX;
      const deadzone = rect.width * 0.15;

      if (dx < -deadzone) {
        joystickStateRef.current = "left";
        onInput({ left: true, right: false });
      } else if (dx > deadzone) {
        joystickStateRef.current = "right";
        onInput({ left: false, right: true });
      } else {
        joystickStateRef.current = "none";
        onInput({ left: false, right: false });
      }
    },
    [onInput],
  );

  const handleJoystickMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystickRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;

      const centerX = rect.left + rect.width / 2;
      const dx = touch.clientX - centerX;
      const deadzone = rect.width * 0.15;

      if (dx < -deadzone) {
        joystickStateRef.current = "left";
        onInput({ left: true, right: false });
      } else if (dx > deadzone) {
        joystickStateRef.current = "right";
        onInput({ left: false, right: true });
      } else {
        joystickStateRef.current = "none";
        onInput({ left: false, right: false });
      }
    },
    [onInput],
  );

  const handleJoystickEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      joystickStateRef.current = "none";
      onInput({ left: false, right: false });
    },
    [onInput],
  );

  // 버튼 핸들러
  const handleJumpStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ jump: true });
    },
    [onInput],
  );

  const handleJumpEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ jump: false });
    },
    [onInput],
  );

  const handlePowerHitStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ powerHit: true });
    },
    [onInput],
  );

  const handlePowerHitEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ powerHit: false });
    },
    [onInput],
  );

  if (!isTouchDevice) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-between px-4 pb-6 pointer-events-none select-none">
      {/* 왼쪽: 이동 조이스틱 */}
      <div
        ref={joystickRef}
        className="pointer-events-auto flex h-24 w-36 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div className="flex items-center gap-6">
          <div className="text-3xl text-white/60 font-bold">&larr;</div>
          <div className="h-8 w-8 rounded-full bg-white/30" />
          <div className="text-3xl text-white/60 font-bold">&rarr;</div>
        </div>
      </div>

      {/* 오른쪽: 액션 버튼 */}
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {/* B 버튼 (파워히트) — 위에 작게 */}
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/40 text-sm font-bold text-white/80 backdrop-blur-sm active:bg-red-500/60"
          onTouchStart={handlePowerHitStart}
          onTouchEnd={handlePowerHitEnd}
          onTouchCancel={handlePowerHitEnd}
        >
          B
        </button>
        {/* A 버튼 (점프) — 아래에 크게 */}
        <button
          className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/40 text-lg font-bold text-white/80 backdrop-blur-sm active:bg-yellow-400/60"
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          onTouchCancel={handleJumpEnd}
        >
          A
        </button>
      </div>
    </div>
  );
}

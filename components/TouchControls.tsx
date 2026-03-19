"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { type InputState } from "@/lib/game/types";

interface TouchControlsProps {
  onInput: (state: Partial<InputState>) => void;
}

export default function TouchControls({ onInput }: TouchControlsProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

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
        onInput({ left: true, right: false });
      } else if (dx > deadzone) {
        onInput({ left: false, right: true });
      } else {
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
        onInput({ left: true, right: false });
      } else if (dx > deadzone) {
        onInput({ left: false, right: true });
      } else {
        onInput({ left: false, right: false });
      }
    },
    [onInput],
  );

  const handleJoystickEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ left: false, right: false });
    },
    [onInput],
  );

  const handleActionStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ up: true });
    },
    [onInput],
  );

  const handleActionEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ up: false });
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

      {/* 오른쪽: 점프/액션 버튼 (원본처럼 하나) */}
      <button
        className="pointer-events-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400/40 text-2xl font-bold text-white/80 backdrop-blur-sm active:bg-yellow-400/60"
        onTouchStart={handleActionStart}
        onTouchEnd={handleActionEnd}
        onTouchCancel={handleActionEnd}
      >
        JUMP
      </button>
    </div>
  );
}

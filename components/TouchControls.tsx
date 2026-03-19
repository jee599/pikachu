"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface TouchInput {
  left?: boolean;
  right?: boolean;
  up?: boolean;
  powerHit?: boolean;
}

interface TouchControlsProps {
  onInput: (state: TouchInput) => void;
}

export default function TouchControls({ onInput }: TouchControlsProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleJoystick = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = joystickRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;
      const deadzone = rect.width * 0.12;

      onInput({
        left: dx < -deadzone,
        right: dx > deadzone,
        up: dy < -deadzone,
      });
    },
    [onInput],
  );

  const handleJoystickEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      onInput({ left: false, right: false, up: false });
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
      {/* 조이스틱 (4방향) */}
      <div
        ref={joystickRef}
        className="pointer-events-auto flex h-32 w-32 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm"
        onTouchStart={handleJoystick}
        onTouchMove={handleJoystick}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute top-0 text-xl text-white/50 font-bold">↑</div>
          <div className="absolute bottom-0 text-xl text-white/50 font-bold">↓</div>
          <div className="absolute left-0 text-xl text-white/50 font-bold">←</div>
          <div className="absolute right-0 text-xl text-white/50 font-bold">→</div>
          <div className="h-6 w-6 rounded-full bg-white/30" />
        </div>
      </div>

      {/* 파워히트 버튼 (Enter 대용) */}
      <button
        className="pointer-events-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/40 text-lg font-bold text-white/80 backdrop-blur-sm active:bg-red-500/60"
        onTouchStart={handlePowerHitStart}
        onTouchEnd={handlePowerHitEnd}
        onTouchCancel={handlePowerHitEnd}
      >
        HIT
      </button>
    </div>
  );
}

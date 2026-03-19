import { type InputState } from "./types";

export class InputManager {
  private keys: Set<string> = new Set();
  private touchLeft = false;
  private touchRight = false;
  private touchUp = false;
  private touchPowerHit = false;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
       " ", "w", "a", "s", "d", "Enter"].includes(e.key)
    ) {
      e.preventDefault();
    }
    this.keys.add(e.key);
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key);
  }

  setTouchInput(state: { left?: boolean; right?: boolean; up?: boolean; powerHit?: boolean }) {
    if (state.left !== undefined) this.touchLeft = state.left;
    if (state.right !== undefined) this.touchRight = state.right;
    if (state.up !== undefined) this.touchUp = state.up;
    if (state.powerHit !== undefined) this.touchPowerHit = state.powerHit;
  }

  getInput(): InputState {
    const left = this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A") || this.touchLeft;
    const right = this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D") || this.touchRight;
    const up = this.keys.has("ArrowUp") || this.keys.has(" ") || this.keys.has("w") || this.keys.has("W") || this.touchUp;
    const down = this.keys.has("ArrowDown") || this.keys.has("s") || this.keys.has("S");
    const powerHit = this.keys.has("Enter") || this.touchPowerHit;

    let xDirection: -1 | 0 | 1 = 0;
    if (left && !right) xDirection = -1;
    else if (right && !left) xDirection = 1;

    let yDirection: -1 | 0 | 1 = 0;
    if (up && !down) yDirection = -1;
    else if (down && !up) yDirection = 1;

    return { xDirection, yDirection, powerHit };
  }

  isAnyKeyPressed(): boolean {
    return this.keys.size > 0;
  }

  reset() {
    this.keys.clear();
  }
}

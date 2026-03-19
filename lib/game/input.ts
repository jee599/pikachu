import { type InputState } from "./types";

export class InputManager {
  private keys: Set<string> = new Set();
  private touchState: Partial<InputState> = {};
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
      ["ArrowLeft", "ArrowRight", "ArrowUp", " ", "w", "a", "d", "Enter"].includes(e.key)
    ) {
      e.preventDefault();
    }
    this.keys.add(e.key);
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key);
  }

  setTouchInput(state: Partial<InputState>) {
    this.touchState = state;
  }

  getInput(): InputState {
    const left =
      this.keys.has("ArrowLeft") ||
      this.keys.has("a") ||
      this.keys.has("A") ||
      !!this.touchState.left;
    const right =
      this.keys.has("ArrowRight") ||
      this.keys.has("d") ||
      this.keys.has("D") ||
      !!this.touchState.right;
    const up =
      this.keys.has("ArrowUp") ||
      this.keys.has(" ") ||
      this.keys.has("w") ||
      this.keys.has("W") ||
      this.keys.has("Enter") ||
      !!this.touchState.up;

    return { left, right, up };
  }

  isAnyKeyPressed(): boolean {
    return this.keys.size > 0;
  }

  reset() {
    this.keys.clear();
    this.touchState = {};
  }
}

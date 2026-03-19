import { type InputState } from "./types";

export class InputManager {
  private keys: Set<string> = new Set();
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
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "w",
        "a",
        "s",
        "d",
      ].includes(e.key)
    ) {
      e.preventDefault();
    }
    this.keys.add(e.key);
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key);
  }

  getInput(): InputState {
    const left =
      this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A");
    const right =
      this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D");
    const jump =
      this.keys.has("ArrowUp") ||
      this.keys.has(" ") ||
      this.keys.has("w") ||
      this.keys.has("W");

    // powerHit: D키 단독 또는 →+↑ 동시
    const powerHit =
      this.keys.has("d") ||
      this.keys.has("D") ||
      (this.keys.has("ArrowRight") && this.keys.has("ArrowUp"));

    return { left, right, jump, powerHit };
  }

  isAnyKeyPressed(): boolean {
    return this.keys.size > 0;
  }

  reset() {
    this.keys.clear();
  }
}

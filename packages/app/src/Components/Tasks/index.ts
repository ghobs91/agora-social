import { CachedMetadata } from "@snort/system";

import { LoginSession } from "@/Utils/Login";

export interface UITask {
  id: string;
  noBaseStyle: boolean;
  /**
   * Run checks to determine if this Task should be triggered for this user
   */
  check(user: CachedMetadata, session: LoginSession): boolean;
  mute(): void;
  load(cb: () => void): void;
  render(): JSX.Element;
}

export interface UITaskState {
  id: string;
  muted: boolean;
  completed: boolean;
}

export abstract class BaseUITask implements UITask {
  #cb?: () => void;
  protected state: UITaskState;

  abstract id: string;
  noBaseStyle = false;
  abstract check(user: CachedMetadata, session: LoginSession): boolean;
  abstract render(): JSX.Element;

  constructor() {
    this.state = {} as UITaskState;
  }

  mute(): void {
    this.state.muted = true;
    this.#save();
  }

  load(cb: () => void) {
    this.#cb = cb;
    const state = window.localStorage.getItem(`task:${this.id}`);
    if (state) {
      this.state = JSON.parse(state);
    }
  }

  #save() {
    window.localStorage.setItem(`task:${this.id}`, JSON.stringify(this.state));
    this.#cb?.();
  }
}

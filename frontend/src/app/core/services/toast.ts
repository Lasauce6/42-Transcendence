import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  key: string;
  params: Record<string, unknown>;
  duration: number;
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;
const MAX_TOASTS = 4;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(key: string, params: Record<string, unknown> = {}, duration = DEFAULT_DURATION): number {
    return this.show('success', key, params, duration);
  }

  error(key: string, params: Record<string, unknown> = {}, duration = ERROR_DURATION): number {
    return this.show('error', key, params, duration);
  }

  info(key: string, params: Record<string, unknown> = {}, duration = DEFAULT_DURATION): number {
    return this.show('info', key, params, duration);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this._toasts.set([]);
  }

  private show(
    type: ToastType,
    key: string,
    params: Record<string, unknown>,
    duration: number,
  ): number {
    const id = this.nextId++;

    this._toasts.update((list) => [...list, { id, type, key, params, duration }]);

    const overflow = this._toasts().slice(0, -MAX_TOASTS);
    for (const old of overflow) {
      this.dismiss(old.id);
    }

    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }

    return id;
  }
}

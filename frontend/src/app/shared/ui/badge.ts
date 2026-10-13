import { Component, computed, input } from '@angular/core';

const VARIANTS = {
  accent: 'bg-accent text-accent-ink',
  danger: 'bg-danger text-danger-ink',
  neutral: 'bg-surface-2 text-muted',
};

@Component({
  selector: 'ui-badge',
  host: { '[class]': 'classes()' },
  template: `<ng-content />`,
})
export class UiBadge {
  readonly variant = input<keyof typeof VARIANTS>('accent');
  readonly classes = computed(
    () =>
      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ' +
      VARIANTS[this.variant()],
  );
}

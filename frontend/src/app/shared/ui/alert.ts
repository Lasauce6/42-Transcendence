import { Component, computed, input } from '@angular/core';

const VARIANTS = {
  error: 'border-danger/40 bg-danger/10 text-danger',
  success: 'border-accent/40 bg-accent/10 text-accent',
  info: 'border-line-strong bg-surface-2 text-ink',
};

@Component({
  selector: 'ui-alert',
  host: { '[class]': 'classes()', '[attr.role]': "variant() === 'error' ? 'alert' : 'status'" },
  template: `<ng-content />`,
})
export class UiAlert {
  readonly variant = input<keyof typeof VARIANTS>('info');
  readonly classes = computed(() => 'block rounded-control border px-4 py-3 text-sm ' + VARIANTS[this.variant()]);
}

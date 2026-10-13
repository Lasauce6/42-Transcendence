import { Component, computed, input } from '@angular/core';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<UiButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-accent-ink font-bold hover:brightness-110',
  secondary: 'border-line-strong bg-transparent text-ink hover:bg-surface-2',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-2',
  danger: 'border-transparent bg-danger text-danger-ink font-bold hover:brightness-110',
};

@Component({
  selector: 'button[uiButton], a[uiButton]',
  host: { '[class]': 'classes()' },
  template: `<ng-content />`,
})
export class UiButton {
  readonly variant = input<UiButtonVariant>('primary');
  readonly size = input<'md' | 'sm'>('md');
  readonly classes = computed(
    () =>
      'inline-flex items-center justify-center gap-2 rounded-control border font-medium no-underline transition hover:no-underline ' +
      (this.size() === 'sm' ? 'min-h-9 px-3 py-1.5 text-sm ' : 'min-h-11 px-4 py-2.5 ') +
      VARIANTS[this.variant()],
  );
}

import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-progress',
  host: { class: 'flex items-center gap-3 rounded-control bg-bg px-3 py-2 font-mono text-xs' },
  template: `
    <span class="shrink-0 truncate">{{ label() }}</span>
    <span
      class="h-2 grow overflow-hidden rounded-full bg-line-strong"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-label]="label()"
    >
      <span class="block h-full rounded-full bg-accent transition-[width]" [style.width.%]="clamped()"></span>
    </span>
    <span class="text-muted">{{ clamped() }} %</span>
  `,
})
export class UiProgress {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly clamped = computed(() => Math.round(Math.min(100, Math.max(0, this.value()))));
}

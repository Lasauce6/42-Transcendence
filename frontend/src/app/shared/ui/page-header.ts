import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  host: { class: 'flex flex-wrap items-end justify-between gap-4' },
  template: `
    <div class="flex flex-col gap-1.5">
      @if (eyebrow()) {
        <p class="font-mono text-[13px] uppercase tracking-widest text-accent">&gt; {{ eyebrow() }}</p>
      }
      <h1 class="text-4xl">{{ heading() }}</h1>
      @if (subtitle()) {
        <p class="text-muted">{{ subtitle() }}</p>
      }
    </div>
    <ng-content />
  `,
})
export class UiPageHeader {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly subtitle = input<string>('');
}

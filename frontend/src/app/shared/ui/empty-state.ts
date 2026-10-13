import { Component, input } from '@angular/core';
import { UiIcon } from './icon';

@Component({
  selector: 'ui-empty-state',
  imports: [UiIcon],
  host: { class: 'flex flex-col items-center gap-3 px-6 py-10 text-center' },
  template: `
    <span class="flex size-12 items-center justify-center rounded-card bg-surface-2 text-accent">
      <ui-icon [name]="icon()" [size]="24" />
    </span>
    <p class="font-bold">{{ heading() }}</p>
    @if (text()) {
      <p class="max-w-sm text-sm text-muted">{{ text() }}</p>
    }
    <ng-content />
  `,
})
export class UiEmptyState {
  readonly heading = input.required<string>();
  readonly text = input<string>('');
  readonly icon = input('message');
}

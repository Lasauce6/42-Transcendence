import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-list-item',
  host: { class: 'flex min-w-0 items-center gap-3.5 rounded-control px-3.5 py-3' },
  template: `
    <ng-content select="[leading]" />
    <span class="flex min-w-0 grow flex-col">
      <strong class="truncate">{{ heading() }}</strong>
      @if (subtitle()) {
        <span class="truncate text-sm text-muted">{{ subtitle() }}</span>
      }
    </span>
    <ng-content select="[meta]" />
  `,
})
export class UiListItem {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
}

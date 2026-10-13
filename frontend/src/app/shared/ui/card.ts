import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  host: { class: 'flex flex-col rounded-card border border-line bg-surface' },
  template: `
    @if (heading()) {
      <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 class="text-[17px]">{{ heading() }}</h2>
        <ng-content select="[cardAction]" />
      </div>
    }
    <div [class]="padded() ? 'p-5' : 'p-1.5'">
      <ng-content />
    </div>
  `,
})
export class UiCard {
  readonly heading = input<string>('');
  readonly padded = input(true);
}

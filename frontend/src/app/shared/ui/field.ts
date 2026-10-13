import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-field',
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <label [attr.for]="for()" class="text-sm font-medium text-muted">{{ label() }}</label>
    <ng-content />
    @if (error()) {
      <p class="text-sm text-danger" role="alert">{{ error() }}</p>
    } @else if (hint()) {
      <p class="text-sm text-muted">{{ hint() }}</p>
    }
  `,
})
export class UiField {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}

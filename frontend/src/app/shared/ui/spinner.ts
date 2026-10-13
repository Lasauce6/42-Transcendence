import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-spinner',
  host: { class: 'flex items-center gap-3 text-muted', role: 'status' },
  template: `
    <span class="size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true"></span>
    <span class="font-mono text-[13px]">{{ label() }}</span>
  `,
})
export class UiSpinner {
  readonly label = input.required<string>();
}

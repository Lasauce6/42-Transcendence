import { Component, computed, input } from '@angular/core';
import { UiIcon } from './icon';

@Component({
  selector: 'ui-file-card',
  imports: [UiIcon],
  host: { class: 'block' },
  template: `
    @if (isImage()) {
      <a [href]="url()" target="_blank" rel="noopener" class="block w-64 overflow-hidden rounded-xl border border-line-strong bg-surface-2 hover:no-underline">
        <img [src]="url()" [alt]="name()" class="block max-h-48 w-full object-cover" />
        <span class="block bg-chrome px-3 py-2 font-mono text-xs text-ink">{{ name() }} · {{ readableSize() }}</span>
      </a>
    } @else {
      <a [href]="url()" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-ink hover:no-underline">
        <ui-icon name="file" [size]="22" class="text-danger" />
        <span class="flex flex-col">
          <strong class="text-sm">{{ name() }}</strong>
          <span class="font-mono text-xs text-muted">{{ extension() }} · {{ readableSize() }}</span>
        </span>
      </a>
    }
  `,
})
export class UiFileCard {
  readonly name = input.required<string>();
  readonly url = input.required<string>();
  readonly contentType = input.required<string>();
  readonly size = input.required<number>();

  readonly isImage = computed(() => this.contentType().startsWith('image/'));
  readonly extension = computed(() => (this.name().split('.').pop() ?? '').toUpperCase());
  readonly readableSize = computed(() => {
    const bytes = this.size();
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  });
}

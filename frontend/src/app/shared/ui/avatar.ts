import { Component, computed, input } from '@angular/core';

const SIZES = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-20 text-2xl' };
const COLORS = ['text-accent', 'text-warning', 'text-[#b49cff]', 'text-[#ff8fb1]', 'text-[#ff9f5a]', 'text-link'];

@Component({
  selector: 'ui-avatar',
  host: { class: 'relative inline-flex shrink-0' },
  template: `
    @if (src() && !isDefault()) {
      <img [src]="src()" alt="" [class]="'rounded-control object-cover ' + sizeClass()" />
    } @else {
      <span [class]="'flex items-center justify-center rounded-control bg-surface-2 font-bold ' + sizeClass() + ' ' + color()">
        {{ initial() }}
      </span>
    }
    @if (status()) {
      <span
        class="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface"
        [class.bg-accent]="status() === 'online'"
        [class.bg-muted]="status() === 'offline'"
      ></span>
    }
  `,
})
export class UiAvatar {
  readonly name = input.required<string>();
  readonly src = input<string | null | undefined>(null);
  readonly size = input<keyof typeof SIZES>('md');
  readonly status = input<'online' | 'offline' | null>(null);

  readonly initial = computed(() => this.name().charAt(0).toUpperCase() || '?');
  readonly sizeClass = computed(() => SIZES[this.size()]);
  readonly isDefault = computed(() => (this.src() ?? '').endsWith('/default.png'));
  readonly color = computed(() => {
    const code = [...this.name()].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    return COLORS[code % COLORS.length];
  });
}

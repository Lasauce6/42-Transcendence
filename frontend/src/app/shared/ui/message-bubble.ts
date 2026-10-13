import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { UiAvatar } from './avatar';

@Component({
  selector: 'ui-message-bubble',
  imports: [DatePipe, UiAvatar],
  host: {
    class: 'flex max-w-[75%] items-end gap-2.5',
    '[class.self-end]': 'mine()',
  },
  template: `
    @if (!mine()) {
      <ui-avatar [name]="author()" [src]="avatar()" size="sm" class="mb-0.5" />
    }
    <div class="flex min-w-0 flex-col gap-1.5" [class.items-end]="mine()" [class.items-start]="!mine()">
      <span class="font-mono text-xs text-muted">{{ author() }} · {{ time() | date: 'HH:mm' }}</span>
      @if (deleted()) {
        <p class="rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-sm italic text-muted">
          <ng-content select="[deleted]" />
        </p>
      } @else {
        @if (text()) {
          <p
            class="px-3.5 py-2.5"
            [class]="mine() ? 'rounded-xl rounded-br-sm bg-accent font-medium text-accent-ink' : 'rounded-xl rounded-bl-sm bg-surface-2'"
          >{{ text() }}</p>
        }
        <ng-content />
      }
    </div>
  `,
})
export class UiMessageBubble {
  readonly author = input.required<string>();
  readonly time = input.required<string>();
  readonly text = input<string>('');
  readonly mine = input(false);
  readonly avatar = input<string | null | undefined>(null);
  readonly deleted = input(false);
}

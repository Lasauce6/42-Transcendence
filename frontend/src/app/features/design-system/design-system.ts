import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCard,
  UiEmptyState,
  UiField,
  UiFileCard,
  UiIcon,
  UiListItem,
  UiMessageBubble,
  UiPageHeader,
  UiProgress,
  UiSpinner,
} from '@shared/ui';

@Component({
  selector: 'app-design-system',
  imports: [
    TranslatePipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCard,
    UiEmptyState,
    UiField,
    UiFileCard,
    UiIcon,
    UiListItem,
    UiMessageBubble,
    UiPageHeader,
    UiProgress,
    UiSpinner,
  ],
  templateUrl: './design-system.html',
})
export class DesignSystem {
  readonly colors = [
    { name: 'bg', cls: 'bg-bg' },
    { name: 'chrome', cls: 'bg-chrome' },
    { name: 'surface', cls: 'bg-surface' },
    { name: 'surface-2', cls: 'bg-surface-2' },
    { name: 'line', cls: 'bg-line' },
    { name: 'ink', cls: 'bg-ink' },
    { name: 'muted', cls: 'bg-muted' },
    { name: 'accent', cls: 'bg-accent' },
    { name: 'link', cls: 'bg-link' },
    { name: 'danger', cls: 'bg-danger' },
    { name: 'warning', cls: 'bg-warning' },
  ];
  readonly icons = ['bell', 'message', 'users', 'user', 'paperclip', 'file', 'image', 'send', 'search', 'plus', 'check', 'x', 'trash', 'shield', 'logout', 'arrowLeft'];
  readonly now = new Date().toISOString();
}

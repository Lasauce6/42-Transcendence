import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { CurrentUser } from '@core/services/current-user';

@Component({
  selector: 'app-chat-list',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.scss',
})
export class ChatList implements OnInit {
  private readonly service = inject(ChatService);
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly query = signal('');

  readonly channels = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.service.channels();
    return q ? list.filter((c) => this.displayName(c).toLowerCase().includes(q)) : list;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service.loadChannels().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  // En privé, on affiche l'autre personne ; sinon le nom du channel.
  displayName(c: Channel): string {
    if (c.type === 'PRIVATE' && c.members) {
      const me = this.currentUser.profile()?.id;
      const other = c.members.find((m) => m.id !== me);
      if (other) return other.username;
    }
    return c.name ?? '';
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  open(c: Channel): void {
    this.router.navigate(['/chat', c.id]);
  }
}

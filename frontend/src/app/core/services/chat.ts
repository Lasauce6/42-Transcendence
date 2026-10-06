import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { Channel, ChannelType, ChatMessage } from '@core/models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/channels/`;

  private readonly _channels = signal<Channel[]>([]);

  readonly channels = computed(() =>
    [...this._channels()].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
  );

  loadChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(this.url).pipe(tap((list) => this._channels.set(list)));
  }

  createChannel(name: string, type: ChannelType = 'PRIVATE'): Observable<Channel> {
    return this.http
      .post<Channel>(this.url, { name, type })
      .pipe(tap((channel) => this._channels.update((list) => [channel, ...list])));
  }

  bump(channelId: string, content: string, senderUsername: string): void {
    const created_at = new Date().toISOString();
    this._channels.update((list) =>
      list.map((c) =>
        c.id === channelId
          ? { ...c, last_message: { content, sender_username: senderUsername, created_at } }
          : c,
      ),
    );
  }
  // Récupère l'historique des messages d'une conversation.
  loadMessages(channelId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.url}${channelId}/messages/`);
  }
}

function lastActivity(c: Channel): string {
  return c.last_message?.created_at ?? c.created_at;
}

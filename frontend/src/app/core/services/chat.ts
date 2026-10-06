import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, switchMap, tap, throwError } from 'rxjs';
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

  // Envoie un fichier (avec un texte optionnel) dans une conversation.
  sendAttachment(channelId: string, file: File, content = ''): Observable<ChatMessage> {
    const form = new FormData();
    form.append('file', file);
    form.append('content', content);
    return this.http.post<ChatMessage>(`${this.url}${channelId}/attachments/`, form);
  }
  // Cherche un utilisateur par son nom (le back n'a pas de recherche, on filtre la liste).
  findUser(username: string): Observable<{ id: string; username: string } | undefined> {
    return this.http
      .get<{ id: string; username: string }[]>(`${environment.apiUrl}/users/`)
      .pipe(map((users) => users.find((u) => u.username.toLowerCase() === username.toLowerCase())));
  }

  // Ajoute un utilisateur dans une conversation existante.
  addMember(channelId: string, userId: string): Observable<unknown> {
    return this.http.post(`${this.url}${channelId}/add-member/`, { user_id: userId });
  }

  // Démarre une conversation : trouve la personne, crée le channel, puis l'ajoute dedans.
  startConversation(username: string): Observable<Channel> {
    return this.findUser(username).pipe(
      switchMap((user) => {
        // Personne introuvable : on s'arrête avant de créer un channel vide.
        if (!user) {
          return throwError(() => new Error('USER_NOT_FOUND'));
        }
        return this.createChannel(user.username).pipe(
          switchMap((channel) => this.addMember(channel.id, user.id).pipe(map(() => channel))),
        );
      }),
    );
  }

    // Ajoute une personne à une conversation à partir de son nom d'utilisateur.
  addMemberByUsername(channelId: string, username: string): Observable<unknown> {
    return this.findUser(username).pipe(
      switchMap((user) => {
        // Personne introuvable : on renvoie une erreur.
        if (!user) {
          return throwError(() => new Error('USER_NOT_FOUND'));
        }
        return this.addMember(channelId, user.id);
      }),
    );
  }
}

function lastActivity(c: Channel): string {
  return c.last_message?.created_at ?? c.created_at;
}

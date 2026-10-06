import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { ChatMessage } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { AuthService } from '@features/auth/auth';

// Format d'un message envoyé par le back sur le websocket (consumers.py → chat_message).
interface WsMessage {
  id: string;
  message: string;
  sender: string;
  sender_id: string;
  created_at: string;
}

// Temps d'attente avant de retenter une connexion (en millisecondes).
const RETRY_DELAY = 3000;

// Gère la connexion websocket d'une conversation et la liste de ses messages.
@Injectable()
export class ChatSocket {
  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly connected = signal(false);

  private ws: WebSocket | null = null;
  private channelId = '';
  private retryTimer = 0;
  private closedByUs = false;

  // Ouvre la connexion pour la conversation donnée.
  open(channelId: string): void {
    this.channelId = channelId;
    this.closedByUs = false;
    this.connect();
  }

  // Place l'historique au début de la liste, puis remet les messages reçus en direct.
  setHistory(history: ChatMessage[]): void {
    const liveMessages = this.messages();
    this.messages.set(history);
    for (const msg of liveMessages) {
      this.addMessage(msg);
    }
  }

  // Envoie un message et renvoie true si l'envoi a pu se faire.
  send(content: string): boolean {
    const text = content.trim();
    if (text === '' || this.ws === null || !this.connected()) {
      return false;
    }
    this.ws.send(JSON.stringify({ message: text }));
    return true;
  }

  // Ferme la connexion et annule toute tentative de reconnexion.
  close(): void {
    this.closedByUs = true;
    window.clearTimeout(this.retryTimer);
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
    this.connected.set(false);
  }

  // Crée le websocket et branche les réactions aux événements (ouvert, message, fermé).
  private connect(): void {
    const token = this.auth.token();
    if (!token) {
      return;
    }

    this.ws = new WebSocket(`${environment.wsUrl}/chat/${this.channelId}/?token=${token}`);

    this.ws.onopen = () => {
      this.connected.set(true);
    };

    this.ws.onmessage = (event) => {
      this.receive(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      this.connected.set(false);
      if (!this.closedByUs) {
        this.retryTimer = window.setTimeout(() => this.connect(), RETRY_DELAY);
      }
    };
  }

  // Transforme un message du websocket au format de l'appli et l'ajoute à la liste.
  private receive(data: WsMessage): void {
    if (this.hasMessage(data.id)) {
      return;
    }

    const msg: ChatMessage = {
      id: data.id,
      channel: this.channelId,
      sender: data.sender_id,
      sender_username: data.sender,
      content: data.message,
      is_deleted: false,
      created_at: data.created_at,
      updated_at: data.created_at,
    };
    this.addMessage(msg);
    // Fait remonter la conversation en haut de la liste (#7).
    this.chat.bump(this.channelId, msg.content, msg.sender_username);
  }

  // Ajoute un message à la fin de la liste, sauf s'il y est déjà.
  private addMessage(msg: ChatMessage): void {
    if (!this.hasMessage(msg.id)) {
      this.messages.update((list) => [...list, msg]);
    }
  }

  // Dit si un message avec cet id est déjà dans la liste.
  private hasMessage(id: string): boolean {
    return this.messages().some((m) => m.id === id);
  }
}


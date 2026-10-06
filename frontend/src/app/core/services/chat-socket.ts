import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { ChatMessage } from '@core/models/chat.model';
import { ChatService } from '@core/services/chat';
import { AuthService } from '@features/auth/auth';

// Format interne d'un message de salon envoyé par le back.
interface WsMessage {
  id: string;
  message: string;
  sender: string;
  sender_id: string;
  created_at: string;
}

// Enveloppe sortante du WebSocket (consumers.py).
interface WsEnvelope {
  type: 'chat_message' | 'error';
  payload?: WsMessage;
  code?: string;
}

// Codes de fermeture applicatifs côté back (consumers.py).
const TERMINAL_CLOSE_CODES = [4001, 4003, 4004];

const INITIAL_RETRY_DELAY = 3000;
const MAX_RETRIES = 5;

// Gère la connexion websocket d'une conversation et la liste de ses messages.
@Injectable()
export class ChatSocket {
  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly connected = signal(false);
  readonly terminalError = signal<string | null>(null);

  private ws: WebSocket | null = null;
  private channelId = '';
  private retryTimer = 0;
  private retryCount = 0;
  private closedByUs = false;

  // Ouvre la connexion pour la conversation donnée.
  open(channelId: string): void {
    this.channelId = channelId;
    this.closedByUs = false;
    this.terminalError.set(null);
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
    this.retryCount = 0;
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
      this.retryCount = 0;
      this.terminalError.set(null);
    };

    this.ws.onmessage = (event) => {
      let envelope: WsEnvelope;
      try {
        envelope = JSON.parse(event.data);
      } catch {
        return;
      }

      if (envelope.type === 'chat_message' && envelope.payload) {
        this.receive(envelope.payload);
      } else if (envelope.type === 'error') {
        this.terminalError.set(envelope.code ?? 'unknown_error');
      }
    };

    this.ws.onclose = (event) => {
      this.connected.set(false);
      this.ws = null;

      if (this.closedByUs) {
        return;
      }

      if (TERMINAL_CLOSE_CODES.includes(event.code)) {
        // Le back a refusé la connexion (token, membre, banni) : on ne retente pas.
        const error =
          event.code === 4001
            ? 'unauthenticated'
            : event.code === 4003
              ? 'not_a_member'
              : event.code === 4004
                ? 'banned'
                : 'connection_refused';
        this.terminalError.set(error);
        return;
      }

      if (this.retryCount >= MAX_RETRIES) {
        this.terminalError.set('max_retries_exceeded');
        return;
      }

      const delay = INITIAL_RETRY_DELAY * 2 ** this.retryCount;
      this.retryCount += 1;
      this.retryTimer = window.setTimeout(() => this.connect(), delay);
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

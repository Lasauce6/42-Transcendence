import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { AppNotification } from '@core/models/notification.model';
import { NotificationService } from '@core/services/notification';
import { ToastService } from '@core/services/toast';
import { AuthService } from '@features/auth/auth';
import { FriendsService } from '@features/friends/friends.service';

// Messages envoyés par le back sur le websocket (consumers.py → notification_message, presence_update).
type WsEvent =
  | { type: 'notification'; notification: AppNotification }
  | { type: 'presence'; user_id: string; is_online: boolean };

// Temps d'attente avant de retenter une connexion (en millisecondes).
const RETRY_DELAY = 3000;

// Gère la connexion websocket qui reçoit les notifications en direct.
@Injectable({
  providedIn: 'root',
})
export class NotificationSocket {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly toast = inject(ToastService);
  private readonly friends = inject(FriendsService);

  private ws: WebSocket | null = null;
  private retryTimer = 0;
  private closedByUs = false;
  private pausedByPageHide = false;

  constructor() {
    // Le navigateur peut garder la page quittée en mémoire (cache précédent/suivant) avec son
    // websocket ouvert : l'utilisateur resterait « en ligne ». On le ferme en quittant la page
    // et on le rouvre si la page revient de ce cache.
    window.addEventListener('pagehide', () => {
      this.pausedByPageHide = this.ws !== null;
      this.close();
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && this.pausedByPageHide) {
        this.pausedByPageHide = false;
        this.open();
      }
    });
  }

  // Ouvre la connexion (ferme d'abord l'ancienne s'il y en a une).
  open(): void {
    this.close();
    this.closedByUs = false;
    this.connect();
  }

  // Ferme la connexion et annule toute tentative de reconnexion.
  close(): void {
    this.closedByUs = true;
    window.clearTimeout(this.retryTimer);
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Crée le websocket et branche les réactions aux événements (message, fermé).
  private connect(): void {
    const token = this.auth.token();
    if (!token) {
      return;
    }

    const ws = new WebSocket(`${environment.wsUrl}/notifications/?token=${token}`);
    this.ws = ws;

    ws.onmessage = (event) => {
      this.receive(JSON.parse(event.data));
    };

    ws.onclose = () => {
      // On ne retente que si c'est bien la connexion en cours qui s'est coupée toute seule.
      if (this.ws === ws && !this.closedByUs) {
        this.retryTimer = window.setTimeout(() => this.connect(), RETRY_DELAY);
      }
    };
  }

  // Notification : ajoutée en haut de la liste avec un toast. Présence : mise à jour du statut de l'ami.
  private receive(data: WsEvent): void {
    if (data.type === 'presence') {
      this.friends.setPresence(data.user_id, data.is_online);
      return;
    }
    if (data.type !== 'notification') {
      return;
    }

    const n = data.notification;
    this.notifications.add(n);

    const action = String(n.payload?.['action'] ?? 'DEFAULT').toUpperCase();
    this.toast.info(`NOTIFICATIONS.ITEM.${n.type}.${action}`, {
      username: n.payload?.['from_username'] ?? '?',
    });
  }
}

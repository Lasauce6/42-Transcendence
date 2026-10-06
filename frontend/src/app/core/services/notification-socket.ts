import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { AppNotification } from '@core/models/notification.model';
import { NotificationService } from '@core/services/notification';
import { ToastService } from '@core/services/toast';
import { AuthService } from '@features/auth/auth';

// Format d'un message envoyé par le back sur le websocket (consumers.py → notification_message).
interface WsNotification {
  type: string;
  notification: AppNotification;
}

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

  private ws: WebSocket | null = null;
  private retryTimer = 0;
  private closedByUs = false;

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

  // Ajoute la notification reçue en haut de la liste et affiche un toast.
  private receive(data: WsNotification): void {
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

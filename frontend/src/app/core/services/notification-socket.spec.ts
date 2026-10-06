import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppNotification } from '@core/models/notification.model';
import { NotificationService } from '@core/services/notification';
import { ToastService } from '@core/services/toast';
import { AuthService } from '@features/auth/auth';
import { NotificationSocket } from './notification-socket';

// Faux websocket : garde en mémoire la dernière connexion créée, sans réseau.
class FakeWebSocket {
  static last: FakeWebSocket | null = null;

  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  close(): void {
    this.closed = true;
  }
}

// Fabrique une fausse notification de message pour les tests.
function fakeNotification(id: string): AppNotification {
  return {
    id,
    type: 'MESSAGE',
    entity_type: 'Channel',
    entity_id: 'c1',
    payload: { from_username: 'alice' },
    is_read: false,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('NotificationSocket', () => {
  let socket: NotificationSocket;
  let notifications: NotificationService;

  // Faux services : un token qu'on peut changer, et un toast qu'on peut espionner.
  const token = signal<string | null>('abc');
  const fakeToast = { info: vi.fn() };

  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    FakeWebSocket.last = null;
    token.set('abc');
    fakeToast.info.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { token } },
        { provide: ToastService, useValue: fakeToast },
        { provide: NotificationService, useValue: { add: vi.fn() } },
      ],
    });
    socket = TestBed.inject(NotificationSocket);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    socket.close();
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(socket).toBeTruthy();
  });

  it("n'ouvre pas de connexion sans token", () => {
    token.set(null);
    socket.open();

    expect(FakeWebSocket.last).toBeNull();
  });

  it("ouvre la connexion avec le token dans l'adresse", () => {
    socket.open();

    expect(FakeWebSocket.last?.url).toContain('/notifications/?token=abc');
  });

  it('ajoute la notification reçue et affiche un toast', () => {
    socket.open();
    const data = { type: 'notification', notification: fakeNotification('n1') };
    FakeWebSocket.last?.onmessage?.({ data: JSON.stringify(data) });

    expect(notifications.add).toHaveBeenCalledWith(fakeNotification('n1'));
    expect(fakeToast.info).toHaveBeenCalledWith('NOTIFICATIONS.ITEM.MESSAGE.DEFAULT', {
      username: 'alice',
    });
  });

  it('ignore les messages qui ne sont pas des notifications', () => {
    socket.open();
    FakeWebSocket.last?.onmessage?.({ data: JSON.stringify({ type: 'autre' }) });

    expect(notifications.add).not.toHaveBeenCalled();
    expect(fakeToast.info).not.toHaveBeenCalled();
  });

  it('ferme le websocket quand on appelle close', () => {
    socket.open();
    const ws = FakeWebSocket.last;
    socket.close();

    expect(ws?.closed).toBe(true);
  });

  it('se reconnecte si la connexion se coupe toute seule', () => {
    vi.useFakeTimers();
    socket.open();
    const first = FakeWebSocket.last;
    first?.onclose?.();
    vi.advanceTimersByTime(3000);

    expect(FakeWebSocket.last).not.toBe(first);
    vi.useRealTimers();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatMessage } from '@core/models/chat.model';
import { ChatSocket } from './chat-socket';
import { signal } from '@angular/core';
import { AuthService } from '@features/auth/auth';

// Fabrique un faux message pour les tests.
function fakeMessage(id: string): ChatMessage {
  return {
    id,
    channel: 'c1',
    sender: 'u1',
    sender_username: 'bob',
    content: 'salut',
    is_deleted: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

class FakeWebSocket {
  static last: FakeWebSocket | null = null;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.last = this;
  }

  close(): void {}
}


describe('ChatSocket', () => {
  let socket: ChatSocket;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChatSocket, provideHttpClient(), provideHttpClientTesting()],
    });
    socket = TestBed.inject(ChatSocket);
  });

  it('should be created', () => {
    expect(socket).toBeTruthy();
  });

  it("n'ajoute pas deux fois le même message dans l'historique", () => {
    socket.setHistory([fakeMessage('1'), fakeMessage('2')]);
    socket.setHistory([fakeMessage('1'), fakeMessage('2')]);

    expect(socket.messages().length).toBe(2);
  });

  it("n'envoie rien tant que le websocket n'est pas connecté", () => {
    expect(socket.send('salut')).toBe(false);
  });
});

describe('ChatSocket (messages reçus en direct)', () => {
  let socket: ChatSocket;

  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    FakeWebSocket.last = null;

    TestBed.configureTestingModule({
      providers: [
        ChatSocket,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: signal('abc') } },
      ],
    });
    socket = TestBed.inject(ChatSocket);
    socket.open('c1');
  });

  afterEach(() => {
    socket.close();
    vi.unstubAllGlobals();
  });

  // Simule un message envoyé par le back sur le websocket.
  function receive(data: object): void {
    FakeWebSocket.last?.onmessage?.({ data: JSON.stringify(data) });
  }

  it('garde les fichiers joints du message reçu', () => {
    receive({
      id: 'm1',
      message: 'regarde',
      sender: 'bob',
      sender_id: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      attachments: [
        { id: 'a1', name: 'photo.png', content_type: 'image/png', size: 10, url: '/api/attachments/a1/' },
      ],
    });

    expect(socket.messages()[0].attachments?.map((a) => a.name)).toEqual(['photo.png']);
  });

  it("met une liste vide quand le message reçu n'a pas de fichier", () => {
    receive({ id: 'm1', message: 'salut', sender: 'bob', sender_id: 'u1', created_at: '2026-01-01T00:00:00Z' });

    expect(socket.messages()[0].attachments).toEqual([]);
  });
});

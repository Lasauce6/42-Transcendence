import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatMessage } from '@core/models/chat.model';
import { ChatSocket } from './chat-socket';

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

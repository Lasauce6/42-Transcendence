import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat';
import { environment } from '@env/environment';

describe('ChatService', () => {
  let service: ChatService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('trie les channels par dernière activité', () => {
    service.loadChannels().subscribe();
    http.expectOne(`${environment.apiUrl}/channels/`).flush([
      { id: 'old', name: 'a', type: 'GROUP', created_by: 'u', created_at: '2026-01-01T00:00:00Z' },
      {
        id: 'recent', name: 'b', type: 'GROUP', created_by: 'u', created_at: '2026-01-01T00:00:00Z',
        last_message: { content: 'yo', sender_username: 'x', created_at: '2026-02-01T00:00:00Z' },
      },
    ]);

    expect(service.channels().map((c) => c.id)).toEqual(['recent', 'old']);
  });
});


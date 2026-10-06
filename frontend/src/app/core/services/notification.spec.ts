import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('compte les notifications non lues', () => {
    service.load().subscribe();
    http.expectOne('/api/notifications/').flush([
      { id: '1', type: 'FRIEND', entity_type: 'Friendship', entity_id: 'a', payload: {}, is_read: false, created_at: '2026-01-01T00:00:00Z' },
      { id: '2', type: 'FRIEND', entity_type: 'Friendship', entity_id: 'b', payload: {}, is_read: true, created_at: '2026-01-02T00:00:00Z' },
    ]);

    expect(service.notifications().length).toBe(2);
    expect(service.unreadCount()).toBe(1);
  });
});

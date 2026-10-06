import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ChatList } from './chat-list';

describe('ChatList', () => {
  let component: ChatList;
  let fixture: ComponentFixture<ChatList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService(),],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatList);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('démarre une conversation puis ouvre sa page', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.newUsername.set('alice');
    component.startConversation();

    http.expectOne('/api/users/').flush([{ id: 'u2', username: 'alice' }]);
    http
      .expectOne((req) => req.method === 'POST' && req.url === '/api/channels/')
      .flush({ id: 'c1', name: 'alice', type: 'PRIVATE', created_by: 'u1', created_at: '2026-01-01T00:00:00Z' });
    http.expectOne('/api/channels/c1/add-member/').flush({});

    expect(navigate).toHaveBeenCalledWith(['/chat', 'c1']);
    expect(component.newUsername()).toBe('');
    expect(component.creating()).toBe(false);
  });

  it('affiche une erreur si la personne est introuvable', () => {
    component.newUsername.set('inconnu');
    component.startConversation();

    http.expectOne('/api/users/').flush([]);

    expect(component.createError()).toBe(true);
    expect(component.creating()).toBe(false);
  });

});

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

  it('crée un channel avec le nom choisi puis ouvre sa page', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.newName.set('projet 42');
    component.createChannel();

    const create = http.expectOne((req) => req.method === 'POST' && req.url === '/api/channels/');
    expect(create.request.body).toEqual({ name: 'projet 42', type: 'GROUP' });
    create.flush({ id: 'c1', name: 'projet 42', type: 'GROUP', created_by: 'u1', created_at: '2026-01-01T00:00:00Z' });

    expect(navigate).toHaveBeenCalledWith(['/chat', 'c1']);
    expect(component.newName()).toBe('');
    expect(component.creating()).toBe(false);
  });

  it('refuse un nom de moins de 3 caractères', () => {
    component.newName.set('ab');
    component.createChannel();

    http.expectNone((req) => req.method === 'POST' && req.url === '/api/channels/');
    expect(component.canCreate()).toBe(false);
  });

  it('affiche une erreur si la création échoue', () => {
    component.newName.set('projet 42');
    component.createChannel();

    http
      .expectOne((req) => req.method === 'POST' && req.url === '/api/channels/')
      .flush({ name: ['erreur'] }, { status: 400, statusText: 'Bad Request' });

    expect(component.createError()).toBe(true);
    expect(component.creating()).toBe(false);
  });

});

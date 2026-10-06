import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ChatMessage } from '@core/models/chat.model';
import { ChatSocket } from '@core/services/chat-socket';
import { ChatWindow } from './chat-window';

// Faux socket : mêmes fonctions que le vrai, mais sans connexion réseau.
const fakeSocket = {
  messages: signal<ChatMessage[]>([]),
  connected: signal(false),
  open: () => {},
  setHistory: () => {},
  send: () => true,
  close: () => {},
};

describe('ChatWindow', () => {
  let component: ChatWindow;
  let fixture: ComponentFixture<ChatWindow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatWindow],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    })
      .overrideComponent(ChatWindow, {
        set: { providers: [{ provide: ChatSocket, useValue: fakeSocket }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ChatWindow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("vide le champ après l'envoi d'un message", () => {
    component.draft.set('salut');
    component.send();

    expect(component.draft()).toBe('');
  });
});

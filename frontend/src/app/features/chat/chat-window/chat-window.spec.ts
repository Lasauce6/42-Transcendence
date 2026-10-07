import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
  let http: HttpTestingController;

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
    http = TestBed.inject(HttpTestingController);
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

  // Fabrique l'événement envoyé par le champ fichier quand on choisit un fichier.
  function fileEvent(): Event {
    const file = new File(['contenu'], 'photo.png', { type: 'image/png' });
    return { target: { files: [file], value: 'photo.png' } } as unknown as Event;
  }

  it('envoie le fichier choisi puis vide le champ texte', () => {
    component.draft.set('regarde');
    component.onFileSelected(fileEvent());
    expect(component.uploading()).toBe(true);

    http.expectOne((req) => req.url.endsWith('/attachments/')).flush({});

    expect(component.uploading()).toBe(false);
    expect(component.uploadError()).toBe(false);
    expect(component.draft()).toBe('');
  });

  it("affiche une erreur si l'envoi du fichier échoue", () => {
    component.onFileSelected(fileEvent());

    http
      .expectOne((req) => req.url.endsWith('/attachments/'))
      .flush({}, { status: 400, statusText: 'Bad Request' });

    expect(component.uploading()).toBe(false);
    expect(component.uploadError()).toBe(true);
  });

  it("n'envoie rien si aucun fichier n'est choisi", () => {
    component.onFileSelected({ target: { files: [] } } as unknown as Event);

    http.expectNone((req) => req.url.endsWith('/attachments/'));
    expect(component.uploading()).toBe(false);
  });

  it('ajoute un membre puis vide le champ', () => {
    component.memberName.set('alice');
    component.addMember();

    http.expectOne('/api/users/').flush([{ id: 'u2', username: 'alice' }]);
    http.expectOne((req) => req.url.endsWith('/add-member/')).flush({});

    expect(component.memberAdded()).toBe(true);
    expect(component.memberName()).toBe('');
  });

  it('affiche une erreur si la personne à ajouter est introuvable', () => {
    component.memberName.set('inconnu');
    component.addMember();

    http.expectOne('/api/users/').flush([]);

    expect(component.memberError()).toBe(true);
    expect(component.memberAdded()).toBe(false);
  });
});

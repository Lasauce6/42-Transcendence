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

  it('crée un channel de groupe avec le nom choisi', () => {
    let createdId = '';
    service.createGroup('projet 42').subscribe((channel) => (createdId = channel.id));

    const create = http.expectOne('/api/channels/');
    expect(create.request.body).toEqual({ name: 'projet 42', type: 'GROUP' });
    create.flush({ id: 'c1', name: 'projet 42', type: 'GROUP', created_by: 'u1', created_at: '2026-01-01T00:00:00Z' });

    expect(createdId).toBe('c1');
    expect(service.channels().map((c) => c.id)).toEqual(['c1']);
  });

  it("ouvre la conversation privée avec un ami sans la dupliquer dans la liste", () => {
    const channel = { id: 'p1', name: null, type: 'PRIVATE', created_by: 'u1', created_at: '2026-01-01T00:00:00Z' };

    service.openPrivate('u2').subscribe();
    const req = http.expectOne('/api/channels/private/');
    expect(req.request.body).toEqual({ user_id: 'u2' });
    req.flush(channel);

    service.openPrivate('u2').subscribe();
    http.expectOne('/api/channels/private/').flush(channel);

    expect(service.channels().map((c) => c.id)).toEqual(['p1']);
  });

  it("ajoute un membre à partir de son nom d'utilisateur", () => {
    let done = false;
    service.addMemberByUsername('c1', 'alice').subscribe(() => (done = true));

    http.expectOne('/api/users/').flush([{ id: 'u2', username: 'alice' }]);

    const add = http.expectOne('/api/channels/c1/add-member/');
    expect(add.request.body).toEqual({ user_id: 'u2' });
    add.flush({});

    expect(done).toBe(true);
  });

  it("n'ajoute personne si le nom d'utilisateur est introuvable", () => {
    let failed = false;
    service.addMemberByUsername('c1', 'inconnu').subscribe({ error: () => (failed = true) });

    http.expectOne('/api/users/').flush([]);

    http.expectNone('/api/channels/c1/add-member/');
    expect(failed).toBe(true);
  });

  it('envoie un fichier avec son texte dans un formulaire', () => {
    const file = new File(['contenu'], 'photo.png', { type: 'image/png' });
    service.sendAttachment('c1', file, 'regarde').subscribe();

    const upload = http.expectOne('/api/channels/c1/attachments/');
    const body = upload.request.body as FormData;
    expect(upload.request.method).toBe('POST');
    expect((body.get('file') as File).name).toBe('photo.png');
    expect(body.get('content')).toBe('regarde');
    upload.flush({});
  });
});


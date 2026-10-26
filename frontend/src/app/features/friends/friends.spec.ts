import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CurrentUser } from '@core/services/current-user';
import { UserProfile } from '@core/models/user.model';
import { Friendship, FriendUser } from './friend.models';
import { Friends } from './friends';
import { FriendRow, FriendsService } from './friends.service';

const user = (id: string, username: string, is_online = false): FriendUser => ({
  id,
  username,
  avatar: null,
  is_online,
  last_seen: null,
});

const friendship = (
  id: string,
  from: FriendUser,
  to: FriendUser,
  status: Friendship['status'],
): Friendship => ({
  id,
  requester: from.id,
  addressee: to.id,
  status,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  requester_user: from,
  addressee_user: to,
});

const me = user('u1', 'alice');
const bob = user('u2', 'bob', true);
const charlie = user('u3', 'charlie');
const diana = user('u4', 'diana');

// Accès aux membres protégés du composant dans les tests.
type View = {
  newUsername: WritableSignal<string>;
  add(): void;
  message(row: FriendRow): void;
  error(): string | null;
};

describe('Friends', () => {
  let component: View;
  let fixture: ComponentFixture<Friends>;
  let http: HttpTestingController;
  let service: FriendsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Friends],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();

    service = TestBed.inject(FriendsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(CurrentUser).load().subscribe();
    http.expectOne('/api/users/me/').flush({ id: 'u1', username: 'alice' } as UserProfile);
    fixture = TestBed.createComponent(Friends);
    component = fixture.componentInstance as unknown as View;
    fixture.detectChanges();

    http
      .expectOne('/api/friendships/')
      .flush([
        friendship('f1', me, bob, 'ACCEPTED'),
        friendship('f2', charlie, me, 'PENDING'),
        friendship('f3', me, diana, 'PENDING'),
      ]);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('range les amitiés sans appel par utilisateur', () => {
    expect(service.friendRows().map((r) => [r.username, r.online])).toEqual([['bob', true]]);
    expect(service.receivedRows().map((r) => r.username)).toEqual(['charlie']);
    expect(service.sentRows().map((r) => r.username)).toEqual(['diana']);
  });

  it('envoie une demande à partir du pseudo', () => {
    const emma = user('u5', 'emma');
    component.newUsername.set('Emma');
    component.add();

    http.expectOne((r) => r.url === '/api/users/').flush([{ id: 'u5', username: 'emma' }]);
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/friendships/');
    expect(req.request.body).toEqual({ addressee: 'u5' });
    req.flush(friendship('f4', me, emma, 'PENDING'));

    expect(service.sentRows().map((r) => r.username)).toEqual(['diana', 'emma']);
  });

  it("refuse d'ajouter un ami existant ou soi-même sans appeler l'API", () => {
    component.newUsername.set('bob');
    component.add();
    expect(component.error()).toBe('FRIENDS.ERROR_ALREADY');

    component.newUsername.set('alice');
    component.add();
    expect(component.error()).toBe('FRIENDS.ERROR_SELF');
  });

  it('affiche une erreur si le pseudo est introuvable', () => {
    component.newUsername.set('inconnu');
    component.add();

    http.expectOne((r) => r.url === '/api/users/').flush([]);

    expect(component.error()).toBe('FRIENDS.USER_NOT_FOUND');
  });

  it('met les amis en ligne en premier', () => {
    service.accept('f2').subscribe();
    const aaron = user('u0', 'aaron');
    http.expectOne('/api/friendships/f2/accept/').flush(friendship('f2', aaron, me, 'ACCEPTED'));

    expect(service.friendRows().map((r) => r.username)).toEqual(['bob', 'aaron']);
    expect(service.onlineRows().map((r) => r.username)).toEqual(['bob']);
  });

  it('ouvre la conversation privée avec un ami', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.message(service.friendRows()[0]);

    const req = http.expectOne('/api/channels/private/');
    expect(req.request.body).toEqual({ user_id: 'u2' });
    req.flush({ id: 'c1', type: 'PRIVATE' });

    expect(navigate).toHaveBeenCalledWith(['/chat', 'c1']);
  });

  it('accepte une demande reçue', () => {
    service.accept('f2').subscribe();
    http.expectOne('/api/friendships/f2/accept/').flush(friendship('f2', charlie, me, 'ACCEPTED'));

    expect(service.friendRows().map((r) => r.username)).toEqual(['bob', 'charlie']);
    expect(service.receivedRows()).toEqual([]);
  });
});

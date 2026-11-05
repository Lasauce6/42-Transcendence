import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { UserProfile as Me } from '@core/models/user.model';
import { Friendship, FriendUser } from '@features/friends/friend.models';
import { PublicProfile } from '../user.service';
import { Relation, UserProfile } from './user-profile';

const friendUser = (id: string, username: string): FriendUser => ({
  id,
  username,
  avatar: null,
  is_online: false,
  last_seen: null,
});

const alice = friendUser('u1', 'alice');
const bob = friendUser('u2', 'bob');

const bobProfile: PublicProfile = {
  id: 'u2',
  username: 'bob',
  first_name: 'Bob',
  last_name: 'Durand',
  bio: 'Salut !',
  avatar: null,
  is_online: false,
  last_seen: '2026-11-01T10:00:00Z',
};

const friendship = (
  from: FriendUser,
  to: FriendUser,
  status: Friendship['status'],
): Friendship => ({
  id: 'f1',
  requester: from.id,
  addressee: to.id,
  status,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  requester_user: from,
  addressee_user: to,
});

type View = {
  relation(): Relation;
  profile(): PublicProfile | null;
  loadError(): string | null;
};

describe('UserProfile', () => {
  let fixture: ComponentFixture<UserProfile>;
  let component: View;
  let http: HttpTestingController;
  let router: Router;
  const params = new BehaviorSubject(convertToParamMap({ id: 'u2' }));

  beforeEach(async () => {
    params.next(convertToParamMap({ id: 'u2' }));
    await TestBed.configureTestingModule({
      imports: [UserProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(UserProfile);
    component = fixture.componentInstance as unknown as View;
  });

  afterEach(() => http.verify());

  function open(friendships: Friendship[], profile: PublicProfile | null = bobProfile) {
    fixture.detectChanges();
    http.expectOne('/api/friendships/').flush(friendships);
    http.expectOne('/api/users/me/').flush({ id: 'u1', username: 'alice' } as Me);
    const req = http.expectOne('/api/users/u2/');
    if (profile) req.flush(profile);
    else req.flush({ detail: 'Not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  }

  function click(label: string) {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLElement) =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement;
    button.click();
  }

  it('affiche le profil et propose de demander en ami', () => {
    open([]);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('bob');
    expect(text).toContain('Bob Durand');
    expect(text).toContain('Salut !');
    expect(component.relation()).toBe('none');

    click('USER_PROFILE.ADD_FRIEND');
    const req = http.expectOne('/api/friendships/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ addressee: 'u2' });
    req.flush(friendship(alice, bob, 'PENDING'));
    expect(component.relation()).toBe('sent');
  });

  it('ouvre la conversation privée quand on est amis', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    open([friendship(alice, bob, 'ACCEPTED')]);
    expect(component.relation()).toBe('friends');

    click('FRIENDS.MESSAGE');
    const req = http.expectOne('/api/channels/private/');
    expect(req.request.body).toEqual({ user_id: 'u2' });
    req.flush({
      id: 'c9',
      name: null,
      type: 'PRIVATE',
      created_by: 'u1',
      created_at: '',
      members: [],
    });
    expect(navigate).toHaveBeenCalledWith(['/chat', 'c9']);
  });

  it('permet d’accepter une demande reçue', () => {
    open([friendship(bob, alice, 'PENDING')]);
    expect(component.relation()).toBe('received');

    click('FRIENDS.ACCEPT');
    const req = http.expectOne('/api/friendships/f1/accept/');
    req.flush(friendship(bob, alice, 'ACCEPTED'));
    expect(component.relation()).toBe('friends');
  });

  it('renvoie vers /profile quand on ouvre son propre profil', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    params.next(convertToParamMap({ id: 'u1' }));
    fixture.detectChanges();
    http.expectOne('/api/friendships/').flush([]);
    http.expectOne('/api/users/me/').flush({ id: 'u1', username: 'alice' } as Me);
    expect(navigate).toHaveBeenCalledWith(['/profile'], { replaceUrl: true });
    http.expectNone('/api/users/u1/');
  });

  it('affiche une erreur si l’utilisateur n’existe pas', () => {
    open([], null);
    expect(component.loadError()).toBe('USER_PROFILE.UNAVAILABLE');
    expect(component.profile()).toBeNull();
  });
});

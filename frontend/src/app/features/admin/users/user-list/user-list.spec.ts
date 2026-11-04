import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ToastService } from '@core/services/toast';
import { AdminUser } from '../../admin-user.model';

import { UserList } from './user-list';

const users: AdminUser[] = [
  { id: 'u1', username: 'alice', email: 'alice@example.test', role: 'USER', avatar: null },
  { id: 'u2', username: 'bob', email: 'bob@example.test', role: 'MODERATOR', avatar: null },
  { id: 'u3', username: 'charlie', email: 'charlie@example.test', role: 'USER', avatar: null },
];

// Vérifie le composant avec ses dépendances (traduction + HTTP simulé)
describe('UserList', () => {
  let component: UserList;
  let fixture: ComponentFixture<UserList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [provideTranslateService(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/users/').flush(users);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filtre par nom ou email', () => {
    component.search.set('BOB');
    expect(component.filteredUsers().map((u) => u.username)).toEqual(['bob']);

    component.search.set('charlie@');
    expect(component.filteredUsers().map((u) => u.username)).toEqual(['charlie']);
  });

  it('filtre par rôle', () => {
    component.roleFilter.set('USER');
    expect(component.filteredUsers().map((u) => u.username)).toEqual(['alice', 'charlie']);
  });

  it('coche puis décoche toutes les lignes affichées', () => {
    component.toggleAll();
    expect(component.selected().size).toBe(3);

    component.toggleAll();
    expect(component.selected().size).toBe(0);
  });

  it('supprime les utilisateurs cochés après une seule confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const success = vi.spyOn(TestBed.inject(ToastService), 'success');
    component.toggle('u1');
    component.toggle('u3');
    component.removeSelected();

    http.expectOne({ method: 'DELETE', url: '/api/users/u1/' }).flush(null);
    http.expectOne({ method: 'DELETE', url: '/api/users/u3/' }).flush(null);

    expect(component.users().map((u) => u.username)).toEqual(['bob']);
    expect(component.selected().size).toBe(0);
    expect(success).toHaveBeenCalledWith('ADMIN.USERS.DELETED_SELECTED', { count: 2 });
  });

  it('modifie le nom et l\'email d\'un utilisateur', () => {
    component.startEdit(users[0]);
    component.editUsername.set('alice2');
    component.saveEdit(users[0]);

    const req = http.expectOne({ method: 'PATCH', url: '/api/users/u1/' });
    expect(req.request.body).toEqual({ username: 'alice2', email: 'alice@example.test' });
    req.flush({ ...users[0], username: 'alice2' });

    expect(component.users()[0].username).toBe('alice2');
    expect(component.editingId()).toBeNull();
  });

  it("n'envoie rien si l'email est invalide", () => {
    component.startEdit(users[0]);
    component.editEmail.set('pas-un-email');
    component.saveEdit(users[0]);

    http.expectNone({ method: 'PATCH', url: '/api/users/u1/' });
    expect(component.canSave()).toBe(false);
  });
});


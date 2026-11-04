import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { USER_ROLES, UserRole } from '@core/models/user.model';
import { CurrentUser } from '@core/services/current-user';
import { ToastService } from '@core/services/toast';
import { AdminService } from '../../admin.service';
import { AdminUser } from '../../admin-user.model';
import { UiAlert, UiAvatar, UiBadge, UiButton, UiCard, UiEmptyState, UiIcon, UiPageHeader, UiSpinner } from '@shared/ui';

// Tableau des utilisateurs : recherche, filtre, modification, changement de rôle, suppression (une ou plusieurs)
@Component({
  selector: 'app-user-list',
  imports: [TranslatePipe, UiAlert, UiAvatar, UiBadge, UiButton, UiCard, UiEmptyState, UiIcon, UiPageHeader, UiSpinner],
  templateUrl: './user-list.html',
})
export class UserList implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly currentUser = inject(CurrentUser);

  // Liste des rôles pour remplir le <select>
  readonly roles = USER_ROLES;

  // État de la page
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  // Id de l'admin connecté, pour ne pas afficher d'actions sur sa propre ligne
  readonly myId = computed(() => this.currentUser.profile()?.id ?? null);

  // Recherche (nom ou email) et filtre par rôle ('' = tous les rôles)
  readonly search = signal('');
  readonly roleFilter = signal<UserRole | ''>('');

  // Liste affichée : la liste complète, filtrée par la recherche et le rôle
  readonly filteredUsers = computed(() => {
    const q = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter(
      (u) =>
        (!role || u.role === role) &&
        (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  });

  // Ids des utilisateurs cochés pour la suppression en masse
  readonly selected = signal<Set<string>>(new Set());
  // Lignes cochables : toutes celles affichées sauf la sienne
  readonly selectable = computed(() => this.filteredUsers().filter((u) => u.id !== this.myId()));
  readonly allSelected = computed(
    () => this.selectable().length > 0 && this.selectable().every((u) => this.selected().has(u.id)),
  );

  // Utilisateur en cours de modification (null = aucun) et les valeurs du formulaire
  readonly editingId = signal<string | null>(null);
  readonly editUsername = signal('');
  readonly editEmail = signal('');

  // Charge la liste à l'ouverture de la page
  ngOnInit(): void {
    this.admin.getUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // Appelée quand l'admin choisit un autre rôle dans le <select>
  changeRole(user: AdminUser, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.admin.changeRole(user.id, select.value as UserRole).subscribe({
      next: (updated) => {
        // on remplace l'ancien utilisateur par celui renvoyé par le back
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.toast.success('ADMIN.USERS.ROLE_CHANGED');
      },
      error: () => {
        // le back a refusé : on remet l'ancien rôle dans le <select>
        select.value = user.role;
      },
    });
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onRoleFilter(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as UserRole | '');
  }

  // Coche / décoche une ligne
  toggle(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Coche toutes les lignes affichées, ou les décoche si elles le sont déjà
  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.selectable().map((u) => u.id)));
  }

  // Supprime tous les utilisateurs cochés après une seule confirmation
  removeSelected(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) {
      return;
    }
    const question = this.translate.instant('ADMIN.USERS.CONFIRM_DELETE_SELECTED', { count: ids.length });
    if (!window.confirm(question)) {
      return;
    }
    forkJoin(ids.map((id) => this.admin.deleteUser(id))).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => !ids.includes(u.id)));
        this.selected.set(new Set());
        this.toast.success('ADMIN.USERS.DELETED_SELECTED', { count: ids.length });
      },
      error: () => {}, // l'interceptor affiche déjà un toast d'erreur
    });
  }

  // Ouvre le formulaire de modification sur la ligne de cet utilisateur
  startEdit(user: AdminUser): void {
    this.editingId.set(user.id);
    this.editUsername.set(user.username);
    this.editEmail.set(user.email);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  onEditUsername(event: Event): void {
    this.editUsername.set((event.target as HTMLInputElement).value);
  }

  onEditEmail(event: Event): void {
    this.editEmail.set((event.target as HTMLInputElement).value);
  }

  // Le formulaire est valide si le nom fait au moins 3 caractères et l'email a un @
  canSave(): boolean {
    return this.editUsername().trim().length >= 3 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.editEmail().trim());
  }

  // Envoie la modification au back (il revalide tout : format, nom déjà pris…)
  saveEdit(user: AdminUser): void {
    if (!this.canSave()) {
      return;
    }
    const changes = { username: this.editUsername().trim(), email: this.editEmail().trim() };
    this.admin.updateUser(user.id, changes).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.editingId.set(null);
        this.toast.success('ADMIN.USERS.UPDATED');
      },
      error: () => this.toast.error('ADMIN.USERS.UPDATE_ERROR'),
    });
  }

  // Supprime un utilisateur après confirmation
  remove(user: AdminUser): void {
    const question = this.translate.instant('ADMIN.USERS.CONFIRM_DELETE', {
      username: user.username,
    });
    if (!window.confirm(question)) {
      return;
    }
    this.admin.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.toast.success('ADMIN.USERS.DELETED');
      },
      error: () => {}, // l'interceptor affiche déjà un toast d'erreur
    });
  }
}

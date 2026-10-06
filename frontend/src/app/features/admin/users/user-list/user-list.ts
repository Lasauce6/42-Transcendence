import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { USER_ROLES, UserRole } from '@core/models/user.model';
import { CurrentUser } from '@core/services/current-user';
import { ToastService } from '@core/services/toast';
import { AdminService } from '../../admin.service';
import { AdminUser } from '../../admin-user.model';

// Tableau des utilisateurs : liste, changement de rôle, suppression
@Component({
  selector: 'app-user-list',
  imports: [TranslatePipe],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
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

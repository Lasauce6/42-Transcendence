import { Component, inject, signal } from '@angular/core';
import { AdminService } from '../../admin.service';
import { AdminUser } from '../../admin-user.model';

@Component({
  selector: 'app-user-list',
  imports: [],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private readonly adminService = inject(AdminService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.status === 403 ? 'Accès refusé' : 'Erreur de chargement');
        this.loading.set(false);
      },
    });
  }
}

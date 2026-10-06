import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { UserRole } from '@core/models/user.model';
import { AdminUser } from './admin-user.model';

// Regroupe tous les appels API du panel admin
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/users/`;

  // Récupère tous les utilisateurs
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.url);
  }

  // Change le rôle : le back a 2 routes, "demote" pour USER et "promote" pour le reste
  changeRole(id: string, role: UserRole): Observable<AdminUser> {
    if (role === 'USER') {
      return this.http.post<AdminUser>(`${this.url}${id}/demote/`, {});
    }
    return this.http.post<AdminUser>(`${this.url}${id}/promote/`, { role });
  }

  // Supprime définitivement un utilisateur
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}

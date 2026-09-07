import { Component, inject } from '@angular/core';
import { AuthService } from '../../../app/features/auth/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly isLoggedIn = this.authService.isLoggedIn;

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

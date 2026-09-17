import { Component, inject, OnInit, signal } from '@angular/core';
import { User, UserProfile } from '../user';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly userService = inject(User);

  readonly profile = signal<UserProfile | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (data) => this.profile.set(data),
      error: () => this.error.set('Impossible de charger le profil. Réessaie plus tard.'),
    });
  }
}

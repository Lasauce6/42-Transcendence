import { Component, inject, OnInit, signal } from '@angular/core';
import { UserService, UserProfile } from '../user.service';
import { ProfileEdit } from '../profile-edit/profile-edit';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  imports: [ProfileEdit, TranslatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly userService = inject(UserService);

  readonly profile = signal<UserProfile | null>(null);
  readonly error = signal<string | null>(null);

  isEditing = signal(false);

  startEdit(): void {
    this.isEditing.set(true);
  }

  onProfileUpdated(updated: UserProfile): void {
    this.profile.set(updated);
    this.isEditing.set(false);
  }

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (data) => this.profile.set(data),
      error: () => this.error.set('PROFILE.LOAD_FAILED'),
    });
  }
}

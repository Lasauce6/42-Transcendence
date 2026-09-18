import { Component, effect, inject, input, output, signal } from '@angular/core';
import { UpdateProfilePayload, UserProfile, UserService } from '../user.service';

@Component({
  selector: 'app-profile-edit',
  imports: [],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit {
  private readonly userService = inject(UserService);
  readonly profile = input.required<UserProfile>();
  readonly profileUpdated = output<UserProfile>();
  readonly username = signal('');
  readonly email = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.username.set(this.profile().username);
      this.email.set(this.profile().email);
    });
  }
  onSubmit() {
    const payload: UpdateProfilePayload = {};
    if (this.username() !== this.profile().username) {
      payload.username = this.username();
    }
    if (this.email() !== this.profile().email) {
      payload.email = this.email();
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.userService.updateMe(payload).subscribe({
      next: (updatedProfile) => {
        this.profileUpdated.emit(updatedProfile);
        this.saving.set(false);
      },
      error: () => {
        this.error.set('La mise à jour a échoué. Réessaie.');
        this.saving.set(false);
      },
    });
  }
}

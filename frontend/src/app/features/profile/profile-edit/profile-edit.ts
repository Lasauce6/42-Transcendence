import { Component, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { UpdateProfilePayload, UserProfile, UserService } from '../user.service';
import { form, maxLength, required, FormField, submit, minLength } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile-edit',
  imports: [FormField],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit implements OnDestroy {
  private readonly userService = inject(UserService);
  readonly profile = input.required<UserProfile>();
  readonly profileUpdated = output<UserProfile>();
  readonly profileData = signal<ProfileFormData>({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
  });

  readonly passwordData = signal<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  readonly passwordForm = form(this.passwordData, (path) => {
    required(path.currentPassword);
    required(path.newPassword);
    minLength(path.newPassword, 8);
    maxLength(path.newPassword, 72);
    required(path.confirmPassword);
  });
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);

  readonly changingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal<string | null>(null);
  readonly profileForm = form(this.profileData, (path) => {
    required(path.username);
    maxLength(path.username, 100);
    maxLength(path.first_name, 150);
    maxLength(path.last_name, 150);
    maxLength(path.bio, 500);
  });

  constructor() {
    effect(() => {
      const p = this.profile();
      this.profileData.set({
        username: p.username,
        first_name: p.first_name,
        last_name: p.last_name,
        bio: p.bio,
      });
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return; // l'utilisateur a annulé la sélection, on ne touche à rien
    }

    const previousUrl = this.avatarPreviewUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl); // libère l'ancienne référence AVANT de la remplacer
    }

    this.avatarFile.set(file);
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
  }

  ngOnDestroy(): void {
    const previousUrl = this.avatarPreviewUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
  }

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.profileForm, async () => {
      const payload: UpdateProfilePayload = {};
      const data = this.profileData();

      if (this.profileForm.username().dirty()) payload.username = data.username;
      if (this.profileForm.first_name().dirty()) payload.first_name = data.first_name;
      if (this.profileForm.last_name().dirty()) payload.last_name = data.last_name;
      if (this.profileForm.bio().dirty()) payload.bio = data.bio;

      const file = this.avatarFile();
      if (Object.keys(payload).length === 0 && !file) return;

      this.saving.set(true);
      this.error.set(null);
      try {
        const updated = await firstValueFrom(this.userService.updateMe(payload, file));
        this.profileUpdated.emit(updated);
        this.saving.set(false);
      } catch {
        this.error.set('La mise à jour a échoué. Réessaie.');
        this.saving.set(false);
      }
    });
  }

  onPasswordSubmit(event: Event): void {
    event.preventDefault();

    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    submit(this.passwordForm, async () => {
      const data = this.passwordData();

      if (data.newPassword !== data.confirmPassword) {
        this.passwordError.set('Les deux nouveaux mots de passe ne correspondent pas.');
        return;
      }

      this.changingPassword.set(true);

      try {
        await firstValueFrom(
          this.userService.changePassword({
            current_password: data.currentPassword,
            new_password: data.newPassword,
          }),
        );

        this.passwordData.set({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        this.passwordSuccess.set('Mot de passe modifié avec succès.');
      } catch {
        this.passwordError.set(
          'Impossible de modifier le mot de passe. Vérifie ton mot de passe actuel et réessaie.',
        );
      } finally {
        this.changingPassword.set(false);
      }
    });
  }
}

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileFormData = Pick<UserProfile, 'username' | 'first_name' | 'last_name' | 'bio'>;

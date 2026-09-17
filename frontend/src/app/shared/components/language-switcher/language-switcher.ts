import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Language } from '../../../core/services/language';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  readonly lang = inject(Language);

  readonly names: Record<string, string> = {
    fr: 'Français',
    en: 'English',
    es: 'Español',
  };

  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.lang.use(select.value);
  }
}

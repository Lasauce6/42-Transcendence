import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class Language {
  private translate = inject(TranslateService);
  readonly langs = ['fr', 'en', 'es'];
  readonly current = signal('fr');

  use(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    this.current.set(lang);
  }

  init() {
    const saved = localStorage.getItem('lang');
    const browser = this.translate.getBrowserLang();

    const wanted = saved ?? browser ?? 'fr';
    const lang = this.langs.includes(wanted) ? wanted : 'fr';

    this.use(lang);
  }
}

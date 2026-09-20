import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  private subscription: Subscription | null = null;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.subscription?.unsubscribe();
    this.subscription = null;

    const key = this.buildTitle(snapshot);
    if (!key) {
      this.subscription = this.translate
        .stream('APP.NAME')
        .subscribe((name: string) => this.title.setTitle(name));
      return;
    }

    this.subscription = this.translate
      .stream(key)
      .subscribe((translated: string) => this.title.setTitle(translated));
  }
}

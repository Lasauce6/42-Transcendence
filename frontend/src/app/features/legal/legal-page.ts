import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

type LegalSection = { title: string; items: string[] };

@Component({
  selector: 'app-legal-page',
  imports: [TranslatePipe],
  templateUrl: './legal-page.html',
})
export class LegalPage {
  readonly doc: string = inject(ActivatedRoute).snapshot.data['doc'];

  sections(value: unknown): LegalSection[] {
    return Array.isArray(value) ? value : [];
  }
}

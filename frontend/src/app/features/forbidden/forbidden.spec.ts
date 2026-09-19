import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { Forbidden } from './forbidden';

describe('Forbidden', () => {
  let component: Forbidden;
  let fixture: ComponentFixture<Forbidden>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Forbidden],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      FORBIDDEN: {
        TITLE: 'Access denied',
        MESSAGE: "You don't have the required permissions to view this page.",
        BACK_HOME: 'Back to home',
      },
    });
    translate.use('en');

    fixture = TestBed.createComponent(Forbidden);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le code 403 et le message traduit', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('403');
    expect(el.querySelector('h2')?.textContent).toContain('Access denied');
  });
});

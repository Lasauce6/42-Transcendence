import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { ToastService } from '@core/services/toast';

import { Toast } from './toast';

describe('Toast', () => {
  let fixture: ComponentFixture<Toast>;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toast],
      providers: [provideTranslateService()],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      TOAST: {
        REGION_LABEL: 'Notifications',
        CLOSE: 'Close',
        ERROR: { SERVER: 'The server ran into a problem.' },
      },
    });
    translate.use('en');

    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(Toast);
    await fixture.whenStable();
  });

  it('n’affiche rien quand la liste est vide', () => {
    expect(fixture.nativeElement.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('affiche le message traduit', async () => {
    toasts.error('TOAST.ERROR.SERVER');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('The server ran into a problem.');
  });

  it('applique la classe du type', async () => {
    toasts.success('TOAST.ERROR.SERVER');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.toast--success')).toBeTruthy();
  });

  it('le bouton fermer retire le toast', async () => {
    toasts.info('TOAST.ERROR.SERVER');
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.toast__close') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(toasts.toasts()).toHaveLength(0);
  });
});

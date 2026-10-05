import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { ApiDocs } from './api-docs';

describe('ApiDocs', () => {
  let component: ApiDocs;
  let fixture: ComponentFixture<ApiDocs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiDocs],
      providers: [provideTranslateService()],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      API_DOCS: {
        TITLE: 'API documentation',
        FRAME_TITLE: 'Swagger UI',
      },
    });
    translate.use('en');

    fixture = TestBed.createComponent(ApiDocs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le titre et le swagger', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('API documentation');
    expect(el.querySelector('iframe')?.getAttribute('src')).toBe('/api/docs/');
  });
});

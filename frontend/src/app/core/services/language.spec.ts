import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { Language } from './language';

describe('Language', () => {
  let service: Language;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });
    service = TestBed.inject(Language);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('use() persists the lang, updates <html lang> and the signal', () => {
    service.use('es');

    expect(localStorage.getItem('lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(service.current()).toBe('es');
  });

  it('init() restores the saved lang', () => {
    localStorage.setItem('lang', 'en');

    service.init();

    expect(service.current()).toBe('en');
  });

  it('init() falls back to fr on an unsupported lang', () => {
    localStorage.setItem('lang', 'de');

    service.init();

    expect(service.current()).toBe('fr');
  });

  it('init() uses the browser lang when nothing is saved', () => {
    const translate = TestBed.inject(TranslateService);
    vi.spyOn(translate, 'getBrowserLang').mockReturnValue('es');

    service.init();

    expect(service.current()).toBe('es');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { LanguageSwitcher } from './language-switcher';
import { Language } from '../../../core/services/language';

describe('LanguageSwitcher', () => {
  let component: LanguageSwitcher;
  let fixture: ComponentFixture<LanguageSwitcher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders one option per supported lang', () => {
    const options: HTMLOptionElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('option'),
    );

    expect(options.length).toBe(3);
    expect(options.map((o) => o.value)).toEqual(['fr', 'en', 'es']);
  });

  it('calls Language.use() when the select changes', () => {
    const lang = TestBed.inject(Language);
    const use = vi.spyOn(lang, 'use');

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'es';
    select.dispatchEvent(new Event('change'));

    expect(use).toHaveBeenCalledWith('es');
  });
});

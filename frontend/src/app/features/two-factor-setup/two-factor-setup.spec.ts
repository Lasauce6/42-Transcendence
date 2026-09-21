import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { TwoFactorSetup } from './two-factor-setup';

describe('TwoFactorSetup', () => {
  let component: TwoFactorSetup;
  let fixture: ComponentFixture<TwoFactorSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorSetup],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFactorSetup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

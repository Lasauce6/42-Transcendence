import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TwoFactorVerify } from './two-factor-verify';

describe('TwoFactorVerify', () => {
  let component: TwoFactorVerify;
  let fixture: ComponentFixture<TwoFactorVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorVerify],
      providers: [provideRouter([{ path: 'login', children: [] }])],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFactorVerify);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

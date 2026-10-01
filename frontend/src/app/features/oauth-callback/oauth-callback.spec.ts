import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { OauthCallback } from './oauth-callback';

@Component({ selector: 'app-fake-login', template: '' })
class FakeLogin {}

describe('OauthCallback', () => {
  let component: OauthCallback;
  let fixture: ComponentFixture<OauthCallback>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OauthCallback],
      providers: [
        provideRouter([{ path: 'login', component: FakeLogin }]),
        provideTranslateService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OauthCallback);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

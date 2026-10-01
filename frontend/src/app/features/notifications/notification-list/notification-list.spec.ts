import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { NotificationList } from './notification-list';

describe('NotificationList', () => {
  let component: NotificationList;
  let fixture: ComponentFixture<NotificationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationList],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

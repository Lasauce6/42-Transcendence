import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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

  it('ouvre la conversation quand on clique sur une notification de message', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.open({
      id: 'n1',
      type: 'MESSAGE',
      entity_type: 'Channel',
      entity_id: 'c1',
      payload: { from_username: 'alice' },
      is_read: true,
      created_at: '2026-01-01T00:00:00Z',
    });

    expect(navigate).toHaveBeenCalledWith(['/chat', 'c1']);
  });
});

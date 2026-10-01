import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ChatList } from './chat-list';

describe('ChatList', () => {
  let component: ChatList;
  let fixture: ComponentFixture<ChatList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService(),],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserProfile } from '@core/models/user.model';

import { ProfileEdit } from './profile-edit';

const profile: UserProfile = {
  id: '1',
  username: 'dems',
  email: 'dems@example.com',
  first_name: '',
  last_name: '',
  bio: '',
  avatarUrl: null,
  role: 'USER',
};

describe('ProfileEdit', () => {
  let component: ProfileEdit;
  let fixture: ComponentFixture<ProfileEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileEdit],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEdit);
    fixture.componentRef.setInput('profile', profile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

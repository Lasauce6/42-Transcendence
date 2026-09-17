import { TestBed } from '@angular/core/testing';

import { TwoFactor } from './two-factor';

describe('TwoFactor', () => {
  let service: TwoFactor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TwoFactor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

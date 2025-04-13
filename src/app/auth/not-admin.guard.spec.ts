import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { notAdminGuard } from './not-admin.guard';

describe('notAdminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => notAdminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

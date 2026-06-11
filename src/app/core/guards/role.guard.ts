import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../models';
import { AuthService } from '../services/auth.service';

export const roleGuard = (...roles: UserRole[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(...roles)) {
    return true;
  }
  return router.createUrlTree(['/app/ventas']);
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreService } from './store.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(StoreService);
  const router = inject(Router);
  if (store.usuario()) return true;
  return router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data['permission'] as string | undefined;
  const store = inject(StoreService);
  if (store.usuario() && (!permission || store.podeFazer(permission))) return true;
  return inject(Router).createUrlTree([store.usuario() ? '/app/dashboard' : '/login']);
};

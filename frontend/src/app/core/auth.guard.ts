import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreService } from './store.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(StoreService);
  const router = inject(Router);
  const usuario = store.usuario();
  const rotaMinhaConta = state.url === '/app/minha-conta' || state.url.startsWith('/app/minha-conta/');
  const perfilEmpresa = usuario?.tipo_conta === 'empresa' || usuario?.perfil === 'empresa';
  const perfilParticipante = usuario?.tipo_conta === 'participante' || usuario?.perfil === 'participante';
  if (perfilEmpresa && !state.url.startsWith('/app/parceiros') && !rotaMinhaConta) {
    return router.createUrlTree(['/app/parceiros']);
  }
  const rotaPortalParticipante = state.url === '/app/participante' || state.url.startsWith('/app/participante/');
  if (perfilParticipante && !rotaPortalParticipante && !rotaMinhaConta) {
    return router.createUrlTree(['/app/participante']);
  }
  if (usuario && state.url.startsWith('/app/parceiros') && !perfilEmpresa) {
    return router.createUrlTree(['/app/dashboard']);
  }
  if (usuario && rotaPortalParticipante && !perfilParticipante) {
    return router.createUrlTree(['/app/dashboard']);
  }
  if (usuario) return true;
  return router.createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data['permission'] as string | undefined;
  const store = inject(StoreService);
  if (store.usuario() && (!permission || store.podeFazer(permission))) return true;
  return inject(Router).createUrlTree([store.usuario() ? '/app/dashboard' : '/login']);
};

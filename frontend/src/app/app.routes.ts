import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guard';
import { AppShellComponent } from './layouts/app-shell.component';
import { OverviewComponent } from './pages/overview.component';
import { PublicComponent } from './pages/public.component';
import { RecordsComponent } from './pages/records.component';
import { MODULES, moduleConfig, type ModuleKey } from './pages/records.config';
import { ScoringComponent } from './pages/scoring.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  { path: 'publico', component: PublicComponent },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: OverviewComponent },
      {
        path: 'parceiros',
        loadComponent: () => import('./pages/partners.component').then((m) => m.PartnersComponent),
        data: { permission: 'parceiros.portal' },
      },
      {
        path: 'participante',
        loadComponent: () => import('./pages/participants.component').then((m) => m.ParticipantsComponent),
        data: { permission: 'participante.portal' },
      },
      {
        path: 'voluntario',
        loadComponent: () => import('./pages/volunteer.component').then((m) => m.VolunteerComponent),
        data: { permission: 'voluntario.portal' },
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/users.component').then((m) => m.UsersComponent),
        data: { permission: 'usuarios.gerenciar' },
      },
      { path: 'pontuar/:id', component: ScoringComponent },
      ...(Object.keys(MODULES) as ModuleKey[]).map((path) => ({
        path,
        component: RecordsComponent,
        data: { modulo: path, permission: moduleConfig(path).permission },
        runGuardsAndResolvers: 'always' as const,
      })),
    ],
  },
  { path: '**', redirectTo: '' },
];

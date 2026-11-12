import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guard';
import { AppShellComponent } from './layouts/app-shell.component';
import { LoginComponent } from './pages/login.component';
import { OverviewComponent } from './pages/overview.component';
import { PublicComponent } from './pages/public.component';
import { RecordsComponent } from './pages/records.component';
import { MODULES, moduleConfig, type ModuleKey } from './pages/records.config';
import { ScoringComponent } from './pages/scoring.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  { path: 'login', component: LoginComponent },
  { path: 'publico', component: PublicComponent },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: OverviewComponent },
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

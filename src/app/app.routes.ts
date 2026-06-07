import { Routes } from '@angular/router';
import { authGuard, roleRedirectGuard, adminGuard, funcionarioGuard } from './guards/auth-guard';

export const routes: Routes = [
  // Raíz → redirige según rol si está logueado
  { path: '', canActivate: [roleRedirectGuard], children: [] },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  // ADMIN routes
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard]
  },
  {
    path: 'editor',
    loadComponent: () =>
      import('./pages/editor/editor.component').then(m => m.EditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'editor/:id',
    loadComponent: () =>
      import('./pages/editor/editor.component').then(m => m.EditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./pages/reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [authGuard]
  },
  // FUNCIONARIO routes
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tarea/:id',
    loadComponent: () =>
      import('./pages/tarea-detalle/tarea-detalle.component').then(m => m.TareaDetalleComponent),
    canActivate: [authGuard]
  },
  // CLIENTE routes
  {
    path: 'cliente',
    loadComponent: () =>
      import('./pages/cliente-portal/cliente-portal.component').then(m => m.ClientePortalComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tramite/:id',
    loadComponent: () =>
      import('./pages/tramite-detalle/tramite-detalle.component').then(m => m.TramiteDetalleComponent),
    canActivate: [authGuard]
  },
  // Profile
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];

import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

// Rutas de navegacion y roles con acceso (Tabla 8 del Capitulo 2). /dashboard muestra el
// resumen de la flota al Administrador y al Supervisor, y la ruta asignada al Conductor.
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'camiones',
    canActivate: [roleGuard(['ADMINISTRADOR', 'SUPERVISOR'])],
    loadComponent: () => import('./pages/trucks/truck-list.component').then(m => m.TruckListComponent)
  },
  {
    path: 'conductores',
    canActivate: [roleGuard(['ADMINISTRADOR', 'SUPERVISOR'])],
    loadComponent: () => import('./pages/drivers/driver-list.component').then(m => m.DriverListComponent)
  },
  {
    path: 'rutas/nueva',
    canActivate: [roleGuard(['ADMINISTRADOR', 'SUPERVISOR'])],
    loadComponent: () => import('./pages/route-form/route-form.component').then(m => m.RouteFormComponent)
  },
  // La vista del conductor se muestra dentro de /dashboard (Tabla 8); se conserva el alias.
  { path: 'mi-ruta', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];

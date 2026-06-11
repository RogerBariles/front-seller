import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/ventas' },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      {
        path: 'caja',
        canActivate: [roleGuard('SELLER', 'ADMIN', 'SUPER_ADMIN')],
        loadComponent: () => import('./features/caja/caja.component').then(m => m.CajaComponent)
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/ventas/ventas.component').then(m => m.VentasComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos.component').then(m => m.ProductosComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN', 'SUPER_ADMIN')],
        loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'reportes',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent)
      },
      {
        path: 'empresas',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadComponent: () => import('./features/empresas/empresas.component').then(m => m.EmpresasComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'ventas' }
    ]
  },
  { path: '**', redirectTo: 'app/ventas' }
];

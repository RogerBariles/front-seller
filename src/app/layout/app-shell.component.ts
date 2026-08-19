import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/services/auth.service';
import { ROLE_LABELS } from '../models';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  roles?: string[];
}

interface NavGroup {
  icon: string;
  label: string;
  path: string;
  roles?: string[];
  children: NavItem[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private auth = inject(AuthService);
  readonly user = this.auth.currentUser;
  adminExpanded = signal(false);
  productosExpanded = signal(false);

  toggleAdmin(): void {
    this.adminExpanded.update(v => !v);
  }

  toggleProductos(): void {
    this.productosExpanded.update(v => !v);
  }

  readonly navItems = computed(() => {
    const role = this.user()?.role;
    const items: NavItem[] = [
      { label: 'Ventas', path: '/app/ventas', roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'], icon: 'shopping_cart'},
      { label: 'Caja y Turnos', path: '/app/caja', roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'], icon: 'payments'},
      { label: 'Reporte de ventas', path: '/app/reporte-ventas-individuales', roles: ['SELLER'], icon: 'assessment' },
      { label: 'Usuarios', path: '/app/usuarios', roles: ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'], icon: 'people' },
      { label: 'Empresas', path: '/app/empresas', roles: ['DEVELOPER'], icon: 'business' }
    ];
    return items.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

  readonly productosGroup = computed<NavGroup | null>(() => {
    const role = this.user()?.role;
    if (!role) return null;
    if (!['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return null;
    const children: NavItem[] = [
      { label: 'Precios', path: '/app/productos', icon: 'attach_money' }
    ];
    children.push({ label: 'Stock', path: '/app/stock', icon: 'inventory' });
    return {
      icon: 'inventory_2',
      label: 'Productos',
      path: '',
      children
    };
  });

  readonly adminGroup = computed<NavGroup | null>(() => {
    const role = this.user()?.role;
    if (!role) return null;
    if (!['SUPER_ADMIN'].includes(role)) return null;
    return {
      icon: 'analytics',
      label: 'Administración',
      path: '',
      children: [
        //{ label: 'Administración', path: '/app/administracion', icon: 'admin_panel_settings' },
        { label: 'Reporte de ventas', path: '/app/reporte-ventas', icon: 'assessment' },
        { label: 'Reporte de ventas ind.', path: '/app/reporte-ventas-individuales', icon: 'assessment' },
        { label: 'Tendencias de ventas', path: '/app/reporte-tendencias', icon: 'insights' },
        { label: 'Contabilidad', path: '/app/contabilidad', icon: 'account_balance' }
      ]
    };
  });

  roleLabel(role?: string): string {
    return role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : '';
  }

  logout(): void {
    this.auth.logout();
  }
}

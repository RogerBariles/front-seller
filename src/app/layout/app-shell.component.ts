import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, map } from 'rxjs/operators';
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
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private breakpoints = inject(BreakpointObserver);

  readonly user = this.auth.currentUser;
  adminExpanded = signal(false);
  productosExpanded = signal(false);

  readonly isHandset = toSignal(
    this.breakpoints.observe('(max-width: 959.98px)').pipe(map(r => r.matches)),
    { initialValue: false }
  );

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
    const url = this.router.url;
    if (url.startsWith('/app/productos') || url.startsWith('/app/stock')) {
      this.productosExpanded.set(true);
    }
    if (this.adminGroup()?.children.some(c => url.startsWith(c.path))) {
      this.adminExpanded.set(true);
    }
  }

  toggleAdmin(): void {
    this.adminExpanded.update(v => !v);
  }

  toggleProductos(): void {
    this.productosExpanded.update(v => !v);
  }

  readonly navItems = computed(() => {
    const role = this.user()?.role;
    const items: NavItem[] = [
      { label: 'Ventas', path: '/app/ventas', roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'], icon: 'point_of_sale'},
      { label: 'Caja y Turnos', path: '/app/caja', roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'], icon: 'payments'},
      { label: 'Reporte de ventas', path: '/app/reporte-ventas-individuales', roles: ['SELLER'], icon: 'assessment' },
      { label: 'Usuarios', path: '/app/usuarios', roles: ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'], icon: 'group' },
      { label: 'Empresas', path: '/app/empresas', roles: ['DEVELOPER'], icon: 'business' }
    ];
    return items.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

  readonly productosGroup = computed<NavGroup | null>(() => {
    const role = this.user()?.role;
    if (!role) return null;
    if (!['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return null;
    const children: NavItem[] = [
      { label: 'Precios', path: '/app/productos', icon: 'sell' }
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
        { label: 'Reporte de ventas ind.', path: '/app/reporte-ventas-individuales', icon: 'receipt_long' },
        { label: 'Tendencias de ventas', path: '/app/reporte-tendencias', icon: 'insights' },
        { label: 'Reporte de turno', path: '/app/reporte-turno', icon: 'schedule' },
        { label: 'Contabilidad', path: '/app/contabilidad', icon: 'account_balance' }
      ]
    };
  });

  /** Accesos rápidos para la barra inferior en mobile (máx. 4 + "Menú"). */
  readonly bottomNavItems = computed<NavItem[]>(() => {
    const flat = [
      ...this.navItems(),
      ...(this.productosGroup()?.children ?? [])
    ];
    const priority = ['/app/ventas', '/app/caja', '/app/stock', '/app/productos', '/app/usuarios', '/app/empresas'];
    const short: Record<string, string> = {
      '/app/caja': 'Caja',
      '/app/reporte-ventas-individuales': 'Reportes'
    };
    return priority
      .map(path => flat.find(i => i.path === path))
      .filter((i): i is NavItem => !!i)
      .slice(0, 4)
      .map(i => ({ ...i, label: short[i.path] ?? i.label }));
  });

  readonly pageTitle = computed(() => {
    const url = this.currentUrl() ?? '';
    const all = [
      ...this.navItems(),
      ...(this.productosGroup()?.children ?? []),
      ...(this.adminGroup()?.children ?? [])
    ].sort((a, b) => b.path.length - a.path.length);
    return all.find(i => url.startsWith(i.path))?.label ?? "Lo'Postigli";
  });

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase())
      .join('') || '?';
  });

  roleLabel(role?: string): string {
    return role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : '';
  }

  logout(): void {
    this.auth.logout();
  }
}

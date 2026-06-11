import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../core/services/auth.service';
import { ROLE_LABELS } from '../models';

interface NavItem {
  label: string;
  path: string;
  roles?: string[];
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

  readonly navItems = computed(() => {
    const role = this.user()?.role;
    const items: NavItem[] = [
      { label: 'Ventas', path: '/app/ventas' },
      { label: 'Caja y Turnos', path: '/app/caja', roles: ['SELLER', 'ADMIN', 'SUPER_ADMIN'] },
      { label: 'Productos', path: '/app/productos' },
      { label: 'Usuarios', path: '/app/usuarios', roles: ['ADMIN', 'SUPER_ADMIN'] },
      { label: 'Reportes', path: '/app/reportes', roles: ['SUPER_ADMIN'] },
      { label: 'Empresas', path: '/app/empresas', roles: ['SUPER_ADMIN'] }
    ];
    return items.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

  roleLabel(role?: string): string {
    return role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : '';
  }

  logout(): void {
    this.auth.logout();
  }
}

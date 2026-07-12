import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../core/services/auth.service';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let mockAuth: Partial<AuthService>;

  const mockUser = {
    id: '1',
    name: 'Test User',
    username: 'test',
    role: 'ADMIN' as const,
    active: true,
    companyId: 'c1',
    companyName: 'Test Co'
  };

  beforeEach(async () => {
    mockAuth = {
      currentUser: signal(mockUser) as any
    };

    await TestBed.configureTestingModule({
      imports: [
        AppShellComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: mockAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with productosExpanded as false', () => {
    expect(component.productosExpanded()).toBeFalse();
  });

  it('should toggle productosExpanded when toggleProductos is called', () => {
    expect(component.productosExpanded()).toBeFalse();
    component.toggleProductos();
    expect(component.productosExpanded()).toBeTrue();
    component.toggleProductos();
    expect(component.productosExpanded()).toBeFalse();
  });

  it('should toggle adminExpanded when toggleAdmin is called', () => {
    expect(component.adminExpanded()).toBeFalse();
    component.toggleAdmin();
    expect(component.adminExpanded()).toBeTrue();
    component.toggleAdmin();
    expect(component.adminExpanded()).toBeFalse();
  });

  it('should not include flat Productos in navItems', () => {
    const items = component.navItems();
    const productos = items.find(i => i.label === 'Productos');
    expect(productos).toBeUndefined();
  });

  it('should include Ventas in navItems', () => {
    const items = component.navItems();
    const ventas = items.find(i => i.label === 'Ventas');
    expect(ventas).toBeDefined();
    expect(ventas!.path).toBe('/app/ventas');
  });

  it('productosGroup should have Precios and Stock children', () => {
    const group = component.productosGroup();
    expect(group).not.toBeNull();
    expect(group!.children.length).toBeGreaterThanOrEqual(2);
    const precios = group!.children.find(c => c.label === 'Precios');
    expect(precios).toBeDefined();
    expect(precios!.path).toBe('/app/productos');
    const stock = group!.children.find(c => c.label === 'Stock');
    expect(stock).toBeDefined();
    expect(stock!.path).toBe('/app/stock');
  });

  it('productosGroup should have inventory_2 icon', () => {
    const group = component.productosGroup();
    expect(group!.icon).toBe('inventory_2');
  });

  it('productosGroup should have label Productos', () => {
    const group = component.productosGroup();
    expect(group!.label).toBe('Productos');
  });

  it('productosGroup should be null for ineligible role (DEVELOPER)', () => {
    const devUser = {
      id: '2',
      name: 'Dev User',
      username: 'dev',
      role: 'DEVELOPER' as const,
      active: true,
      companyId: 'c1',
      companyName: 'Test Co'
    };
    (mockAuth.currentUser as any).set(devUser);
    fixture.detectChanges();

    const group = component.productosGroup();
    expect(group).toBeNull();
  });
});

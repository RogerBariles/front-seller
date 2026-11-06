import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StockComponent } from './stock.component';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../models';
import { environment } from '../../../environments/environment';

describe('StockComponent', () => {
  let component: StockComponent;
  let fixture: ComponentFixture<StockComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StockComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty products', () => {
    expect(component.products().length).toBe(0);
  });

  it('should start with loading false before init', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should have displayedColumns with name, category, currentStock, actions', () => {
    expect(component.displayedColumns).toEqual(['name', 'currentStock', 'actions']);
  });

  it('should load products on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    flush();
    expect(component.products().length).toBe(0);
    expect(component.loading()).toBeFalse();
  }));

  describe('montos de costo y venta', () => {
    const mockProducts = [
      { id: '1', name: 'Torta Chocolate', category: 'TORTAS', price: 100, purchasePrice: 60, active: true, currentStock: 3 },
      { id: '2', name: 'Alfajor Simple', category: 'ALFAJORES', price: 50, purchasePrice: 20, active: true, currentStock: 2 },
      { id: '3', name: 'Torta Vainilla', category: 'TORTAS', price: 80, purchasePrice: 40, active: true }
    ];

    const renderAs = (role: UserRole): HTMLElement => {
      TestBed.inject(AuthService).currentUser.set({ role } as User);
      fixture = TestBed.createComponent(StockComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/products`).flush(mockProducts);
      flush();
      fixture.detectChanges();
      return fixture.nativeElement;
    };

    it('should show both amounts for ADMIN and SUPER_ADMIN', fakeAsync(() => {
      for (const role of ['ADMIN', 'SUPER_ADMIN'] as UserRole[]) {
        const text = renderAs(role).textContent;
        expect(text).toContain('Monto total de costo');
        expect(text).toContain('Monto total de venta');
      }
    }));

    it('should hide the amounts for SELLER', fakeAsync(() => {
      expect(renderAs('SELLER').textContent).not.toContain('Monto total');
    }));

    it('should multiply price by stock and follow the filter', fakeAsync(() => {
      renderAs('ADMIN');
      expect(component.totalCost()).toBe(220);
      expect(component.totalSale()).toBe(400);

      component.selectedCategories.set(['TORTAS']);
      expect(component.totalCost()).toBe(180);
      expect(component.totalSale()).toBe(300);
    }));
  });

  it('should show products without stock only when the check is on', fakeAsync(() => {
    const mockProducts = [
      { id: '1', name: 'Con stock', category: 'TORTAS', price: 100, active: true, currentStock: 3 },
      { id: '2', name: 'En cero', category: 'TORTAS', price: 100, active: true, currentStock: 0 },
      { id: '3', name: 'Sin dato', category: 'TORTAS', price: 100, active: true },
      { id: '4', name: 'Negativo', category: 'TORTAS', price: 100, active: true, currentStock: -2 }
    ];

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/products`).flush(mockProducts);
    flush();
    fixture.detectChanges();

    expect(component.showOutOfStock()).toBeFalse();
    expect(component.filteredProducts().map(p => p.id)).toEqual(['1']);

    fixture.nativeElement.querySelector('mat-checkbox input').click();
    fixture.detectChanges();

    expect(component.showOutOfStock()).toBeTrue();
    expect(component.filteredProducts().length).toBe(4);
  }));

  it('should render products in the table', fakeAsync(() => {
    const mockProducts = [
      { id: '1', name: 'Torta Chocolate', category: 'TORTAS', price: 100, active: true, currentStock: 15 },
      { id: '2', name: 'Alfajor Simple', category: 'ALFAJORES', price: 50, active: true, currentStock: 0 }
    ];

    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/products`).flush(mockProducts);
    flush();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(1);

    const firstRow = rows[0].textContent;
    expect(firstRow).toContain('Torta Chocolate');
    expect(firstRow).toContain('15');
  }));

  it('should show empty state when no products', fakeAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/products`).flush([]);
    flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay productos cargados');
  }));
});

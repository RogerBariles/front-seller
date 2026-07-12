import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StockComponent } from './stock.component';
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
    expect(rows.length).toBe(2);

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

import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FlujoCajaComponent } from './flujo-caja.component';
import { environment } from '../../../../environments/environment';
import { CashFlow } from '../../../models';

describe('FlujoCajaComponent', () => {
  let fixture: ComponentFixture<FlujoCajaComponent>;
  let httpMock: HttpTestingController;

  const cashFlow: CashFlow = {
    fromDate: '2026-11-05',
    toDate: '2026-12-05',
    receivables: [{ date: '2026-11-09', paymentMethod: 'TARJETA', amount: 1500 }],
    totalReceivable: 1500,
    payables: [{
      id: '1', detail: 'Alquiler', amount: 400, dueDate: '2026-11-01',
      status: 'PENDING', overdue: true, recurring: true
    }],
    totalPayable: 400,
    totalOverdue: 400,
    balance: 1100
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlujoCajaComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FlujoCajaComponent);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const expectLoad = (days: number) =>
    httpMock.expectOne(`${environment.apiUrl}/contabilidad/cash-flow?days=${days}`);

  it('should render receivables and overdue payables', fakeAsync(() => {
    fixture.detectChanges();
    expectLoad(30).flush(cashFlow);
    flush();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tarjeta');
    expect(text).toContain('Alquiler');
    expect(text).toContain('Vencida');
    expect(text).toContain('Gasto fijo');
  }));

  it('should reload when the period changes', fakeAsync(() => {
    fixture.detectChanges();
    expectLoad(30).flush(cashFlow);
    fixture.componentInstance.setDays(7);
    expectLoad(7).flush(cashFlow);
    flush();
    expect(fixture.componentInstance.days()).toBe(7);
  }));
});

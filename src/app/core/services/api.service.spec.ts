import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { StockAdjustRequest, StockPurchaseRequest } from '../../models';
import { environment } from '../../../environments/environment';

describe('ApiService (stock endpoints)', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getStock sends GET to /stock/product/{id}', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';
    const mockResponse = { productId, productName: 'Test Product', currentStock: 42 };

    service.getStock(productId).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/stock/product/${productId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getStockMovements sends GET to /stock/product/{id}/movements', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';
    const mockResponse = [
      { id: '1', quantityChange: 10, type: 'IN', referenceType: 'PURCHASE', notes: null, createdBy: 'User', createdAt: '2026-01-01T00:00:00Z' }
    ];

    service.getStockMovements(productId).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].quantityChange).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/stock/product/${productId}/movements`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('adjustStock sends POST to /stock/adjust with correct body', () => {
    const body: StockAdjustRequest = { productId: '123', quantityChange: -5, notes: 'Damaged' };
    const mockResponse = { productId: '123', productName: 'Test', currentStock: 45 };

    service.adjustStock(body).subscribe(res => {
      expect(res.currentStock).toBe(45);
    });

    const req = httpMock.expectOne(`${baseUrl}/stock/adjust`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('recordPurchase sends POST to /stock/purchase with correct body', () => {
    const body: StockPurchaseRequest = { productId: '123', quantity: 30, notes: 'Restock' };
    const mockResponse = { productId: '123', productName: 'Test', currentStock: 80 };

    service.recordPurchase(body).subscribe(res => {
      expect(res.currentStock).toBe(80);
    });

    const req = httpMock.expectOne(`${baseUrl}/stock/purchase`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('getStock handles 404 error', () => {
    const productId = 'nonexistent';

    service.getStock(productId).subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/stock/product/${productId}`);
    expect(req.request.method).toBe('GET');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
  });
});

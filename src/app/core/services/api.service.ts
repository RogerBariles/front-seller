import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  CashRegister,
  CashRegisterActive,
  CashRegisterSummary,
  CloseReport,
  Company,
  ContabilidadSummary,
  CreateExpenseRequest,
  CreateSaleRequest,
  ExpenseResponse,
  Product,
  PriceField,
  ProductCategory,
  ProductPriceAudit,
  Sale,
  SalesReport,
  TopStats,
  Shift,
  ShiftActive,
  ShiftSummary,
  CashMovementType,
  ShiftCashMovement,
  User
} from '../../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { username, password });
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  getSellers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users/sellers`);
  }

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.baseUrl}/companies`);
  }

  createCompany(body: Omit<Company, 'id'>): Observable<Company> {
    return this.http.post<Company>(`${this.baseUrl}/companies`, body);
  }

  updateCompany(id: string, body: Omit<Company, 'id'>): Observable<Company> {
    return this.http.put<Company>(`${this.baseUrl}/companies/${id}`, body);
  }

  createUser(body: Partial<User> & { password?: string }): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, body);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${id}`);
  }

  updateUser(id: string, body: Partial<User> & { password?: string }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, body);
  }

  getTodayCashRegister(): Observable<CashRegisterActive | null> {
    return this.http
      .get<CashRegisterActive>(`${this.baseUrl}/cash-registers/today`, { observe: 'response' })
      .pipe(map((res) => (res.status === 204 || res.body == null ? null : res.body)));
  }

  getTodayCashRegisterHistory(): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(`${this.baseUrl}/cash-registers/today/history`);
  }

  getActiveShift(): Observable<ShiftActive | null> {
    return this.http
      .get<ShiftActive>(`${this.baseUrl}/shifts/active`, { observe: 'response' })
      .pipe(map((res) => (res.status === 204 || res.body == null ? null : res.body)));
  }

  addShiftCashMovement(
    shiftId: string,
    body: { type: CashMovementType; amount: number; detail: string }
  ): Observable<ShiftCashMovement> {
    return this.http.post<ShiftCashMovement>(`${this.baseUrl}/shifts/${shiftId}/cash-movements`, body);
  }

  openCashRegister(initialCash: number): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.baseUrl}/cash-registers/open`, { initialCash });
  }

  closeCashRegister(id: string): Observable<CloseReport> {
    return this.http.post<CloseReport>(`${this.baseUrl}/cash-registers/${id}/close`, {});
  }

  startShift(): Observable<Shift> {
    return this.http.post<Shift>(`${this.baseUrl}/shifts/start`, {});
  }

  closeShift(id: string): Observable<CloseReport> {
    return this.http.post<CloseReport>(`${this.baseUrl}/shifts/${id}/close`, {});
  }

  getCashRegistersByDate(date: string, companyId?: string): Observable<CashRegisterSummary[]> {
    let params = new HttpParams().set('date', date);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<CashRegisterSummary[]>(`${this.baseUrl}/cash-registers/by-date`, { params });
  }

  getShiftsByDate(date: string, companyId?: string): Observable<ShiftSummary[]> {
    let params = new HttpParams().set('date', date);
    if (companyId) params = params.set('companyId', companyId);
    return this.http.get<ShiftSummary[]>(`${this.baseUrl}/shifts/by-date`, { params });
  }

  getCashRegisterReport(id: string): Observable<CloseReport> {
    return this.http.get<CloseReport>(`${this.baseUrl}/cash-registers/${id}/report`);
  }

  getShiftReport(id: string): Observable<CloseReport> {
    return this.http.get<CloseReport>(`${this.baseUrl}/shifts/${id}/report`);
  }

  listProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  searchProducts(q?: string, category?: ProductCategory): Observable<Product[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (category) params = params.set('category', category);
    return this.http.get<Product[]>(`${this.baseUrl}/products/search`, { params });
  }

  createProduct(body: Omit<Product, 'id' | 'updatedAt'>): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, body);
  }

  updateProduct(id: string, body: Omit<Product, 'id' | 'updatedAt'>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/products/${id}`, body);
  }

  bulkPriceIncrease(percentage: number, target: PriceField, category?: ProductCategory): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.baseUrl}/products/bulk-price-increase`, { percentage, target, category });
  }

  getProductAudits(id: string): Observable<ProductPriceAudit[]> {
    return this.http.get<ProductPriceAudit[]>(`${this.baseUrl}/products/${id}/audits`);
  }

  createSale(body: CreateSaleRequest): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseUrl}/sales`, body);
  }

  getSalesReport(params: Record<string, string>): Observable<SalesReport> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) httpParams = httpParams.set(key, value);
    });
    return this.http.get<SalesReport>(`${this.baseUrl}/reports/sales`, { params: httpParams });
  }

  getTopStats(params: Record<string, string>): Observable<TopStats> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) httpParams = httpParams.set(key, value);
    });
    return this.http.get<TopStats>(`${this.baseUrl}/reports/top-stats`, { params: httpParams });
  }

  getContabilidadSummary(params: Record<string, string>): Observable<ContabilidadSummary> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) httpParams = httpParams.set(key, value);
    });
    return this.http.get<ContabilidadSummary>(`${this.baseUrl}/contabilidad/summary`, { params: httpParams });
  }

  createExpense(body: CreateExpenseRequest): Observable<ExpenseResponse> {
    return this.http.post<ExpenseResponse>(`${this.baseUrl}/contabilidad/expenses`, body);
  }
}

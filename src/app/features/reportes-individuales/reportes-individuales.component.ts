import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Observable, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CATEGORY_LABELS, PAYMENT_LABELS, PaymentMethod, ProductCategory, Sale, SaleItem, SalesReport, TopStats, User } from '../../models';

export interface SaleProductRow {
  createdAt: string;
  sellerName: string;
  paymentMethod: PaymentMethod;
  installments?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  lineCost: number;
  lineProfit: number;
}

@Component({
  selector: 'app-reportes-individuales',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule
  ],
  templateUrl: './reportes-individuales.component.html',
  styleUrl: './reportes-individuales.component.scss'
})
export class ReportesIndividualesComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  sellers: User[] = [];
  report: SalesReport | null = null;
  topStats: TopStats | null = null;
  productRows: SaleProductRow[] = [];
  loading = false;
  readonly isSeller = this.auth.hasRole('SELLER');

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly displayedColumns = this.isSeller
    ? ['date', 'seller', 'product', 'quantity', 'payment', 'unitPrice', 'discount', 'total']
    : ['date', 'seller', 'product', 'quantity', 'payment', 'unitPrice', 'discount', 'total', 'cost', 'profit'];
  displayedTopColumns = ['position', 'product', 'quantity'];
  topDaysDisplayedColumns = ['position', 'date', 'quantity'];
  topSellersDisplayedColumns = ['position', 'seller', 'sales', 'amount'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentMethod: ['' as PaymentMethod | ''],
    sellerId: [''],
    category: ['' as ProductCategory | '']
  });

  ngOnInit(): void {
    if (this.isSeller) {
      const user = this.auth.currentUser();
      if (user?.id) {
        this.form.patchValue({ sellerId: user.id });
      }
      return;
    }
    this.api.getSellers().subscribe({
      next: (sellers) => this.sellers = sellers
    });
  }

  paymentLabel(method: PaymentMethod): string {
    return this.paymentLabels[method];
  }

  paymentAmount(method: PaymentMethod): number {
    return this.report?.amountByPaymentMethod?.[method] ?? 0;
  }

  private flattenSaleProducts(sales: Sale[]): SaleProductRow[] {
    return sales.flatMap((sale) =>
      (sale.items ?? []).map((item: SaleItem) => ({
        createdAt: sale.createdAt,
        sellerName: sale.sellerName,
        paymentMethod: sale.paymentMethod,
        installments: sale.installments,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
        lineCost: item.lineCost,
        lineProfit: item.lineProfit
      }))
    );
  }

  search(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.getRawValue();
    const params: Record<string, string> = {
      fromDate: v.fromDate,
      toDate: v.toDate
    };
    if (v.paymentMethod) params['paymentMethod'] = v.paymentMethod;
    if (v.category) params['category'] = v.category;

    const user = this.auth.currentUser();
    if (this.isSeller && user?.id) {
      params['sellerId'] = user.id;
    } else if (v.sellerId) {
      params['sellerId'] = v.sellerId;
    }
    if (user?.companyId) params['companyId'] = user.companyId;

    const topStats$: Observable<TopStats | null> = this.isSeller
      ? of(null)
      : this.api.getTopStats(params);

    forkJoin({
      report: this.api.getSalesReport(params),
      topStats: topStats$
    }).subscribe({
      next: ({ report, topStats }) => {
        this.report = report;
        this.topStats = topStats;
        this.productRows = this.flattenSaleProducts(report.sales ?? []);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

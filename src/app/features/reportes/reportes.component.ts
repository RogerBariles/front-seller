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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { Company, PAYMENT_LABELS, PaymentMethod, Sale, SalesReport, TopStats, User } from '../../models';
import { SaleDetailDialogComponent } from './sale-detail-dialog/sale-detail-dialog.component';

@Component({
  selector: 'app-reportes',
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
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  sellers: User[] = [];
  companies: Company[] = [];
  report: SalesReport | null = null;
  topStats: TopStats | null = null;
  loading = false;

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  displayedColumns = ['date', 'seller', 'payment', 'subtotal', 'discount', 'total', 'cost', 'profit', 'actions'];
  displayedTopColumns = ['position', 'product', 'quantity'];
  topDaysDisplayedColumns = ['position', 'date', 'quantity'];
  topSellersDisplayedColumns = ['position', 'seller', 'sales', 'amount'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentMethod: ['' as PaymentMethod | ''],
    sellerId: [''],
    companyId: ['']
  });

  ngOnInit(): void {
    this.api.getSellers().subscribe({
      next: (sellers) => this.sellers = sellers
    });
    this.api.getCompanies().subscribe({
      next: (companies) => this.companies = companies
    });
  }

  paymentLabel(method: PaymentMethod): string {
    return this.paymentLabels[method];
  }

  paymentAmount(method: PaymentMethod): number {
    return this.report?.amountByPaymentMethod?.[method] ?? 0;
  }

  openSaleDetail(sale: Sale): void {
    this.dialog.open(SaleDetailDialogComponent, {
      data: sale,
      width: '760px',
      maxWidth: '95vw'
    });
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
    if (v.sellerId) params['sellerId'] = v.sellerId;
    if (v.companyId) params['companyId'] = v.companyId;

    forkJoin({
      report: this.api.getSalesReport(params),
      topStats: this.api.getTopStats(params)
    }).subscribe({
      next: ({ report, topStats }) => {
        this.report = report;
        this.topStats = topStats;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

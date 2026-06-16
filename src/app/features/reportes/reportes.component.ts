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
import { ApiService } from '../../core/services/api.service';
import { Company, PAYMENT_LABELS, PaymentMethod, SalesReport, User } from '../../models';

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
    MatSnackBarModule
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  sellers: User[] = [];
  companies: Company[] = [];
  report: SalesReport | null = null;
  loading = false;

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  displayedColumns = ['date', 'seller', 'payment', 'subtotal', 'discount', 'total', 'cost', 'profit'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    fromTime: [''],
    toTime: [''],
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

  search(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.getRawValue();
    const params: Record<string, string> = {
      fromDate: v.fromDate,
      toDate: v.toDate
    };
    if (v.fromTime) params['fromTime'] = v.fromTime;
    if (v.toTime) params['toTime'] = v.toTime;
    if (v.paymentMethod) params['paymentMethod'] = v.paymentMethod;
    if (v.sellerId) params['sellerId'] = v.sellerId;
    if (v.companyId) params['companyId'] = v.companyId;

    this.api.getSalesReport(params).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

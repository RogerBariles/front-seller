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
import { AuthService } from '../../core/services/auth.service';
import { CATEGORY_LABELS, PAYMENT_LABELS, PaymentMethod, ProductCategory, Sale, SalesReport, TopStats, User } from '../../models';
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
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  sellers: User[] = [];
  report: SalesReport | null = null;
  topStats: TopStats | null = null;
  loading = false;

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;
  displayedColumns = ['date', 'seller', 'payment', 'subtotal', 'discount', 'total', 'cost', 'profit', 'actions'];
  displayedTopColumns = ['position', 'product', 'quantity'];
  topDaysDisplayedColumns = ['position', 'date', 'quantity'];
  topSellersDisplayedColumns = ['position', 'seller', 'sales', 'amount'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentMethod: [[] as PaymentMethod[]],
    sellerId: [''],
    category: [[] as ProductCategory[]]
  });

  ngOnInit(): void {
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

  allPaymentMethodsSelected(): boolean {
    return this.selectedPaymentMethods().length === this.paymentMethods.length;
  }

  toggleAllPaymentMethods(event?: { isUserInput: boolean }): void {
    if (event && !event.isUserInput) return;
    this.form.controls.paymentMethod.setValue(
      this.allPaymentMethodsSelected() ? [] : [...this.paymentMethods]
    );
  }

  paymentMethodTriggerLabel(): string {
    const selected = this.selectedPaymentMethods();
    if (selected.length === 0 || selected.length === this.paymentMethods.length) {
      return 'Todas';
    }
    if (selected.length === 1) {
      return this.paymentLabels[selected[0]];
    }
    return `${selected.length} formas de pago`;
  }

  private selectedPaymentMethods(): PaymentMethod[] {
    return this.form.controls.paymentMethod.value.filter((method): method is PaymentMethod =>
      this.paymentMethods.includes(method));
  }

  allCategoriesSelected(): boolean {
    return this.selectedCategories().length === this.categories.length;
  }

  toggleAllCategories(event?: { isUserInput: boolean }): void {
    if (event && !event.isUserInput) return;
    this.form.controls.category.setValue(this.allCategoriesSelected() ? [] : [...this.categories]);
  }

  categoryTriggerLabel(): string {
    const selected = this.selectedCategories();
    if (selected.length === 0 || selected.length === this.categories.length) {
      return 'Todas';
    }
    if (selected.length === 1) {
      return this.categoryLabels[selected[0]];
    }
    return `${selected.length} categorías`;
  }

  private selectedCategories(): ProductCategory[] {
    return this.form.controls.category.value.filter((cat): cat is ProductCategory =>
      this.categories.includes(cat));
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
    const params: Record<string, string | string[]> = {
      fromDate: v.fromDate,
      toDate: v.toDate
    };
    if (v.sellerId) params['sellerId'] = v.sellerId;
    const selectedPaymentMethods = this.selectedPaymentMethods();
    if (selectedPaymentMethods.length > 0 && selectedPaymentMethods.length < this.paymentMethods.length) {
      params['paymentMethod'] = selectedPaymentMethods;
    }
    const categories = this.selectedCategories();
    if (categories.length > 0 && categories.length < this.categories.length) {
      params['category'] = categories;
    }

    const user = this.auth.currentUser();
    if (user?.companyId) params['companyId'] = user.companyId;

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

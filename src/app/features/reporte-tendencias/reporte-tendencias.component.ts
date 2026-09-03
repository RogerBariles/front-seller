import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CATEGORY_LABELS, PAYMENT_LABELS, PaymentMethod, ProductCategory, User } from '../../models';
import {
  SalesTrendAnalysis,
  TrendMetric,
  TrendPoint,
  addDaysYmd,
  analyzeSales,
  metricValue,
  rankedPoints,
  todayYmd
} from './sales-trend.util';

interface LineChartPoint {
  x: number;
  y: number;
  label: string;
  value: string;
  isBest: boolean;
}

interface LineChartModel {
  viewBox: string;
  area: string;
  line: string;
  points: LineChartPoint[];
  yLabels: { y: number; text: string }[];
  xLabels: { x: number; text: string }[];
  gridYs: number[];
}

interface BarView {
  point: TrendPoint;
  pct: number;
  isBest: boolean;
}

@Component({
  selector: 'app-reporte-tendencias',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './reporte-tendencias.component.html',
  styleUrl: './reporte-tendencias.component.scss'
})
export class ReporteTendenciasComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  sellers: User[] = [];
  analysis: SalesTrendAnalysis | null = null;
  loading = false;
  metric: TrendMetric = 'amount';

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly rankingColumns = ['position', 'label', 'sales', 'amount', 'profit'];

  form = this.fb.nonNullable.group({
    fromDate: [addDaysYmd(todayYmd(), -29), Validators.required],
    toDate: [todayYmd(), Validators.required],
    paymentMethod: [[] as PaymentMethod[]],
    sellerId: [''],
    category: [[] as ProductCategory[]]
  });

  ngOnInit(): void {
    this.api.getSellers().subscribe({
      next: (sellers) => this.sellers = sellers
    });
    this.search();
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

  applyPreset(days: number): void {
    const toDate = todayYmd();
    this.form.patchValue({
      fromDate: addDaysYmd(toDate, -(days - 1)),
      toDate
    });
    this.search();
  }

  applyMonth(): void {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    this.form.patchValue({
      fromDate: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`,
      toDate: todayYmd()
    });
    this.search();
  }

  search(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.fromDate > v.toDate) {
      this.snack.open('La fecha desde no puede ser mayor a la fecha hasta', 'Cerrar', { duration: 4000 });
      return;
    }

    this.loading = true;
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

    this.api.getSalesReport(params).subscribe({
      next: (report) => {
        this.analysis = analyzeSales(report.sales ?? [], v.fromDate, v.toDate);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.analysis = null;
        this.snack.open(err.error?.message || 'Error al cargar el reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }

  setMetric(metric: TrendMetric | string): void {
    if (metric === 'amount' || metric === 'salesCount') {
      this.metric = metric;
    }
  }

  get dailyChart(): LineChartModel | null {
    if (!this.analysis) return null;
    return this.buildLineChart(this.analysis.daily);
  }

  get weekdayBars(): BarView[] {
    return this.toBars(this.analysis?.weekday ?? []);
  }

  get weeklyBars(): BarView[] {
    return this.toBars(this.analysis?.weekly ?? []);
  }

  get hourlyBars(): BarView[] {
    const hours = (this.analysis?.hourly ?? []).filter((point) => point.salesCount > 0);
    return this.toBars(hours.length ? hours : this.analysis?.hourly ?? []);
  }

  get rankedDays(): TrendPoint[] {
    return this.analysis ? rankedPoints(this.analysis.daily, this.metric, 10) : [];
  }

  get rankedWeeks(): TrendPoint[] {
    return this.analysis ? rankedPoints(this.analysis.weekly, this.metric, 10) : [];
  }

  barHeight(bar: BarView): string {
    return `${Math.max(bar.pct, bar.point.salesCount > 0 ? 4 : 0)}%`;
  }

  tooltip(point: TrendPoint): string {
    const amount = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(point.amount);
    return `${point.label}\n${point.salesCount} ventas\n${amount}`;
  }

  private selectedCategories(): ProductCategory[] {
    return this.form.controls.category.value.filter((cat): cat is ProductCategory =>
      this.categories.includes(cat));
  }

  private toBars(points: TrendPoint[]): BarView[] {
    const max = Math.max(...points.map((point) => metricValue(point, this.metric)), 0);
    const bestKey = max <= 0
      ? null
      : points.reduce((best, point) => metricValue(point, this.metric) > metricValue(best, this.metric) ? point : best).key;
    return points.map((point) => ({
      point,
      pct: max > 0 ? (metricValue(point, this.metric) / max) * 100 : 0,
      isBest: point.key === bestKey && metricValue(point, this.metric) > 0
    }));
  }

  private buildLineChart(points: TrendPoint[]): LineChartModel {
    const width = 800;
    const height = 240;
    const pad = { top: 24, right: 16, bottom: 36, left: 56 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    if (!points.length) {
      return { viewBox: `0 0 ${width} ${height}`, area: '', line: '', points: [], yLabels: [], xLabels: [], gridYs: [] };
    }
    const values = points.map((point) => metricValue(point, this.metric));
    const max = Math.max(...values, 1);
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;
    const coords = points.map((point, index) => {
      const x = pad.left + (points.length === 1 ? innerW / 2 : index * step);
      const y = pad.top + innerH - (metricValue(point, this.metric) / max) * innerH;
      return { x, y, point };
    });
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const area = `${line} L${(coords.at(-1)?.x ?? pad.left).toFixed(1)} ${(pad.top + innerH).toFixed(1)} L${pad.left.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
    const bestValue = Math.max(...values);
    const labelEvery = Math.max(1, Math.ceil(points.length / 8));

    return {
      viewBox: `0 0 ${width} ${height}`,
      area,
      line,
      points: coords.map(({ x, y, point }) => ({
        x,
        y,
        label: point.label,
        value: this.metric === 'amount'
          ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(point.amount)
          : `${point.salesCount} ventas`,
        isBest: metricValue(point, this.metric) === bestValue && bestValue > 0
      })),
      yLabels: [0, 0.5, 1].map((ratio) => ({
        y: pad.top + innerH - ratio * innerH,
        text: this.formatAxis(max * ratio)
      })),
      xLabels: points.flatMap((point, index) => {
        if (index % labelEvery !== 0 && index !== points.length - 1) return [];
        return [{ x: coords[index].x, text: point.label.replace(/^[A-Za-záéíóú]{3}\s/, '') }];
      }),
      gridYs: [0, 0.5, 1].map((ratio) => pad.top + innerH - ratio * innerH)
    };
  }

  private formatAxis(value: number): string {
    if (this.metric === 'salesCount') return String(Math.round(value));
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1000)}k`;
    return `$${Math.round(value)}`;
  }
}

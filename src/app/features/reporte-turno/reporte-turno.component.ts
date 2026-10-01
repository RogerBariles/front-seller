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
import { AuthService } from '../../core/services/auth.service';
import { ShiftHoursReport, ShiftHoursRow, ShiftStatus, User } from '../../models';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

interface ShiftPaySummary {
  totalMinutes: number;
  totalAmount: number;
  weekdayMinutes: number;
  weekdayAmount: number;
  weekendMinutes: number;
  weekendAmount: number;
}

@Component({
  selector: 'app-reporte-turno',
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
  templateUrl: './reporte-turno.component.html',
  styleUrl: './reporte-turno.component.scss'
})
export class ReporteTurnoComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  sellers: User[] = [];
  report: ShiftHoursReport | null = null;
  summary: ShiftPaySummary | null = null;
  loading = false;

  displayedColumns = ['startedAt', 'endedAt', 'status', 'duration', 'hourlyRate', 'amount'];

  private appliedWeekdayRate = 0;
  private appliedWeekendRate = 0;

  form = this.fb.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    sellerId: ['', Validators.required],
    weekdayRate: [null as number | null, [Validators.required, Validators.min(0)]],
    weekendRate: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    const companyId = this.auth.currentUser()?.companyId;
    this.api.getSellers().subscribe({
      next: (sellers) => {
        this.sellers = companyId
          ? sellers.filter(s => s.companyId === companyId)
          : sellers;
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'Error al cargar vendedoras', 'Cerrar', { duration: 4000 });
      }
    });
  }

  statusLabel(status: ShiftStatus): string {
    return status === 'OPEN' ? 'Abierto' : 'Cerrado';
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  hourlyRate(shift: ShiftHoursRow): number {
    return this.isWeekend(shift.startedAt) ? this.appliedWeekendRate : this.appliedWeekdayRate;
  }

  rateLabel(shift: ShiftHoursRow): string {
    return this.isWeekend(shift.startedAt) ? 'Fin de semana' : 'Semana';
  }

  shiftAmount(shift: ShiftHoursRow): number {
    return (shift.durationMinutes / 60) * this.hourlyRate(shift);
  }

  search(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.getRawValue();
    const weekdayRate = Number(v.weekdayRate);
    const weekendRate = Number(v.weekendRate);
    const params: Record<string, string> = {
      fromDate: v.fromDate ?? '',
      toDate: v.toDate ?? '',
      sellerId: v.sellerId ?? ''
    };

    this.api.getShiftHoursReport(params).subscribe({
      next: (report) => {
        this.appliedWeekdayRate = weekdayRate;
        this.appliedWeekendRate = weekendRate;
        this.report = report;
        this.summary = this.buildSummary(report);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private isWeekend(startedAt: string): boolean {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: ARGENTINA_TIME_ZONE,
      weekday: 'short'
    }).format(new Date(startedAt));
    return weekday === 'Sat' || weekday === 'Sun';
  }

  private buildSummary(report: ShiftHoursReport): ShiftPaySummary {
    return report.shifts.reduce<ShiftPaySummary>((summary, shift) => {
      const amount = this.shiftAmount(shift);
      summary.totalMinutes += shift.durationMinutes;
      summary.totalAmount += amount;
      if (this.isWeekend(shift.startedAt)) {
        summary.weekendMinutes += shift.durationMinutes;
        summary.weekendAmount += amount;
      } else {
        summary.weekdayMinutes += shift.durationMinutes;
        summary.weekdayAmount += amount;
      }
      return summary;
    }, {
      totalMinutes: 0,
      totalAmount: 0,
      weekdayMinutes: 0,
      weekdayAmount: 0,
      weekendMinutes: 0,
      weekendAmount: 0
    });
  }
}

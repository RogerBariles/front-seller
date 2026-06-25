import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ClosePrintDialogComponent } from '../close-print-dialog/close-print-dialog.component';
import { ApiService } from '../../../core/services/api.service';
import { CashRegisterSummary, CloseReport, ShiftSummary } from '../../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-caja-turno-reporte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './caja-turno-reporte.component.html',
  styleUrl: './caja-turno-reporte.component.scss'
})
export class CajaTurnoReporteComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  cashRegisters: CashRegisterSummary[] = [];
  shifts: ShiftSummary[] = [];
  loading = false;
  isSuperAdmin = false;

  readonly cashRegisterColumns = ['openedAt', 'closedAt', 'openedBy', 'status', 'sales', 'total', 'actions'];
  readonly shiftColumns = ['startedAt', 'endedAt', 'seller', 'status', 'sales', 'total', 'actions'];

  stateChanged = output<void>();

  form = this.fb.nonNullable.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const date = this.form.getRawValue().date;
    let pending = 2;
    const done = () => {
      pending--;
      if (pending === 0) this.loading = false;
    };
    this.api.getCashRegistersByDate(date).subscribe({
      next: (rows) => {
        this.cashRegisters = rows;
        done();
      },
      error: () => {
        this.cashRegisters = [];
        this.snack.open('No se pudieron cargar las cajas', 'Cerrar', { duration: 4000 });
        done();
      }
    });
    this.api.getShiftsByDate(date).subscribe({
      next: (rows) => {
        this.shifts = rows;
        done();
      },
      error: () => {
        this.shifts = [];
        this.snack.open('No se pudieron cargar los turnos', 'Cerrar', { duration: 4000 });
        done();
      }
    });
  }

  viewCashRegister(row: CashRegisterSummary): void {
    this.api.getCashRegisterReport(row.id).subscribe({
      next: (report) => this.openDetailDialog(report),
      error: () => this.snack.open('No se pudo cargar el detalle', 'Cerrar', { duration: 4000 })
    });
  }

  viewShift(row: ShiftSummary): void {
    this.api.getShiftReport(row.id).subscribe({
      next: (report) => this.openDetailDialog(report),
      error: () => this.snack.open('No se pudo cargar el detalle', 'Cerrar', { duration: 4000 })
    });
  }

  closeCashRegister(row: CashRegisterSummary): void {
    if (row.status !== 'OPEN') return;
    this.loading = true;
    this.api.closeCashRegister(row.id).subscribe({
      next: (report) => {
        this.loading = false;
        this.openDetailDialog(report);
        this.load();
        this.stateChanged.emit();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo cerrar la caja', 'Cerrar', { duration: 5000 });
      }
    });
  }

  closeShift(row: ShiftSummary): void {
    if (row.status !== 'OPEN') return;
    this.loading = true;
    this.api.closeShift(row.id).subscribe({
      next: (report) => {
        this.loading = false;
        this.openDetailDialog(report);
        this.load();
        this.stateChanged.emit();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo cerrar el turno', 'Cerrar', { duration: 5000 });
      }
    });
  }

  statusLabel(status: 'OPEN' | 'CLOSED'): string {
    return status === 'OPEN' ? 'Abierto' : 'Cerrado';
  }

  private openDetailDialog(report: CloseReport): void {
    this.dialog.open(ClosePrintDialogComponent, {
      data: report,
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'sale-print-dialog-panel'
    });
  }
}

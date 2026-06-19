import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { CashRegisterActive, CloseReport, ShiftActive, CASH_MOVEMENT_LABELS } from '../../models';
import { ClosePrintDialogComponent } from './close-print-dialog/close-print-dialog.component';
import { CajaTurnoReporteComponent } from './caja-turno-reporte/caja-turno-reporte.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-caja',
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
    MatSnackBarModule,
    MatDialogModule,
    CajaTurnoReporteComponent,
  ],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss'
})
export class CajaComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly movementLabels = CASH_MOVEMENT_LABELS;
  readonly movementTypes = ['INCOME', 'WITHDRAWAL'] as const;

  registerActive: CashRegisterActive | null = null;
  closedTodayCount = 0;
  shiftActive: ShiftActive | null = null;
  lastReport: CloseReport | null = null;
  loading = false;
  loadError = false;

  openForm = this.fb.nonNullable.group({
    initialCash: [0, [Validators.required, Validators.min(0)]]
  });

  movementForm = this.fb.nonNullable.group({
    type: ['INCOME' as const, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    detail: ['', [Validators.required, Validators.maxLength(500)]]
  });
  
  isSuperAdmin = false;

  constructor(private auth: AuthService) {
    this.isSuperAdmin = this.auth.hasRole('SUPER_ADMIN');
  }
  
  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadError = false;
    this.api.getTodayCashRegister().subscribe({
      next: (active) => this.registerActive = active,
      error: () => {
        this.registerActive = null;
        this.loadError = true;
      }
    });
    this.api.getTodayCashRegisterHistory().subscribe({
      next: (history) => {
        this.closedTodayCount = history.filter(cr => cr.status === 'CLOSED').length;
      }
    });
    this.api.getActiveShift().subscribe({
      next: (active) => this.shiftActive = active,
      error: () => this.shiftActive = null
    });
  }

  openCashRegister(): void {
    if (this.openForm.invalid) return;
    this.loading = true;
    this.api.openCashRegister(this.openForm.getRawValue().initialCash).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Caja abierta correctamente', 'Cerrar', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.loading = false;
        const message = err.error?.message || 'No se pudo abrir la caja';
        this.snack.open(message, 'Cerrar', { duration: 5000 });
        this.refresh();
      }
    });
  }

  startShift(): void {
    this.loading = true;
    this.api.startShift().subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Turno iniciado. Ya puede vender.', 'Cerrar', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo iniciar el turno', 'Cerrar', { duration: 4000 });
      }
    });
  }

  addCashMovement(): void {
    if (!this.shiftActive || this.movementForm.invalid) return;
    this.loading = true;
    const shiftId = this.shiftActive.shift.id;
    this.api.addShiftCashMovement(shiftId, this.movementForm.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.movementForm.patchValue({ amount: 0, detail: '' });
        this.snack.open('Movimiento registrado', 'Cerrar', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo registrar el movimiento', 'Cerrar', { duration: 4000 });
      }
    });
  }

  closeShift(): void {
    if (!this.shiftActive) return;
    this.loading = true;
    this.api.closeShift(this.shiftActive.shift.id).subscribe({
      next: (report) => {
        this.lastReport = report;
        this.shiftActive = null;
        this.loading = false;
        this.openClosePrintDialog(report);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo cerrar el turno', 'Cerrar', { duration: 4000 });
      }
    });
  }

  closeCashRegister(): void {
    if (!this.registerActive) return;
    this.loading = true;
    this.api.closeCashRegister(this.registerActive.cashRegister.id).subscribe({
      next: (report) => {
        this.lastReport = report;
        this.registerActive = {
          ...this.registerActive!,
          cashRegister: { ...this.registerActive!.cashRegister, status: 'CLOSED' }
        };
        this.loading = false;
        this.openClosePrintDialog(report);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo cerrar la caja', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private openClosePrintDialog(report: CloseReport): void {
    this.dialog.open(ClosePrintDialogComponent, {
      data: report,
      width: '270px',
      maxWidth: '95vw',
      panelClass: 'sale-print-dialog-panel'
    }).afterClosed().subscribe(() => {
      this.refresh();
    });
  }
}

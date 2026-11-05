import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../../core/services/api.service';
import { CashFlow, PAYMENT_LABELS, Payable, PaymentMethod } from '../../../models';
import { PayPayableDialogComponent } from './pay-payable-dialog.component';
import { PayableDialogComponent } from './payable-dialog.component';
import { RecurringPayablesDialogComponent } from './recurring-payables-dialog.component';

@Component({
  selector: 'app-flujo-caja',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './flujo-caja.component.html',
  styleUrl: './flujo-caja.component.scss'
})
export class FlujoCajaComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  /** Avisa que un pago cambió los egresos del período. */
  changed = output<void>();

  readonly dayOptions = [7, 15, 30];
  readonly receivableColumns = ['date', 'method', 'amount'];
  readonly payableColumns = ['dueDate', 'detail', 'amount', 'actions'];

  days = signal(30);
  cashFlow = signal<CashFlow | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  setDays(days: number): void {
    this.days.set(days);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getCashFlow(this.days()).subscribe({
      next: (data) => {
        this.cashFlow.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(err.error?.message || 'Error al cargar el flujo de caja', 'Cerrar', { duration: 4000 });
      }
    });
  }

  openPayableDialog(): void {
    this.reloadAfter(this.dialog.open(PayableDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'responsive-dialog'
    }));
  }

  openRecurringDialog(): void {
    this.reloadAfter(this.dialog.open(RecurringPayablesDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'responsive-dialog'
    }));
  }

  pay(payable: Payable): void {
    const ref = this.dialog.open(PayPayableDialogComponent, {
      data: payable,
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'responsive-dialog'
    });
    ref.afterClosed().subscribe((paid) => {
      if (paid) {
        this.load();
        this.changed.emit();
      }
    });
  }

  cancel(payable: Payable): void {
    if (!confirm(`¿Cancelar "${payable.detail}"? No se va a registrar ningún egreso.`)) return;
    this.api.cancelPayable(payable.id).subscribe({
      next: () => {
        this.snack.open('Cuenta cancelada', 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'No se pudo cancelar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  paymentLabel(method: PaymentMethod): string {
    return PAYMENT_LABELS[method];
  }

  private reloadAfter(ref: { afterClosed(): { subscribe(next: () => void): unknown } }): void {
    ref.afterClosed().subscribe(() => this.load());
  }
}

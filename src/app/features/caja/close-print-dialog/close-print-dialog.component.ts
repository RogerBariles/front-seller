import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CASH_MOVEMENT_LABELS, CloseReport, PAYMENT_LABELS, PaymentMethod } from '../../../models';

const CLOSE_PAYMENT_METHODS: PaymentMethod[] = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'PEDIDOSYA',
  'DEBITO',
  'QR'
];

const CLOSE_PAYMENT_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'EFECT.',
  TARJETA: 'TARJ.',
  TRANSFERENCIA: 'TRANSF.',
  PEDIDOSYA: 'PEDIDOS YA',
  DEBITO: 'DEBITO',
  QR: 'QR'
};

@Component({
  selector: 'app-close-print-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule],
  templateUrl: './close-print-dialog.component.html',
  styleUrl: './close-print-dialog.component.scss'
})
export class ClosePrintDialogComponent {
  readonly movementLabels = CASH_MOVEMENT_LABELS;
  readonly paymentMethods = CLOSE_PAYMENT_METHODS;
  readonly paymentLabels = PAYMENT_LABELS;
  readonly receiptPaymentLabels = CLOSE_PAYMENT_LABELS;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly report: CloseReport,
    private dialogRef: MatDialogRef<ClosePrintDialogComponent>
  ) {}

  get isShift(): boolean {
    return this.report.type === 'SHIFT';
  }

  paymentAmount(method: PaymentMethod): number {
    const totals = this.report.paymentTotals;
    switch (method) {
      case 'EFECTIVO': return totals.cash ?? 0;
      case 'TARJETA': return totals.card ?? 0;
      case 'TRANSFERENCIA': return totals.transfer ?? 0;
      case 'PEDIDOSYA': return totals.pedidosYa ?? 0;
      case 'DEBITO': return totals.debito ?? 0;
      case 'QR': return totals.qr ?? 0;
    }
  }

  print(): void {
    setTimeout(() => {
      window.print();
    }, 100);
  }

  close(): void {
    this.dialogRef.close();
  }
}

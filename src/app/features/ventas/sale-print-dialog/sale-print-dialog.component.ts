import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PAYMENT_LABELS, Sale } from '../../../models';

@Component({
  selector: 'app-sale-print-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule],
  templateUrl: './sale-print-dialog.component.html',
  styleUrl: './sale-print-dialog.component.scss'
})
export class SalePrintDialogComponent {
  readonly paymentLabels = PAYMENT_LABELS;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly sale: Sale,
    private dialogRef: MatDialogRef<SalePrintDialogComponent>
  ) {}

  print(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}

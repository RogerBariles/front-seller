import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { PAYMENT_LABELS, Sale } from '../../../models';

@Component({
  selector: 'app-sale-detail-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatTableModule],
  templateUrl: './sale-detail-dialog.component.html',
  styleUrl: './sale-detail-dialog.component.scss'
})
export class SaleDetailDialogComponent {
  readonly paymentLabels = PAYMENT_LABELS;
  readonly itemColumns = ['product', 'qty', 'unitPrice', 'unitRealPrice', 'purchase', 'discount', 'lineTotal', 'profit'];

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly sale: Sale,
    private dialogRef: MatDialogRef<SaleDetailDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}

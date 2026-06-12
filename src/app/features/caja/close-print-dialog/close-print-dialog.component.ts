import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CloseReport } from '../../../models';

@Component({
  selector: 'app-close-print-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule],
  templateUrl: './close-print-dialog.component.html',
  styleUrl: './close-print-dialog.component.scss'
})
export class ClosePrintDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) readonly report: CloseReport,
    private dialogRef: MatDialogRef<ClosePrintDialogComponent>
  ) {}

  get isShift(): boolean {
    return this.report.type === 'SHIFT';
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

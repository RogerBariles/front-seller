import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PAYMENT_LABELS, Sale } from '../../../models';

const RECEIPT_PRINT_STYLES = `
  @page { size: 58mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #fff; color: #000; }
  .receipt {
    width: 44mm;
    max-width: 44mm;
    margin: 0 auto;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    font-weight: 600;
    line-height: 1.3;
     margin-left: -2px;
  }
  .store-name { margin: 0; font-size: 20px; font-weight: 600; text-align: center; }
  .receipt-title { margin: 4px 0 0; font-size: 9.5px; text-align: center; }
  .receipt-divider { border-top: 1px dashed #000; margin: 5px 0; }
  .receipt-meta p, .receipt-totals p, .item-detail {
    display: flex; justify-content: space-between; gap: 3px; margin: 2px 0; word-break: break-word;
  }
  .receipt-meta span, .receipt-totals span, .item-detail span { min-width: 0; }
  .receipt-meta span:first-child, .receipt-totals span:first-child { flex-shrink: 0; }
  .receipt-meta span:last-child, .receipt-totals span:last-child, .item-detail span:last-child {
    text-align: right; flex-shrink: 1;
  }
  .item-block { margin-bottom: 5px; }
  .item-name { margin: 0 0 2px; word-break: break-word; }
  .item-detail { margin: 0; font-size: 9.5px; }
  .item-discount { margin: 0; font-size: 8.5px; text-align: right; }
  .grand-total { margin-top: 4px !important; font-size: 12px; font-weight: 600; }
  .receipt-footer { margin: 0; text-align: center; font-size: 12px; font-weight: 600; padding-top: 20px; }
`;

@Component({
  selector: 'app-sale-print-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule],
  templateUrl: './sale-print-dialog.component.html',
  styleUrl: './sale-print-dialog.component.scss'
})
export class SalePrintDialogComponent {
  readonly paymentLabels = PAYMENT_LABELS;

  @ViewChild('receiptContent') receiptRef?: ElementRef<HTMLElement>;
  Math = Math;

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly sale: Sale,
    private dialogRef: MatDialogRef<SalePrintDialogComponent>
  ) {}

  print(): void {
    const receipt = this.receiptRef?.nativeElement;
    if (!receipt) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0'
    });
    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const doc = printWindow?.document;
    if (!printWindow || !doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><title>Comprobante</title>` +
        `<style>${RECEIPT_PRINT_STYLES}</style></head><body>` +
        `${receipt.outerHTML}</body></html>`
    );
    doc.close();

    const cleanup = (): void => {
      iframe.remove();
    };

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 60_000);

    printWindow.focus();
    printWindow.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}

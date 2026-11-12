import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { PAYMENT_LABELS, Sale } from '../../../models';

/** Pide el motivo y anula la venta. Cierra devolviendo la venta actualizada. */
@Component({
  selector: 'app-cancel-sale-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Anular venta</h2>
    <mat-dialog-content>
      <div class="kv-list summary">
        <div class="kv"><span>Fecha</span><span>{{ sale.createdAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
        <div class="kv"><span>Vendedor/a</span><span>{{ sale.sellerName }}</span></div>
        <div class="kv"><span>Pago</span><span>{{ paymentLabels[sale.paymentMethod] }}</span></div>
        <div class="kv"><span>Total</span><span>{{ sale.total | currency:'ARS':'symbol-narrow':'1.2-2' }}</span></div>
      </div>

      <h3 class="block-title">Qué va a pasar</h3>
      <ul class="effects">
        <li>
          <mat-icon>inventory_2</mat-icon>
          <span>Vuelven al stock:
            @for (item of sale.items; track item.productId; let last = $last) {
              <strong>{{ item.quantity }} × {{ item.productName }}</strong>{{ last ? '' : ', ' }}
            }
          </span>
        </li>
        @if ((sale.cashAmount ?? 0) > 0) {
          <li class="cash">
            <mat-icon>payments</mat-icon>
            <span>Se devuelven <strong>{{ sale.cashAmount | currency:'ARS':'symbol-narrow':'1.2-2' }}</strong> en efectivo:
              se registra un retiro en la caja (en el turno de la venta si sigue abierto, o en el turno abierto actual).</span>
          </li>
        }
        @if (nonCashAmount > 0) {
          <li>
            <mat-icon>credit_card</mat-icon>
            <span>Los {{ nonCashAmount | currency:'ARS':'symbol-narrow':'1.2-2' }} cobrados con {{ paymentLabels[sale.paymentMethod] }}
              dejan de contar como venta y como monto por acreditar. La devolución de ese pago se hace por fuera del sistema.</span>
          </li>
        }
        <li>
          <mat-icon>receipt_long</mat-icon>
          <span>La venta queda en el reporte como <strong>Anulada</strong>, con el motivo y la hora.</span>
        </li>
      </ul>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Motivo de la anulación</mat-label>
        <textarea matInput rows="3" maxlength="500" [formControl]="detail" cdkFocusInitial
          placeholder="Ej.: el cliente devolvió la torta"></textarea>
        <mat-hint align="end">{{ detail.value.length }}/500</mat-hint>
        @if (detail.touched && detail.invalid) {
          <mat-error>Indicá el motivo de la anulación</mat-error>
        }
      </mat-form-field>

      @if (error) {
        <div class="alert danger"><mat-icon>error_outline</mat-icon><span class="alert-body">{{ error }}</span></div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">Volver</button>
      <button mat-flat-button color="warn" [disabled]="saving" (click)="confirm()">
        <mat-icon>block</mat-icon> {{ saving ? 'Anulando...' : 'Anular venta' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .summary { margin-bottom: 8px; }
    .block-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
    .effects { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .effects li { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; line-height: 1.45; color: var(--text-2); }
    .effects mat-icon { flex-shrink: 0; font-size: 20px; width: 20px; height: 20px; color: var(--muted); }
    .effects li.cash mat-icon { color: var(--danger); }
    mat-dialog-content { min-width: min(520px, 80vw); }
  `]
})
export class CancelSaleDialogComponent {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<CancelSaleDialogComponent, Sale>);
  readonly sale: Sale = inject(MAT_DIALOG_DATA);
  readonly paymentLabels = PAYMENT_LABELS;

  readonly detail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(500)]
  });
  saving = false;
  error = '';

  get nonCashAmount(): number {
    return Math.max(0, this.sale.total - (this.sale.cashAmount ?? 0));
  }

  confirm(): void {
    this.detail.markAsTouched();
    if (this.detail.invalid || this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.cancelSale(this.sale.id, this.detail.value.trim()).subscribe({
      next: (cancelled) => this.dialogRef.close(cancelled),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message || 'No se pudo anular la venta';
      }
    });
  }
}

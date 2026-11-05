import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { EXPENSE_PAYMENT_SOURCE_LABELS, ExpensePaymentSource, Payable } from '../../../models';

@Component({
  selector: 'app-pay-payable-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Pagar cuenta</h2>
    <mat-dialog-content>
      <p class="payable-summary">
        <strong>{{ payable.detail }}</strong>
        <span>{{ payable.amount | currency:'ARS':'symbol-narrow':'1.2-2' }}</span>
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Pagado desde</mat-label>
          <mat-select formControlName="paymentSource">
            @for (source of paymentSources; track source) {
              <mat-option [value]="source">{{ paymentSourceLabels[source] }}</mat-option>
            }
          </mat-select>
          @if (form.value.paymentSource === 'CASH') {
            <mat-hint>Se registra como retiro en el turno abierto.</mat-hint>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Volver</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="save()">
        Confirmar pago
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(350px, 80vw); }
    .payable-summary { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 16px; }
  `]
})
export class PayPayableDialogComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<PayPayableDialogComponent>);
  readonly payable = inject<Payable>(MAT_DIALOG_DATA);

  saving = false;
  readonly paymentSources: ExpensePaymentSource[] = ['BANK', 'CASH'];
  readonly paymentSourceLabels = EXPENSE_PAYMENT_SOURCE_LABELS;

  form = this.fb.nonNullable.group({
    paymentSource: ['' as ExpensePaymentSource | '', Validators.required]
  });

  save(): void {
    const { paymentSource } = this.form.getRawValue();
    if (!paymentSource) return;
    this.saving = true;
    this.api.payPayable(this.payable.id, paymentSource).subscribe({
      next: () => {
        this.snack.open('Pago registrado', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.message || 'No se pudo registrar el pago', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

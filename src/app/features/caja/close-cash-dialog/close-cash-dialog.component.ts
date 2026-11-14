import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CloseCashDialogData {
  /** Efectivo esperado según el sistema, como referencia. */
  expectedCash: number;
}

/** Pide el efectivo contado que queda en la caja al cerrarla. Devuelve el monto, o undefined si se cancela. */
@Component({
  selector: 'app-close-cash-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Cerrar caja</h2>
    <mat-dialog-content>
      <p class="muted">Efectivo esperado según el sistema: <strong>{{ data.expectedCash | currency:'ARS':'symbol-narrow':'1.2-2' }}</strong></p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Efectivo que queda en caja</mat-label>
        <span matTextPrefix>$&nbsp;</span>
        <input matInput type="number" inputmode="decimal" [formControl]="closingCash" cdkFocusInitial (keydown.enter)="confirm()" />
        <mat-hint>Contá lo que queda después de retirar. La próxima caja abre con este monto.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" [disabled]="closingCash.invalid" (click)="confirm()">Cerrar caja</button>
    </mat-dialog-actions>
  `
})
export class CloseCashDialogComponent {
  readonly data = inject<CloseCashDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CloseCashDialogComponent, number>);
  closingCash = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]);

  confirm(): void {
    if (this.closingCash.invalid) return;
    this.ref.close(this.closingCash.value!);
  }
}

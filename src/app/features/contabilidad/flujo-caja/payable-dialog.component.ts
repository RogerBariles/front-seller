import { formatDate } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-payable-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Nueva cuenta a pagar</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Detalle</mat-label>
          <input matInput formControlName="detail" maxlength="500" placeholder="Ej: Factura proveedor" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monto</mat-label>
          <input matInput type="number" formControlName="amount" min="0.01" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Vencimiento</mat-label>
          <input matInput type="date" formControlName="dueDate" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid || saving" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(350px, 80vw); }
  `]
})
export class PayableDialogComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<PayableDialogComponent>);

  saving = false;

  form = this.fb.nonNullable.group({
    detail: ['', [Validators.required, Validators.maxLength(500)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    dueDate: [formatDate(new Date(), 'yyyy-MM-dd', 'en-US'), Validators.required]
  });

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.api.createPayable(this.form.getRawValue()).subscribe({
      next: () => {
        this.snack.open('Cuenta a pagar registrada', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Error al registrar la cuenta', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

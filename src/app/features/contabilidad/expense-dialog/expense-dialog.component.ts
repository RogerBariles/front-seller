import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-expense-dialog',
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
    <h2 mat-dialog-title>Nuevo egreso</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Detalle</mat-label>
          <input matInput formControlName="detail" placeholder="Ej: Pago a proveedor" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monto</mat-label>
          <input matInput type="number" formControlName="amount" placeholder="0.00" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="date" />
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
    mat-dialog-content { min-width: 350px; }
  `]
})
export class ExpenseDialogComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ExpenseDialogComponent>);

  saving = false;

  form = this.fb.nonNullable.group({
    detail: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    this.api.createExpense({ detail: v.detail, amount: v.amount, date: v.date }).subscribe({
      next: () => {
        this.snack.open('Egreso registrado', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Error al registrar egreso', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

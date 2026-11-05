import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { RecurringPayable, RecurringPayableRequest } from '../../../models';

@Component({
  selector: 'app-recurring-payables-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Gastos fijos</h2>
    <mat-dialog-content>
      <p class="hint">Cada uno genera una cuenta a pagar por mes. Un cambio no modifica las cuentas ya generadas.</p>
      <form [formGroup]="form" (ngSubmit)="save()" class="recurring-form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="detail">
          <mat-label>Detalle</mat-label>
          <input matInput formControlName="detail" maxlength="500" placeholder="Ej: Alquiler" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Monto</mat-label>
          <input matInput type="number" formControlName="amount" min="0.01" step="0.01" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Día del mes</mat-label>
          <input matInput type="number" formControlName="dayOfMonth" min="1" max="31" />
        </mat-form-field>
        <div class="form-buttons">
          @if (editingId()) {
            <button type="button" mat-button (click)="resetForm()">Cancelar edición</button>
          }
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ editingId() ? 'Guardar cambios' : 'Agregar' }}
          </button>
        </div>
      </form>

      @if (items().length > 0) {
        <ul class="recurring-list">
          @for (item of items(); track item.id) {
            <li [class.inactive]="!item.active">
              <span class="item-text">
                <strong>{{ item.detail }}</strong>
                <span>Día {{ item.dayOfMonth }} · {{ item.amount | currency:'ARS':'symbol-narrow':'1.2-2' }}</span>
              </span>
              <button mat-icon-button aria-label="Editar" title="Editar" (click)="edit(item)">
                <mat-icon>edit</mat-icon>
              </button>
              <mat-slide-toggle [checked]="item.active" [attr.aria-label]="'Activo: ' + item.detail"
                (change)="toggle(item, $event.checked)"></mat-slide-toggle>
            </li>
          }
        </ul>
      } @else {
        <p class="hint">Todavía no hay gastos fijos.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { margin: 0 0 12px; font-size: 13px; color: var(--muted); }
    .recurring-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 4px; }
    .recurring-form .detail, .form-buttons { grid-column: 1 / -1; }
    .form-buttons { display: flex; justify-content: flex-end; gap: 8px; }
    .recurring-list { list-style: none; margin: 16px 0 0; padding: 0; }
    .recurring-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-top: 1px solid var(--border); }
    .recurring-list li.inactive .item-text { opacity: 0.55; }
    .item-text { display: flex; flex: 1; flex-direction: column; min-width: 0; font-size: 13px; }
  `]
})
export class RecurringPayablesDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  items = signal<RecurringPayable[]>([]);
  editingId = signal<string | null>(null);
  saving = signal(false);
  private editingActive = true;

  form = this.fb.nonNullable.group({
    detail: ['', [Validators.required, Validators.maxLength(500)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(31)]]
  });

  ngOnInit(): void {
    this.load();
  }

  edit(item: RecurringPayable): void {
    this.editingId.set(item.id);
    this.editingActive = item.active;
    this.form.setValue({ detail: item.detail, amount: item.amount, dayOfMonth: item.dayOfMonth });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.editingActive = true;
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) return;
    const body: RecurringPayableRequest = { ...this.form.getRawValue(), active: this.editingActive };
    const id = this.editingId();
    this.saving.set(true);
    const request = id ? this.api.updateRecurringPayable(id, body) : this.api.createRecurringPayable(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.resetForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.showError(err);
      }
    });
  }

  toggle(item: RecurringPayable, active: boolean): void {
    this.api.updateRecurringPayable(item.id, {
      detail: item.detail,
      amount: item.amount,
      dayOfMonth: item.dayOfMonth,
      active
    }).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.showError(err);
        this.load();
      }
    });
  }

  private load(): void {
    this.api.listRecurringPayables().subscribe({
      next: (items) => this.items.set(items),
      error: (err) => this.showError(err)
    });
  }

  private showError(err: { error?: { message?: string } }): void {
    this.snack.open(err.error?.message || 'No se pudo guardar el gasto fijo', 'Cerrar', { duration: 4000 });
  }
}

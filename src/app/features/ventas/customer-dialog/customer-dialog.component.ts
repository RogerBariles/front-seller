import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { Customer } from '../../../models';

/** Al menos uno de WhatsApp o mail. */
function contactRequired(group: AbstractControl): ValidationErrors | null {
  const whatsapp = (group.get('whatsapp')?.value ?? '').trim();
  const email = (group.get('email')?.value ?? '').trim();
  return whatsapp || email ? null : { contactRequired: true };
}

/**
 * Busca un cliente por DNI (mínimo 8 dígitos). Si no existe, permite darlo de alta.
 * Se cierra devolviendo el Customer a asociar a la venta, o undefined si se cancela.
 */
@Component({
  selector: 'app-customer-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Asociar cliente</h2>
    <mat-dialog-content>
      <form class="search-row" (submit)="$event.preventDefault(); search()">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>DNI</mat-label>
          <mat-icon matPrefix>badge</mat-icon>
          <input matInput inputmode="numeric" autocomplete="off" maxlength="15" cdkFocusInitial
            [formControl]="dniSearch" (input)="onDniInput()" placeholder="Mínimo 8 dígitos" />
        </mat-form-field>
        <button mat-flat-button color="primary" type="submit" [disabled]="!canSearch() || searching()">
          <mat-icon>search</mat-icon> Buscar
        </button>
      </form>

      @if (error()) {
        <div class="alert danger"><mat-icon>error_outline</mat-icon><span class="alert-body">{{ error() }}</span></div>
      }

      @if (found(); as c) {
        <div class="customer-card">
          <mat-icon>person</mat-icon>
          <div>
            <strong>{{ c.fullName }}</strong>
            <span class="muted">DNI {{ c.dni }} · Nac. {{ c.birthDate | date:'dd/MM/yyyy' }}</span>
            <span class="muted">
              @if (c.whatsapp) { WhatsApp {{ c.whatsapp }} }
              @if (c.whatsapp && c.email) { · }
              @if (c.email) { {{ c.email }} }
            </span>
          </div>
        </div>
      }

      @if (notFound()) {
        <div class="alert info"><mat-icon>person_add</mat-icon><span class="alert-body">No hay un cliente con ese DNI. Completá los datos para darlo de alta.</span></div>
        <form [formGroup]="form" class="new-customer">
          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Nombre completo</mat-label>
            <input matInput formControlName="fullName" maxlength="160" />
            <mat-error>Obligatorio</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>DNI</mat-label>
            <input matInput formControlName="dni" inputmode="numeric" maxlength="15" />
            <mat-error>Mínimo 8 dígitos, solo números</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Fecha de nacimiento</mat-label>
            <input matInput type="date" formControlName="birthDate" [max]="today" />
            <mat-error>Obligatoria</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>WhatsApp</mat-label>
            <input matInput formControlName="whatsapp" inputmode="tel" maxlength="30" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Mail</mat-label>
            <input matInput type="email" formControlName="email" maxlength="180" />
            <mat-error>Mail inválido</mat-error>
          </mat-form-field>
          @if (form.hasError('contactRequired') && (form.touched || submitted())) {
            <p class="contact-error span-2"><mat-icon>error_outline</mat-icon> Completá el WhatsApp o el mail (al menos uno).</p>
          }
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      @if (found()) {
        <button mat-flat-button color="primary" (click)="associate(found()!)">
          <mat-icon>link</mat-icon> Asociar a la venta
        </button>
      }
      @if (notFound()) {
        <button mat-flat-button color="primary" [disabled]="saving()" (click)="save()">
          <mat-icon>save</mat-icon> Guardar y asociar
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .search-row { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
    .search-row mat-form-field { flex: 1; }
    .customer-card {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 12px;
      border: 1px solid var(--border); background: var(--primary-soft, transparent);
    }
    .customer-card mat-icon { color: var(--primary); }
    .customer-card div { display: flex; flex-direction: column; gap: 2px; }
    .new-customer { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 12px; }
    .span-2 { grid-column: span 2; }
    .contact-error { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--danger-text); font-size: 13px; }
    .contact-error mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .alert { margin-bottom: 8px; }
    @media (max-width: 599px) {
      .new-customer { grid-template-columns: 1fr; }
      .span-2 { grid-column: auto; }
    }
  `]
})
export class CustomerDialogComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<CustomerDialogComponent, Customer>);

  readonly today = new Date().toISOString().slice(0, 10);
  readonly dniSearch = this.fb.nonNullable.control('');

  readonly searching = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly found = signal<Customer | null>(null);
  readonly notFound = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(160)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
    birthDate: ['', Validators.required],
    whatsapp: [''],
    email: ['', Validators.email]
  }, { validators: contactRequired });

  canSearch(): boolean {
    return this.digits(this.dniSearch.value).length >= 8;
  }

  /** Deja solo números y limpia el resultado anterior al cambiar el DNI. */
  onDniInput(): void {
    const digits = this.digits(this.dniSearch.value);
    if (digits !== this.dniSearch.value) this.dniSearch.setValue(digits);
    this.found.set(null);
    this.notFound.set(false);
    this.error.set('');
  }

  search(): void {
    if (!this.canSearch() || this.searching()) return;
    const dni = this.digits(this.dniSearch.value);
    this.searching.set(true);
    this.error.set('');
    this.api.findCustomerByDni(dni).subscribe({
      next: (customer) => {
        this.searching.set(false);
        this.found.set(customer);
        this.notFound.set(!customer);
        if (!customer) {
          this.submitted.set(false);
          this.form.reset({ fullName: '', dni, birthDate: '', whatsapp: '', email: '' });
        }
      },
      error: (err) => {
        this.searching.set(false);
        this.error.set(err.error?.message || 'No se pudo buscar el cliente');
      }
    });
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.api.createCustomer({
      fullName: v.fullName.trim(),
      dni: v.dni,
      birthDate: v.birthDate,
      whatsapp: v.whatsapp.trim() || undefined,
      email: v.email.trim() || undefined
    }).subscribe({
      next: (customer) => {
        this.saving.set(false);
        this.associate(customer);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'No se pudo guardar el cliente');
      }
    });
  }

  associate(customer: Customer): void {
    this.ref.close(customer);
  }

  private digits(value: string): string {
    return (value ?? '').replace(/\D/g, '');
  }
}

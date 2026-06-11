import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { Company } from '../../models';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './empresas.component.html',
  styleUrl: './empresas.component.scss'
})
export class EmpresasComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  companies: Company[] = [];
  editingId: string | null = null;
  loading = false;
  displayedColumns = ['name', 'detail', 'active', 'actions'];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    detail: [''],
    active: [true]
  });

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.api.getCompanies().subscribe({
      next: (companies) => this.companies = companies
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ name: '', detail: '', active: true });
  }

  edit(company: Company): void {
    this.editingId = company.id;
    this.form.patchValue({
      name: company.name,
      detail: company.detail || '',
      active: company.active
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const body = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updateCompany(this.editingId, body)
      : this.api.createCompany(body);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Empresa guardada', 'Cerrar', { duration: 3000 });
        this.resetForm();
        this.loadCompanies();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Company, ROLE_LABELS, User, UserRole } from '../../models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  users: User[] = [];
  companies: Company[] = [];
  editingId: string | null = null;
  loading = false;

  readonly roleLabels = ROLE_LABELS;
  readonly allRoles: UserRole[] = ['SELLER', 'ADMIN', 'SUPER_ADMIN'];
  displayedColumns = ['name', 'username', 'birthDate', 'role', 'company', 'active', 'actions'];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
    password: [''],
    role: ['SELLER' as UserRole, Validators.required],
    active: [true],
    birthDate: [''],
    companyId: ['']
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadCompanies();
    this.form.controls.role.valueChanges.subscribe(() => this.updateCompanyValidators());
  }

  get availableRoles(): UserRole[] {
    return this.auth.hasRole('SUPER_ADMIN')
      ? this.allRoles
      : ['SELLER', 'ADMIN'];
  }

  get activeCompanies(): Company[] {
    return this.companies.filter(c => c.active);
  }

  loadUsers(): void {
    this.api.getUsers().subscribe({
      next: (users) => this.users = users
    });
  }

  loadCompanies(): void {
    this.api.getCompanies().subscribe({
      next: (companies) => this.companies = companies
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ name: '', username: '', password: '', role: 'SELLER', active: true, birthDate: '', companyId: '' });
    this.updateCompanyValidators();
  }

  edit(user: User): void {
    this.editingId = user.id;
    this.form.patchValue({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      active: user.active,
      birthDate: user.birthDate || '',
      companyId: user.companyId || ''
    });
    this.updateCompanyValidators();
  }

  roleLabel(role: UserRole): string {
    return this.roleLabels[role];
  }

  save(): void {
    if (this.form.invalid) return;
    const body = this.form.getRawValue();
    if (!this.editingId && !body.password) {
      this.snack.open('La contraseña es obligatoria para nuevos usuarios', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!body.companyId) {
      this.snack.open('Seleccione una empresa para el usuario', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    const payload = {
      name: body.name,
      username: body.username,
      role: body.role,
      active: body.active,
      birthDate: body.birthDate || undefined,
      companyId: body.companyId,
      ...(body.password ? { password: body.password } : {})
    };

    const request$ = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Usuario guardado', 'Cerrar', { duration: 3000 });
        this.resetForm();
        this.loadUsers();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private updateCompanyValidators(): void {
    const control = this.form.controls.companyId;
    control.setValidators([Validators.required]);
    control.updateValueAndValidity();
  }
}

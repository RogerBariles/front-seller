import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ShiftHoursReport, ShiftStatus, User } from '../../models';

@Component({
  selector: 'app-reporte-turno',
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
    MatSnackBarModule
  ],
  templateUrl: './reporte-turno.component.html',
  styleUrl: './reporte-turno.component.scss'
})
export class ReporteTurnoComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  sellers: User[] = [];
  report: ShiftHoursReport | null = null;
  loading = false;

  displayedColumns = ['startedAt', 'endedAt', 'status', 'duration'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required],
    sellerId: ['', Validators.required]
  });

  ngOnInit(): void {
    const companyId = this.auth.currentUser()?.companyId;
    this.api.getSellers().subscribe({
      next: (sellers) => {
        this.sellers = companyId
          ? sellers.filter(s => s.companyId === companyId)
          : sellers;
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'Error al cargar vendedoras', 'Cerrar', { duration: 4000 });
      }
    });
  }

  statusLabel(status: ShiftStatus): string {
    return status === 'OPEN' ? 'Abierto' : 'Cerrado';
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  search(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.getRawValue();
    const params: Record<string, string> = {
      fromDate: v.fromDate,
      toDate: v.toDate,
      sellerId: v.sellerId
    };

    this.api.getShiftHoursReport(params).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar reporte', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

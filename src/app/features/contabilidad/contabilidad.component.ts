import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { ContabilidadSummary } from '../../models';
import { ExpenseDialogComponent } from './expense-dialog/expense-dialog.component';

@Component({
  selector: 'app-contabilidad',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './contabilidad.component.html',
  styleUrl: './contabilidad.component.scss'
})
export class ContabilidadComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  summary: ContabilidadSummary | null = null;
  loading = false;

  displayedExpenseColumns = ['date', 'detail', 'amount', 'createdBy'];

  form = this.fb.nonNullable.group({
    fromDate: [new Date().toISOString().slice(0, 10), Validators.required],
    toDate: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.getRawValue();
    const params: Record<string, string> = {
      fromDate: v.fromDate,
      toDate: v.toDate
    };

    this.api.getContabilidadSummary(params).subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al cargar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  openExpenseDialog(): void {
    const ref = this.dialog.open(ExpenseDialogComponent, {
      width: '420px',
      maxWidth: '95vw'
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.search();
      }
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../core/services/api.service';
import { Product, StockPurchaseRequest } from '../../../models';

export interface StockDialogResult {
  productId: string;
  currentStock: number;
}

@Component({
  selector: 'app-stock-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ product.name }}</h2>
    <mat-dialog-content>
      <p class="stock-actual">
        Stock actual:
        <strong [class.stock-bajo]="stockActual() <= 5 && stockActual() > 0"
                [class.stock-cero]="stockActual() === 0">
          {{ stockActual() }}
        </strong>
      </p>

      <!-- Purchase form -->
      <h3>Registrar compra</h3>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input matInput type="number" [(ngModel)]="purchaseQty" min="1" placeholder="Ej: 50">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notas (opcional)</mat-label>
          <input matInput [(ngModel)]="purchaseNotes" placeholder="Referencia de compra">
        </mat-form-field>
        <button mat-raised-button color="primary"
                (click)="recordPurchase()"
                [disabled]="!purchaseQty || purchaseQty <= 0">
          Registrar compra
        </button>
      </div>

      <!-- Adjustment form -->
      <h3>Ajustar stock</h3>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Cantidad (+/-)</mat-label>
          <input matInput type="number" [(ngModel)]="adjustQty" placeholder="Ej: -5 o 10">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Motivo (opcional)</mat-label>
          <input matInput [(ngModel)]="adjustNotes" placeholder="Ej: Producto dañado">
        </mat-form-field>
        <button mat-raised-button color="accent"
                (click)="adjustStock()"
                [disabled]="!adjustQty || adjustQty === 0">
          Aplicar ajuste
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-button color="primary" (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .stock-actual { font-size: 1.1rem; margin-bottom: 1rem; }
    .stock-bajo { color: #e65100; }
    .stock-cero { color: #c62828; }
    .form-row { display: flex; gap: 0.75rem; align-items: baseline; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .form-row mat-form-field { flex: 1; min-width: 160px; }
  `]
})
export class StockEditDialogComponent {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<StockEditDialogComponent, StockDialogResult>);
  readonly product: Product = inject(MAT_DIALOG_DATA);

  stockActual = signal(this.product.currentStock ?? 0);

  // Purchase form
  purchaseQty = 0;
  purchaseNotes = '';

  // Adjustment form
  adjustQty = 0;
  adjustNotes = '';

  recordPurchase(): void {
    if (!this.purchaseQty || this.purchaseQty <= 0) return;

    const body: StockPurchaseRequest = {
      productId: this.product.id,
      quantity: this.purchaseQty,
      notes: this.purchaseNotes || undefined
    };

    this.api.recordPurchase(body).subscribe({
      next: (res) => {
        this.stockActual.set(res.currentStock);
        this.purchaseQty = 0;
        this.purchaseNotes = '';
        this.snack.open('Compra registrada', 'Cerrar', { duration: 3000 });
      },
      error: () => this.snack.open('Error al registrar compra', 'Cerrar', { duration: 4000 })
    });
  }

  adjustStock(): void {
    if (!this.adjustQty || this.adjustQty === 0) return;

    this.api.adjustStock({
      productId: this.product.id,
      quantityChange: this.adjustQty,
      notes: this.adjustNotes || undefined
    }).subscribe({
      next: (res) => {
        this.stockActual.set(res.currentStock);
        this.adjustQty = 0;
        this.adjustNotes = '';
        this.snack.open('Ajuste aplicado', 'Cerrar', { duration: 3000 });
      },
      error: () => this.snack.open('Error al ajustar stock', 'Cerrar', { duration: 4000 })
    });
  }

  close(): void {
    this.dialogRef.close({
      productId: this.product.id,
      currentStock: this.stockActual()
    });
  }
}

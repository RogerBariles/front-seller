import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>{{ product.name }}</h2>
    <mat-dialog-content>
      <div class="stock-actual" [class.stock-bajo]="stockActual() <= 5 && stockActual() > 0"
           [class.stock-cero]="stockActual() === 0">
        <span>Stock actual</span>
        <strong>{{ stockActual() }}</strong>
      </div>

      <section class="block">
        <h3><mat-icon>add_shopping_cart</mat-icon> Registrar compra</h3>
        <div class="form-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" inputmode="numeric" [(ngModel)]="purchaseQty" min="1" placeholder="Ej: 50">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Notas (opcional)</mat-label>
            <input matInput [(ngModel)]="purchaseNotes" placeholder="Referencia de compra">
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary"
                (click)="recordPurchase()"
                [disabled]="!purchaseQty || purchaseQty <= 0">
          Registrar compra
        </button>
      </section>

      <section class="block">
        <h3><mat-icon>tune</mat-icon> Ajustar stock</h3>
        <div class="form-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Cantidad (+/-)</mat-label>
            <input matInput type="number" [(ngModel)]="adjustQty" placeholder="Ej: -5 o 10">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Motivo (opcional)</mat-label>
            <input matInput [(ngModel)]="adjustNotes" placeholder="Ej: Producto dañado">
          </mat-form-field>
        </div>
        <button mat-stroked-button color="primary"
                (click)="adjustStock()"
                [disabled]="!adjustQty || adjustQty === 0">
          Aplicar ajuste
        </button>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="close()">Listo</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .stock-actual {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; margin-bottom: 16px; border-radius: 12px;
      background: var(--success-soft); color: #15803d; font-weight: 500;
    }
    .stock-actual strong { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .stock-actual.stock-bajo { background: var(--warning-soft); color: #b45309; }
    .stock-actual.stock-cero { background: var(--danger-soft); color: #b91c1c; }
    .block { padding: 14px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; }
    .block h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .block h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }
    .form-row { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-bottom: 12px; }
    @media (max-width: 599px) {
      .form-row { grid-template-columns: 1fr; }
      .block button { width: 100%; }
    }
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

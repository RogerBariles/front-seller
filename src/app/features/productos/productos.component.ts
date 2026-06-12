import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
import {
  CATEGORY_LABELS,
  PRICE_FIELD_LABELS,
  PriceField,
  Product,
  ProductCategory,
  ProductPriceAudit
} from '../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss'
})
export class ProductosComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  products: Product[] = [];
  audits: ProductPriceAudit[] = [];
  editingId: string | null = null;
  loading = false;

  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly priceFieldLabels = PRICE_FIELD_LABELS;
  readonly bulkTargets: PriceField[] = ['SALE', 'PURCHASE', 'BOTH'];
  displayedColumns = ['name', 'category', 'price', 'purchasePrice', 'margin', 'active', 'actions'];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['TORTAS' as ProductCategory, Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    active: [true]
  });

  bulkForm = this.fb.nonNullable.group({
    percentage: [10, [Validators.required, Validators.min(0.01)]],
    target: ['SALE' as PriceField, Validators.required]
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.api.listProducts().subscribe({
      next: (products) => this.products = products
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ name: '', category: 'TORTAS', price: 0, purchasePrice: 0, active: true });
    this.audits = [];
  }

  edit(product: Product): void {
    this.editingId = product.id;
    this.form.patchValue({
      name: product.name,
      category: product.category,
      price: product.price,
      purchasePrice: product.purchasePrice,
      active: product.active
    });
    this.api.getProductAudits(product.id).subscribe({
      next: (audits) => this.audits = audits
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const body = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updateProduct(this.editingId, body)
      : this.api.createProduct(body);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Producto guardado', 'Cerrar', { duration: 3000 });
        this.resetForm();
        this.loadProducts();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  categoryLabel(category: ProductCategory): string {
    return this.categoryLabels[category];
  }

  margin(product: Product): number {
    return Math.round((product.price - product.purchasePrice) * 100) / 100;
  }

  marginPercent(product: Product): number | null {
    if (product.price <= 0) return null;
    return Math.round(((product.price - product.purchasePrice) / product.price) * 10000) / 100;
  }

  priceFieldLabel(field: 'SALE' | 'PURCHASE'): string {
    return field === 'SALE' ? 'venta' : 'compra';
  }

  bulkTargetLabel(target: PriceField): string {
    return this.priceFieldLabels[target];
  }

  bulkIncrease(): void {
    if (this.bulkForm.invalid) return;
    const { percentage, target } = this.bulkForm.getRawValue();
    if (!confirm(`¿Aumentar ${this.bulkTargetLabel(target).toLowerCase()} de todos los productos activos un ${percentage}%?`)) {
      return;
    }
    this.loading = true;
    this.api.bulkPriceIncrease(percentage, target).subscribe({
      next: (res) => {
        this.loading = false;
        this.snack.open(`${res.updated} productos actualizados`, 'Cerrar', { duration: 3000 });
        this.loadProducts();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'Error en aumento masivo', 'Cerrar', { duration: 4000 });
      }
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    this.loading = true;
    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Producto eliminado', 'Cerrar', { duration: 3000 });
        if (this.editingId === product.id) {
          this.resetForm();
        }
        this.loadProducts();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.message || 'No se pudo eliminar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

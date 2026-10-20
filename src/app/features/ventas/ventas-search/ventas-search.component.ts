import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CATEGORY_LABELS, Product, ProductCategory } from '../../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ventas-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './ventas-search.component.html',
  styleUrl: './ventas-search.component.scss'
})
export class VentasSearchComponent {
  @Input({ required: true }) searchForm!: FormGroup;
  @Input({ required: true }) products: Product[] = [];
  /** Cantidad de cada producto que ya está en el carrito (por id). */
  @Input() inCart: Record<string, number> = {};
  @Input() disabled = false;
  @Output() addProduct = new EventEmitter<Product>();

  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;

  get query(): string {
    return (this.searchForm.get('q')?.value ?? '').trim();
  }

  clearSearch(): void {
    this.searchForm.patchValue({ q: '' });
  }

  getCategoryLabel(category: ProductCategory): string {
    return this.categoryLabels[category];
  }

  onAdd(product: Product): void {
    if (!this.disabled) {
      this.addProduct.emit(product);
    }
  }
}

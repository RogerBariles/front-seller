import { CommonModule, CurrencyPipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CATEGORY_LABELS, Product, ProductCategory } from '../../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ventas-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './ventas-search.component.html',
  styleUrl: './ventas-search.component.scss'
})
export class VentasSearchComponent {
  @Input({ required: true }) searchForm!: FormGroup;
  @Input({ required: true }) products: Product[] = [];
  @Input() disabled = false;
  @Output() addProduct = new EventEmitter<Product>();

  readonly categories = Object.keys(CATEGORY_LABELS) as ProductCategory[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly displayedColumns = ['name', 'price', 'action'];

  onAdd(product: Product): void {
    if (!this.disabled) {
      this.addProduct.emit(product);
    }
  }
}

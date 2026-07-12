import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { CATEGORY_LABELS, Product, ProductCategory } from '../../models';
import { StockDialogResult, StockEditDialogComponent } from './stock-edit-dialog/stock-edit-dialog.component';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss'
})
export class StockComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  copySuccess = signal(false);
  selectedCategories = signal<ProductCategory[]>([]);
  searchName = signal('');

  availableCategories = computed(() => {
    const all = this.products();
    return [...new Set(all.map(p => p.category))];
  });

  filteredProducts = computed(() => {
    const cats = this.selectedCategories();
    const nameFilter = this.searchName().toLowerCase().trim();

    return this.products().filter(p => {
      if (cats.length > 0 && !cats.includes(p.category)) return false;
      if (nameFilter && !p.name.toLowerCase().includes(nameFilter)) return false;
      return true;
    });
  });

  allSelected = computed(() => {
    const avail = this.availableCategories();
    const selected = this.selectedCategories();
    return avail.length > 0 && avail.length === selected.length;
  });

  protected readonly CATEGORY_LABELS = CATEGORY_LABELS;

  displayedColumns: string[] = ['name', 'currentStock', 'actions'];

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        const uniqueCats = [...new Set(data.map(p => p.category))] as ProductCategory[];
        this.selectedCategories.set(uniqueCats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar productos');
        this.loading.set(false);
      }
    });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedCategories.set([]);
    } else {
      this.selectedCategories.set([...this.availableCategories()]);
    }
  }

  async copyTableToClipboard(): Promise<void> {
    const table = document.querySelector<HTMLTableElement>('.stock-container table');
    if (!table) return;

    try {
      const canvas = await html2canvas(table);
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      this.copySuccess.set(false);
    }
  }

  openStockDialog(product: Product): void {
    const ref = this.dialog.open(StockEditDialogComponent, {
      data: product,
      minWidth: '550px',
      maxWidth: '700px'
    });

    ref.afterClosed().subscribe((result: StockDialogResult | undefined) => {
      if (result) {
        this.products.update(products =>
          products.map(p => p.id === result.productId ? { ...p, currentStock: result.currentStock } : p)
        );
      }
    });
  }
}

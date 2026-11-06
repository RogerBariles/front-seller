import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CATEGORY_LABELS, Product, ProductCategory } from '../../models';
import { StockDialogResult, StockEditDialogComponent } from './stock-edit-dialog/stock-edit-dialog.component';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss'
})
export class StockComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  products = signal<Product[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  copySuccess = signal(false);
  selectedCategories = signal<ProductCategory[]>([]);
  searchName = signal('');
  showOutOfStock = signal(false);
  /** Los montos de costo y venta son solo para ADMIN y SUPER_ADMIN. */
  readonly canSeeAmounts = this.auth.hasRole('ADMIN', 'SUPER_ADMIN');

  availableCategories = computed(() => {
    const all = this.products();
    return [...new Set(all.map(p => p.category))];
  });

  filteredProducts = computed(() => {
    const cats = this.selectedCategories();
    const nameFilter = this.searchName().toLowerCase().trim();
    const showOutOfStock = this.showOutOfStock();

    return this.products()
      .filter(p => {
        if (!showOutOfStock && (p.currentStock ?? 0) <= 0) return false;
        if (cats.length > 0 && !cats.includes(p.category)) return false;
        if (nameFilter && !p.name.toLowerCase().includes(nameFilter)) return false;
        return true;
      })
      .sort((a, b) => (b.currentStock ?? 0) - (a.currentStock ?? 0));
  });

  allSelected = computed(() => {
    const avail = this.availableCategories();
    const selected = this.selectedCategories();
    return avail.length > 0 && avail.length === selected.length;
  });

  // Los totalizadores siguen el filtro aplicado
  totalStock = computed(() =>
    this.filteredProducts().reduce((sum, p) => sum + (p.currentStock ?? 0), 0)
  );

  totalCost = computed(() =>
    this.filteredProducts().reduce((sum, p) => sum + (p.currentStock ?? 0) * p.purchasePrice, 0)
  );

  totalSale = computed(() =>
    this.filteredProducts().reduce((sum, p) => sum + (p.currentStock ?? 0) * p.price, 0)
  );

  readonly today = new Date();

  protected readonly CATEGORY_LABELS = CATEGORY_LABELS;

  categoryLabel(category: ProductCategory): string {
    return CATEGORY_LABELS[category] ?? category;
  }

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
    const area = document.querySelector<HTMLElement>('.stock-container .copy-capture');
    if (!area || this.filteredProducts().length === 0) return;

    // Safari exige escribir en el portapapeles durante el clic: la imagen se le pasa como promesa
    const image = this.captureImage(area);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      this.copySuccess.set(false);
      await this.downloadImage(image);
    }
  }

  private async captureImage(area: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(area, { backgroundColor: '#ffffff', scale: 2 });
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Imagen demasiado grande')), 'image/png')
    );
  }

  /** Si el navegador no deja copiar, la imagen se descarga para no perderla. */
  private async downloadImage(image: Promise<Blob>): Promise<void> {
    try {
      const url = URL.createObjectURL(await image);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stock.png';
      link.click();
      URL.revokeObjectURL(url);
      this.snack.open('El navegador no permitió copiar. La imagen se descargó.', 'Cerrar', { duration: 4000 });
    } catch {
      this.snack.open('No se pudo generar la imagen', 'Cerrar', { duration: 4000 });
    }
  }

  openStockDialog(product: Product): void {
    const ref = this.dialog.open(StockEditDialogComponent, {
      data: product,
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'responsive-dialog'
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

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import {
  CartItem,
  CashRegister,
  DiscountType,
  PaymentMethod,
  Product,
  ProductCategory,
  Sale,
  Shift
} from '../../models';
import { SalePrintDialogComponent } from './sale-print-dialog/sale-print-dialog.component';
import { VentasCartComponent } from './ventas-cart/ventas-cart.component';
import { VentasSearchComponent } from './ventas-search/ventas-search.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDialogModule,
    VentasSearchComponent,
    VentasCartComponent
  ],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.scss'
})
export class VentasComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  products = signal<Product[]>([]);
  cart = signal<CartItem[]>([]);
  cashRegister = signal<CashRegister | null>(null);
  activeShift = signal<Shift | null>(null);
  loading = false;

  searchForm = this.fb.nonNullable.group({
    q: [''],
    category: ['' as ProductCategory | '']
  });

  checkoutForm = this.fb.nonNullable.group({
    paymentMethod: ['EFECTIVO' as PaymentMethod, Validators.required],
    installments: [1, [Validators.min(1)]],
    totalDiscountType: ['' as DiscountType | ''],
    totalDiscountValue: [0, [Validators.min(0)]],
    manualTotalEnabled: [false],
    manualTotal: [0, [Validators.min(0.01)]],
    amountReceived: [0, [Validators.min(0)]]
  });

  canSell = computed(() =>
    this.cashRegister()?.status === 'OPEN' && !!this.activeShift()
  );

  salesBlockMessage = computed(() => {
    const cr = this.cashRegister();
    const shift = this.activeShift();
    if (!cr) {
      return 'No hay caja para hoy. Abrila en Caja y Turnos con el efectivo inicial.';
    }
    if (cr.status === 'CLOSED') {
      return 'No hay caja abierta. Puede abrir una nueva caja en Caja y Turnos.';
    }
    if (!shift) {
      return 'La caja está abierta. Iniciá tu turno en Caja y Turnos para vender.';
    }
    return '';
  });

  subtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  ngOnInit(): void {
    this.checkSalesReadiness();
    this.searchForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((event) => {
      if (event.q) {
        event.q.length >= 2 && this.loadProducts();
        event.q.length < 2 && this.products.set([]);
      }
    });
  }

  checkSalesReadiness(): void {
    this.api.getTodayCashRegister().subscribe({
      next: (active) => this.cashRegister.set(active?.cashRegister ?? null),
      error: () => this.cashRegister.set(null)
    });
    this.api.getActiveShift().subscribe({
      next: (active) => this.activeShift.set(active?.shift ?? null),
      error: () => this.activeShift.set(null)
    });
  }

  loadProducts(): void {
    const { q, category } = this.searchForm.getRawValue();
    this.api.searchProducts(q || undefined, category || undefined).subscribe({
      next: (products) => this.products.set(products)
    });
  }

  addToCart(product: Product): void {
    const current = [...this.cart()];
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      current.push({ product, quantity: 1 });
    }
    this.cart.set(current);
  }

  removeFromCart(productId: string): void {
    this.cart.set(this.cart().filter(i => i.product.id !== productId));
    if (this.cart().length === 0) {
      this.clearCart();
      return;
    }
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity < 1) return;
    this.cart.set(this.cart().map(i => i.product.id === productId ? { ...i, quantity } : i));
  }

  updateItemDiscount(productId: string, discountType?: DiscountType | '', discountValue?: number): void {
    this.cart.set(this.cart().map(i => {
      if (i.product.id !== productId) return i;
      const next = { ...i };
      if (discountType !== undefined) {
        if (!discountType) {
          return { ...i, discountType: undefined, discountValue: undefined };
        }
        next.discountType = discountType;
      }
      if (discountValue !== undefined) {
        if (discountValue > 0 && next.discountType) {
          next.discountValue = discountValue;
        } else {
          next.discountValue = undefined;
        }
      }
      return next;
    }));
  }

  clearCart(): void {
    this.cart.set([]);
    this.checkoutForm.reset({
      paymentMethod: 'EFECTIVO',
      installments: 1,
      totalDiscountType: '',
      totalDiscountValue: 0,
      manualTotalEnabled: false,
      manualTotal: 0,
      amountReceived: 0
    });
  }

  goToCaja(): void {
    this.router.navigate(['/app/caja']);
  }

  openPrintDialog(sale: Sale): void {
    this.dialog.open(SalePrintDialogComponent, {
      data: sale,
      width: '200px',
      maxWidth: '95vw',
      panelClass: 'sale-print-dialog-panel'
    });
  }

  submitSale(): void {
    if (this.loading) {
      return;
    }
    if (!this.canSell()) {
      this.snack.open('Debe tener caja y turno abiertos para vender', 'Ir a caja', { duration: 5000 })
        .onAction().subscribe(() => this.goToCaja());
      return;
    }
    if (this.cart().length === 0) {
      this.snack.open('El carrito está vacío', 'Cerrar', { duration: 3000 });
      return;
    }

    const checkout = this.checkoutForm.getRawValue();
    if (checkout.paymentMethod === 'TARJETA' && (!checkout.installments || checkout.installments < 1)) {
      this.snack.open('Indique cantidad de cuotas', 'Cerrar', { duration: 3000 });
      return;
    }

    const requiredTotal = checkout.manualTotalEnabled && checkout.manualTotal > 0
      ? checkout.manualTotal
      : this.computeEstimatedTotal();

    if (checkout.paymentMethod === 'EFECTIVO') {
      if (!checkout.amountReceived || checkout.amountReceived < requiredTotal) {
        this.snack.open('El efectivo recibido debe cubrir el total', 'Cerrar', { duration: 3000 });
        return;
      }
    }

    const useManualTotal = checkout.manualTotalEnabled && checkout.manualTotal > 0;
    const totalDiscount = useManualTotal
      ? {}
      : this.normalizeTotalDiscount(checkout.totalDiscountType, checkout.totalDiscountValue);

    this.loading = true;
    this.api.createSale({
      items: this.cart().map(item => {
        const itemDiscount = this.normalizeItemDiscount(item.discountType, item.discountValue);
        return {
          productId: item.product.id,
          quantity: item.quantity,
          ...itemDiscount
        };
      }),
      paymentMethod: checkout.paymentMethod,
      installments: checkout.paymentMethod === 'TARJETA' ? checkout.installments : undefined,
      ...totalDiscount,
      ...(useManualTotal ? { manualTotal: checkout.manualTotal } : {})
    }).subscribe({
      next: (sale) => {
        this.loading = false;
        this.clearCart();
        this.openPrintDialog(sale);
      },
      error: (err) => {
        this.loading = false;
        const message = err.error?.message || 'No se pudo registrar la venta';
        this.snack.open(message, err.status === 409 ? 'Ir a caja' : 'Cerrar', { duration: 5000 })
          .onAction().subscribe(() => {
            if (err.status === 409) this.goToCaja();
          });
      }
    });
  }

  private normalizeItemDiscount(
    type?: DiscountType,
    value?: number
  ): { discountType?: DiscountType; discountValue?: number } {
    if (!type || value == null || value <= 0) {
      return {};
    }
    return { discountType: type, discountValue: value };
  }

  private normalizeTotalDiscount(
    type?: DiscountType | '',
    value?: number
  ): { totalDiscountType?: DiscountType; totalDiscountValue?: number } {
    if (!type || value == null || value <= 0) {
      return {};
    }
    return { totalDiscountType: type, totalDiscountValue: value };
  }

  private computeEstimatedTotal(): number {
    const checkout = this.checkoutForm.getRawValue();
    const lineDiscountTotal = this.cart().reduce((sum, item) => {
      const line = item.product.price * item.quantity;
      return sum + this.applyDiscount(line, item.discountType, item.discountValue);
    }, 0);
    const afterLineDiscounts = this.subtotal() - lineDiscountTotal;
    const totalDiscount = this.applyDiscount(
      afterLineDiscounts,
      checkout.totalDiscountType || undefined,
      checkout.totalDiscountValue > 0 ? checkout.totalDiscountValue : undefined
    );
    return Math.round((afterLineDiscounts - totalDiscount) * 100) / 100;
  }

  private applyDiscount(amount: number, type?: DiscountType, value?: number): number {
    if (!type || !value || value <= 0) return 0;
    if (type === 'PERCENTAGE') {
      return Math.round(amount * value) / 100;
    }
    if (type === 'PERCENTAGE_EXTRA') {
      return -Math.round(amount * value) / 100;
    }
    return Math.min(value, amount);
  }
}

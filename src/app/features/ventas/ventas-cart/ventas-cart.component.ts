import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CartItem, DiscountType, PAYMENT_LABELS, PaymentMethod } from '../../../models';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ventas-cart',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './ventas-cart.component.html',
  styleUrl: './ventas-cart.component.scss'
})
export class VentasCartComponent {
  @Input({ required: true }) cart: CartItem[] = [];
  @Input({ required: true }) checkoutForm!: FormGroup;
  @Input() subtotal = 0;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() removeItem = new EventEmitter<string>();
  @Output() quantityChange = new EventEmitter<{ productId: string; quantity: number }>();
  @Output() discountChange = new EventEmitter<{ productId: string; discountType?: DiscountType | ''; discountValue?: number }>();
  @Output() clear = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;

  get lineDiscountTotal(): number {
    return this.cart.reduce((sum, item) => {
      const line = item.product.price * item.quantity;
      return sum + this.applyDiscount(line, item.discountType, item.discountValue);
    }, 0);
  }

  get afterLineDiscounts(): number {
    return this.subtotal - this.lineDiscountTotal;
  }

  get totalDiscountAmount(): number {
    const checkout = this.checkoutForm.getRawValue();
    const type = checkout.totalDiscountType || undefined;
    const value = checkout.totalDiscountValue > 0 ? checkout.totalDiscountValue : undefined;
    return this.applyDiscount(this.afterLineDiscounts, type, value);
  }

  get estimatedTotal(): number {
    return Math.round((this.afterLineDiscounts - this.totalDiscountAmount) * 100) / 100;
  }

  get hasDiscounts(): boolean {
    return this.lineDiscountTotal > 0 || this.totalDiscountAmount > 0;
  }

  private applyDiscount(amount: number, type?: DiscountType, value?: number): number {
    if (!type || !value || value <= 0) return 0;
    if (type === 'PERCENTAGE') {
      return Math.round(amount * value) / 100;
    }
    return Math.min(value, amount);
  }
}

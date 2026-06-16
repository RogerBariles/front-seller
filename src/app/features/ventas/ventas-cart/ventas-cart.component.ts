import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CartItem, DiscountType, PAYMENT_LABELS, PaymentMethod } from '../../../models';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

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
    MatIconModule,
    MatSlideToggleModule
  ],
  templateUrl: './ventas-cart.component.html',
  styleUrl: './ventas-cart.component.scss'
})
export class VentasCartComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) cart: CartItem[] = [];
  @Input({ required: true }) checkoutForm!: FormGroup;
  @Input() subtotal = 0;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() removeItem = new EventEmitter<string>();
  @Output() quantityChange = new EventEmitter<{ productId: string; quantity: number }>();
  @Output() discountChange = new EventEmitter<{ productId: string; discountType?: DiscountType | ''; discountValue?: number }>();
  @Output() clear = new EventEmitter<void>();
  @Output() confirmSale = new EventEmitter<void>();

  readonly paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];
  readonly paymentLabels = PAYMENT_LABELS;
  Math = Math;
  private formSub?: Subscription;

  ngOnInit(): void {
    this.formSub = this.checkoutForm.valueChanges.subscribe(() => {
      if (this.isCash && !this.checkoutForm.getRawValue().manualTotalEnabled) {
        this.syncAmountReceived();
      }
    });
    if (this.isCash) {
      this.syncAmountReceived();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cart'] || changes['subtotal']) {
      if (this.isCash && !this.checkoutForm.getRawValue().manualTotalEnabled) {
        this.syncAmountReceived();
      }
    }
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

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

  get finalTotal(): number {
    const checkout = this.checkoutForm.getRawValue();
    if (checkout.manualTotalEnabled && checkout.manualTotal > 0) {
      return checkout.manualTotal;
    }
    return this.estimatedTotal;
  }

  get isCash(): boolean {
    return this.checkoutForm.getRawValue().paymentMethod === 'EFECTIVO';
  }

  get changeAmount(): number {
    const received = this.checkoutForm.getRawValue().amountReceived ?? 0;
    return Math.round((received - this.finalTotal) * 100) / 100;
  }

  get canConfirmSale(): boolean {
    if (this.finalTotal <= 0) return false;
    if (!this.isCash) return true;
    const received = this.checkoutForm.getRawValue().amountReceived ?? 0;
    return received >= this.finalTotal;
  }

  get manualAdjustment(): number {
    return Math.round((this.estimatedTotal - this.finalTotal) * 100) / 100;
  }

  onManualTotalToggle(enabled: boolean): void {
    if (enabled) {
      this.checkoutForm.patchValue({
        manualTotalEnabled: true,
        manualTotal: this.estimatedTotal,
        totalDiscountType: '',
        totalDiscountValue: 0
      });
    } else {
      this.checkoutForm.patchValue({ manualTotalEnabled: false });
    }
    this.syncAmountReceived();
  }

  onPaymentMethodChange(): void {
    if (this.isCash) {
      this.syncAmountReceived();
    }
  }

  syncAmountReceived(): void {
    this.checkoutForm.patchValue({ amountReceived: this.finalTotal }, { emitEvent: false });
  }

  get hasDiscounts(): boolean {
    return this.lineDiscountTotal !== 0 || this.totalDiscountAmount !== 0;
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

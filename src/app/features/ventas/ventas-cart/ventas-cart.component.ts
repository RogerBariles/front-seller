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

const PAYMENTS_WITHOUT_PARTIAL_CASH: PaymentMethod[] = ['EFECTIVO', 'PEDIDOSYA'];

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
  readonly paymentLabels: any = PAYMENT_LABELS;
  Math = Math;
  private formSub?: Subscription;

  ngOnInit(): void {
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
    return Math.round((this.subtotal - this.lineDiscountTotal) * 100) / 100;
  }

  get allowsPartialCash(): boolean {
    const checkout = this.checkoutForm.getRawValue();
    return !checkout.manualTotalEnabled
      && !PAYMENTS_WITHOUT_PARTIAL_CASH.includes(checkout.paymentMethod);
  }

  get partialCashAmount(): number {
    if (!this.allowsPartialCash) return 0;
    return Math.max(0, this.checkoutForm.getRawValue().cashAmount ?? 0);
  }

  /** Base para descuento/recargo total: subtotal después de ítems menos efectivo parcial. */
  get discountBase(): number {
    return Math.round((this.afterLineDiscounts - this.partialCashAmount) * 100) / 100;
  }

  get totalDiscountAmount(): number {
    const checkout = this.checkoutForm.getRawValue();
    if (checkout.manualTotalEnabled) return 0;
    const type = checkout.totalDiscountType || undefined;
    const value = checkout.totalDiscountValue > 0 ? checkout.totalDiscountValue : undefined;
    return this.applyDiscount(this.discountBase, type, value);
  }

  get estimatedTotal(): number {
    return Math.round((this.partialCashAmount + this.discountBase - this.totalDiscountAmount) * 100) / 100;
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

  get otherPaymentAmount(): number {
    if (this.isCash) return 0;
    return Math.round((this.finalTotal - this.partialCashAmount) * 100) / 100;
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
        totalDiscountValue: 0,
        cashAmount: 0
      });
    } else {
      this.checkoutForm.patchValue({ manualTotalEnabled: false });
    }
    this.syncAmountReceived();
  }

  onPaymentMethodChange(): void {
    this.checkoutForm.patchValue({
      totalDiscountType: '',
      totalDiscountValue: 0,
      cashAmount: 0
    }, { emitEvent: false });
    if (this.isCash) {
      this.syncAmountReceived();
    }
    if (this.checkoutForm.value.paymentMethod === 'PEDIDOSYA') {
      this.checkoutForm.patchValue({ totalDiscountType: 'PERCENTAGE', totalDiscountValue: 9.5 });
    }
  }

  onCashAmountChange(): void {
    const cashAmount = this.checkoutForm.getRawValue().cashAmount ?? 0;
    if (cashAmount > this.afterLineDiscounts) {
      this.checkoutForm.patchValue({ cashAmount: this.afterLineDiscounts });
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

  isAvailableTypeByPaymentMethod(type: string): boolean {
    if (type === 'DISCOUNT') {
      const notAvailablePaymentMethods = ['PEDIDOSYA', 'DEBITO', 'QR'];
      return !notAvailablePaymentMethods.includes(this.checkoutForm.value.paymentMethod);
    }

    if (type === 'MANUAL_TOTAL') {
      const notAvailablePaymentMethods = ['PEDIDOSYA', 'DEBITO', 'QR'];
      return !notAvailablePaymentMethods.includes(this.checkoutForm.value.paymentMethod);
    }

    return true;
  }
}

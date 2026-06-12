export type UserRole = 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';
export type ProductCategory = 'TORTAS' | 'TARTAS' | 'TARTINES' | 'POSTRES' | 'COTILLON' | 'ALFAJORES';
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type PriceField = 'SALE' | 'PURCHASE' | 'BOTH';
export type CashRegisterStatus = 'OPEN' | 'CLOSED';
export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Company {
  id: string;
  name: string;
  detail?: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  birthDate?: string;
  companyId?: string;
  companyName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  purchasePrice: number;
  active: boolean;
  updatedAt: string;
}

export interface CashRegister {
  id: string;
  businessDate: string;
  initialCash: number;
  status: CashRegisterStatus;
  openedById: string;
  openedByName: string;
  openedAt: string;
  closedAt?: string;
}

export interface Shift {
  id: string;
  cashRegisterId: string;
  sellerId: string;
  sellerName: string;
  initialCash: number;
  status: ShiftStatus;
  startedAt: string;
  endedAt?: string;
}

export type CloseReportType = 'SHIFT' | 'CASH_REGISTER';

export interface PaymentTotals {
  cash: number;
  card: number;
  transfer: number;
}

export interface CloseReport {
  type: CloseReportType;
  cashRegisterOpenedAt: string;
  cashRegisterOpenedByName: string;
  cashRegisterInitialCash: number;
  cashRegisterClosedAt?: string;
  cashRegisterClosedByName?: string;
  shiftStartedAt?: string;
  shiftOpenedByName?: string;
  shiftInitialCash?: number;
  shiftClosedAt?: string;
  shiftClosedByName?: string;
  initialCash: number;
  finalCash: number;
  salesCount: number;
  totalSalesAmount: number;
  paymentTotals: PaymentTotals;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number;
}

export interface SaleItemRequest {
  productId: string;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number;
}

export interface CreateSaleRequest {
  items: SaleItemRequest[];
  paymentMethod: PaymentMethod;
  installments?: number;
  totalDiscountType?: DiscountType;
  totalDiscountValue?: number;
}

export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  paymentMethod: PaymentMethod;
  installments?: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  totalDiscountType?: DiscountType;
  totalDiscountValue?: number;
  createdAt: string;
  items: SaleItem[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface SalesReport {
  totalSalesCount: number;
  totalAmount: number;
  amountByPaymentMethod: Record<PaymentMethod, number>;
  sales: Sale[];
}

export interface ProductPriceAudit {
  id: string;
  productId: string;
  productName: string;
  changedById: string;
  changedByName: string;
  oldPrice: number;
  newPrice: number;
  priceField: 'SALE' | 'PURCHASE';
  changeType: 'INDIVIDUAL' | 'BULK_PERCENTAGE';
  changedAt: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  TORTAS: 'Tortas',
  TARTAS: 'Tartas',
  TARTINES: 'Tartines',
  COTILLON: 'Cotillón',
  POSTRES: 'Postres',
  ALFAJORES: 'Alfajores'
};

export const PRICE_FIELD_LABELS: Record<PriceField, string> = {
  SALE: 'Precio de venta',
  PURCHASE: 'Precio de compra',
  BOTH: 'Venta y compra'
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia'
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SELLER: 'Vendedora',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin'
};

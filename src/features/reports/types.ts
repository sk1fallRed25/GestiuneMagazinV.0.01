export interface SalesSummaryReport {
  grossSales: number;
  voidAmount: number;
  returnAmount: number;
  netSales: number;
  cashGross: number;
  cashRefunds: number;
  netCash: number;
  cardGross: number;
  cardRefunds: number;
  netCard: number;
  voucherRefunds: number;
  salesCount: number;
  voidCount: number;
  returnCount: number;
  averageBasket: number;
  activeShiftCount: number;
}

export interface ProductPerformanceItem {
  productId: string;
  name: string;
  barcode: string | null;
  quantitySoldGross: number;
  quantityReturned: number;
  quantitySoldNet: number;
  grossRevenue: number;
  returnedRevenue: number;
  netRevenue: number;
  estimatedCogs: number;
  estimatedProfit: number;
  marginPercent: number;
}

export interface ProductPerformanceReport {
  products: ProductPerformanceItem[];
}

export interface DailyCashShift {
  shiftId: string;
  registerName: string | null;
  cashierName: string | null;
  openingCash: number;
  expectedCash: number;
  declaredCash: number | null;
  cashDifference: number | null;
  netCash: number;
  netCard: number;
  status: string;
}

export interface DailyCashReport {
  date: string;
  shifts: DailyCashShift[];
  totalOpeningCash: number;
  totalExpectedCash: number;
  totalDeclaredCash: number;
  totalCashDifference: number;
  netCash: number;
  netCard: number;
}

export interface DeadStockCandidate {
  productId: string;
  name: string;
  barcode: string | null;
  quantity: number;
  lastSaleAt: string | null;
}

export interface InventoryValueReport {
  totalStockMagazin: number;
  totalStockDepozit: number;
  estimatedPurchaseValue: number;
  estimatedSaleValue: number;
  lowStockCount: number;
  negativeStockCount: number;
  deadStockCandidates: DeadStockCandidate[];
}

export interface WasteReasonItem {
  reason: string;
  quantity: number;
  value: number;
  count: number;
}

export interface WasteProductItem {
  productId: string;
  name: string;
  barcode: string | null;
  quantity: number;
  value: number;
}

export interface LossesReport {
  totalWasteQuantity: number;
  estimatedWasteValue: number;
  lossesCount?: number;
  byReason: WasteReasonItem[];
  byProduct: WasteProductItem[];
}

export interface ShiftSaleItem {
  saleId: string;
  createdAt: string;
  total: number;
  paymentMethod: string | null;
  status: string;
}

export interface ShiftReport {
  shiftId: string;
  cashierName: string | null;
  registerName: string | null;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  openingCash: number;
  cashSales: number;
  cashReturns: number;
  expectedCash: number;
  declaredCash: number | null;
  cashDifference: number | null;
  cardSales: number;
  cardReturns: number;
  transactionsCount: number;
  voidsCount: number;
  returnsCount: number;
  salesList: ShiftSaleItem[];
}

export interface CommercialReportsState {
  dateFrom: string;
  dateTo: string;
  selectedDate: string;
  selectedShiftId: string | null;
  loading: boolean;
  error: string | null;
  salesSummary: SalesSummaryReport | null;
  productPerformance: ProductPerformanceItem[] | null;
  dailyCash: DailyCashReport | null;
  inventoryValue: InventoryValueReport | null;
  losses: LossesReport | null;
  shiftReport: ShiftReport | null;
}

import { supabase } from '../../../shared/supabase/supabaseClient';
import {
  SalesSummaryReport,
  ProductPerformanceItem,
  DailyCashShift,
  DailyCashReport,
  InventoryValueReport,
  LossesReport,
  ShiftReport,
  ShiftSaleItem,
  DeadStockCandidate,
  WasteReasonItem,
  WasteProductItem
} from '../types';

const toNumberSafe = (value: unknown, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

const toStringSafe = (value: unknown, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toStringOrNullSafe = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return String(value);
};

const parseSalesSummaryReport = (data: unknown): SalesSummaryReport => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    grossSales: toNumberSafe(d.grossSales ?? d.gross_sales),
    voidAmount: toNumberSafe(d.voidAmount ?? d.void_amount),
    returnAmount: toNumberSafe(d.returnAmount ?? d.return_amount),
    netSales: toNumberSafe(d.netSales ?? d.net_sales),
    cashGross: toNumberSafe(d.cashGross ?? d.cash_gross),
    cashRefunds: toNumberSafe(d.cashRefunds ?? d.cash_refunds),
    netCash: toNumberSafe(d.netCash ?? d.net_cash),
    cardGross: toNumberSafe(d.cardGross ?? d.card_gross),
    cardRefunds: toNumberSafe(d.cardRefunds ?? d.card_refunds),
    netCard: toNumberSafe(d.netCard ?? d.net_card),
    voucherRefunds: toNumberSafe(d.voucherRefunds ?? d.voucher_refunds),
    salesCount: toNumberSafe(d.salesCount ?? d.sales_count),
    voidCount: toNumberSafe(d.voidCount ?? d.void_count),
    returnCount: toNumberSafe(d.returnCount ?? d.return_count),
    averageBasket: toNumberSafe(d.averageBasket ?? d.average_basket),
    activeShiftCount: toNumberSafe(d.activeShiftCount ?? d.active_shift_count),
  };
};

const parseProductPerformanceItem = (data: unknown): ProductPerformanceItem => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    productId: toStringSafe(d.productId ?? d.product_id),
    name: toStringSafe(d.name),
    barcode: toStringOrNullSafe(d.barcode),
    quantitySoldGross: toNumberSafe(d.quantitySoldGross ?? d.quantity_sold_gross),
    quantityReturned: toNumberSafe(d.quantityReturned ?? d.quantity_returned),
    quantitySoldNet: toNumberSafe(d.quantitySoldNet ?? d.quantity_sold_net),
    grossRevenue: toNumberSafe(d.grossRevenue ?? d.gross_revenue),
    returnedRevenue: toNumberSafe(d.returnedRevenue ?? d.returned_revenue),
    netRevenue: toNumberSafe(d.netRevenue ?? d.net_revenue),
    estimatedCogs: toNumberSafe(d.estimatedCogs ?? d.estimated_cogs),
    estimatedProfit: toNumberSafe(d.estimatedProfit ?? d.estimated_profit),
    marginPercent: toNumberSafe(d.marginPercent ?? d.margin_percent),
  };
};

const parseDailyCashShift = (data: unknown): DailyCashShift => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    shiftId: toStringSafe(d.shiftId ?? d.shift_id),
    registerName: toStringOrNullSafe(d.registerName ?? d.register_name),
    cashierName: toStringOrNullSafe(d.cashierName ?? d.cashier_name ?? d.cashier),
    openingCash: toNumberSafe(d.openingCash ?? d.opening_cash),
    expectedCash: toNumberSafe(d.expectedCash ?? d.expected_cash),
    declaredCash: d.declaredCash !== undefined && d.declaredCash !== null ? toNumberSafe(d.declaredCash) : (d.declared_cash !== undefined && d.declared_cash !== null ? toNumberSafe(d.declared_cash) : null),
    cashDifference: d.cashDifference !== undefined && d.cashDifference !== null ? toNumberSafe(d.cashDifference) : (d.cash_difference !== undefined && d.cash_difference !== null ? toNumberSafe(d.cash_difference) : null),
    netCash: toNumberSafe(d.netCash ?? d.net_cash),
    netCard: toNumberSafe(d.netCard ?? d.net_card),
    status: toStringSafe(d.status),
  };
};

const parseDailyCashReport = (data: unknown): DailyCashReport => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const shiftsRaw = Array.isArray(d.shifts) ? d.shifts : [];
  return {
    date: toStringSafe(d.date),
    shifts: shiftsRaw.map(parseDailyCashShift),
    totalOpeningCash: toNumberSafe(d.totalOpeningCash ?? d.total_opening_cash),
    totalExpectedCash: toNumberSafe(d.totalExpectedCash ?? d.total_expected_cash),
    totalDeclaredCash: toNumberSafe(d.totalDeclaredCash ?? d.total_declared_cash),
    totalCashDifference: toNumberSafe(d.totalCashDifference ?? d.total_cash_difference),
    netCash: toNumberSafe(d.netCash ?? d.net_cash),
    netCard: toNumberSafe(d.netCard ?? d.net_card),
  };
};

const parseDeadStockCandidate = (data: unknown): DeadStockCandidate => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    productId: toStringSafe(d.productId ?? d.product_id),
    name: toStringSafe(d.name),
    barcode: toStringOrNullSafe(d.barcode),
    quantity: toNumberSafe(d.quantity ?? d.currentStock ?? d.current_stock),
    lastSaleAt: toStringOrNullSafe(d.lastSaleAt ?? d.last_sale_at),
  };
};

const parseInventoryValueReport = (data: unknown): InventoryValueReport => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const deadStockRaw = Array.isArray(d.deadStockCandidates) ? d.deadStockCandidates : (Array.isArray(d.dead_stock_candidates) ? d.dead_stock_candidates : []);
  return {
    totalStockMagazin: toNumberSafe(d.totalStockMagazin ?? d.total_stock_magazin),
    totalStockDepozit: toNumberSafe(d.totalStockDepozit ?? d.total_stock_depozit),
    estimatedPurchaseValue: toNumberSafe(d.estimatedPurchaseValue ?? d.estimated_purchase_value),
    estimatedSaleValue: toNumberSafe(d.estimatedSaleValue ?? d.estimated_sale_value),
    lowStockCount: toNumberSafe(d.lowStockCount ?? d.low_stock_count),
    negativeStockCount: toNumberSafe(d.negativeStockCount ?? d.negative_stock_count),
    deadStockCandidates: deadStockRaw.map(parseDeadStockCandidate),
  };
};

const parseWasteReasonItem = (data: unknown): WasteReasonItem => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    reason: toStringSafe(d.reason),
    quantity: toNumberSafe(d.quantity),
    value: toNumberSafe(d.value ?? d.estimatedValue ?? d.estimated_value),
    count: toNumberSafe(d.count ?? d.eventsCount ?? d.events_count),
  };
};

const parseWasteProductItem = (data: unknown): WasteProductItem => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    productId: toStringSafe(d.productId ?? d.product_id),
    name: toStringSafe(d.name),
    barcode: toStringOrNullSafe(d.barcode),
    quantity: toNumberSafe(d.quantity),
    value: toNumberSafe(d.value ?? d.estimatedValue ?? d.estimated_value),
  };
};

const parseLossesReport = (data: unknown): LossesReport => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const byReasonRaw = Array.isArray(d.byReason) ? d.byReason : (Array.isArray(d.by_reason) ? d.by_reason : []);
  const byProductRaw = Array.isArray(d.byProduct) ? d.byProduct : (Array.isArray(d.by_product) ? d.by_product : []);
  return {
    totalWasteQuantity: toNumberSafe(d.totalWasteQuantity ?? d.total_waste_quantity),
    estimatedWasteValue: toNumberSafe(d.estimatedWasteValue ?? d.estimated_waste_value),
    lossesCount: d.lossesCount !== undefined ? toNumberSafe(d.lossesCount) : (d.losses_count !== undefined ? toNumberSafe(d.losses_count) : undefined),
    byReason: byReasonRaw.map(parseWasteReasonItem),
    byProduct: byProductRaw.map(parseWasteProductItem),
  };
};

const parseShiftSaleItem = (data: unknown): ShiftSaleItem => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    saleId: toStringSafe(d.saleId ?? d.sale_id),
    createdAt: toStringSafe(d.createdAt ?? d.created_at),
    total: toNumberSafe(d.total),
    paymentMethod: toStringOrNullSafe(d.paymentMethod ?? d.payment_method),
    status: toStringSafe(d.status),
  };
};

const parseShiftReport = (data: unknown): ShiftReport => {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const salesListRaw = Array.isArray(d.salesList) ? d.salesList : (Array.isArray(d.sales_list) ? d.sales_list : []);
  return {
    shiftId: toStringSafe(d.shiftId ?? d.shift_id),
    cashierName: toStringOrNullSafe(d.cashierName ?? d.cashier_name),
    registerName: toStringOrNullSafe(d.registerName ?? d.register_name),
    status: toStringSafe(d.status),
    openedAt: toStringOrNullSafe(d.openedAt ?? d.opened_at),
    closedAt: toStringOrNullSafe(d.closedAt ?? d.closed_at),
    openingCash: toNumberSafe(d.openingCash ?? d.opening_cash),
    cashSales: toNumberSafe(d.cashSales ?? d.cash_sales),
    cashReturns: toNumberSafe(d.cashReturns ?? d.cash_returns),
    expectedCash: toNumberSafe(d.expectedCash ?? d.expected_cash),
    declaredCash: d.declaredCash !== undefined && d.declaredCash !== null ? toNumberSafe(d.declaredCash) : (d.declared_cash !== undefined && d.declared_cash !== null ? toNumberSafe(d.declared_cash) : null),
    cashDifference: d.cashDifference !== undefined && d.cashDifference !== null ? toNumberSafe(d.cashDifference) : (d.cash_difference !== undefined && d.cash_difference !== null ? toNumberSafe(d.cash_difference) : null),
    cardSales: toNumberSafe(d.cardSales ?? d.card_sales),
    cardReturns: toNumberSafe(d.cardReturns ?? d.card_returns),
    transactionsCount: toNumberSafe(d.transactionsCount ?? d.transactions_count),
    voidsCount: toNumberSafe(d.voidsCount ?? d.voids_count),
    returnsCount: toNumberSafe(d.returnsCount ?? d.returns_count),
    salesList: salesListRaw.map(parseShiftSaleItem),
  };
};

export const reportsService = {
  async getSalesSummaryReport(storeId: string, dateFrom: string, dateTo: string): Promise<SalesSummaryReport> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_sales_summary_report', {
      p_store_id: storeId,
      p_date_from: dateFrom,
      p_date_to: dateTo
    });

    if (error) {
      console.error('getSalesSummaryReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    return parseSalesSummaryReport(data);
  },

  async getProductPerformanceReport(storeId: string, dateFrom: string, dateTo: string, limit = 20): Promise<ProductPerformanceItem[]> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_product_performance_report', {
      p_store_id: storeId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit
    });

    if (error) {
      console.error('getProductPerformanceReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    const productsRaw = data && typeof data === 'object' && 'products' in data ? (data as { products: unknown }).products : data;
    return Array.isArray(productsRaw) ? productsRaw.map(parseProductPerformanceItem) : [];
  },

  async getDailyCashReport(storeId: string, date: string): Promise<DailyCashReport> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_daily_cash_report', {
      p_store_id: storeId,
      p_date: date
    });

    if (error) {
      console.error('getDailyCashReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    return parseDailyCashReport(data);
  },

  async getInventoryValueReport(storeId: string): Promise<InventoryValueReport> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_inventory_value_report', {
      p_store_id: storeId
    });

    if (error) {
      console.error('getInventoryValueReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    return parseInventoryValueReport(data);
  },

  async getLossesReport(storeId: string, dateFrom: string, dateTo: string): Promise<LossesReport> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_losses_report', {
      p_store_id: storeId,
      p_date_from: dateFrom,
      p_date_to: dateTo
    });

    if (error) {
      console.error('getLossesReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    return parseLossesReport(data);
  },

  async getShiftReport(storeId: string, shiftId: string): Promise<ShiftReport> {
    if (!storeId) throw new Error('Selectează un magazin pentru a vedea rapoartele.');
    const { data, error } = await supabase.rpc('get_shift_report', {
      p_store_id: storeId,
      p_shift_id: shiftId
    });

    if (error) {
      console.error('getShiftReport error:', error);
      if (error.message?.includes('permisiuni') || error.message?.includes('Acces interzis')) {
        throw new Error('Nu ai permisiunea necesară pentru aceste rapoarte.');
      }
      throw new Error('Nu s-au putut încărca rapoartele.');
    }

    return parseShiftReport(data);
  }
};

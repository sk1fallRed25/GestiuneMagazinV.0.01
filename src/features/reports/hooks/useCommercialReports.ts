import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { isManagerLike } from '../../auth/permissions';
import { reportsService } from '../services/reportsService';
import {
  SalesSummaryReport,
  ProductPerformanceItem,
  DailyCashReport,
  InventoryValueReport,
  LossesReport,
  ShiftReport
} from '../types';
import { toast } from 'react-hot-toast';

export const useCommercialReports = () => {
  const { currentStoreId, role } = useAuth();

  // Date range filters (default to current month)
  const getInitialDates = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    
    // First day of current month
    const startOfMonth = new Date(y, m, 1);
    
    // Format YYYY-MM-DD
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      from: formatDate(startOfMonth),
      to: formatDate(today),
      today: formatDate(today)
    };
  };

  const dates = getInitialDates();

  const [dateFrom, setDateFrom] = useState<string>(dates.from);
  const [dateTo, setDateTo] = useState<string>(dates.to);
  const [selectedDate, setSelectedDate] = useState<string>(dates.today);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Report data states
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformanceItem[] | null>(null);
  const [dailyCash, setDailyCash] = useState<DailyCashReport | null>(null);
  const [inventoryValue, setInventoryValue] = useState<InventoryValueReport | null>(null);
  const [losses, setLosses] = useState<LossesReport | null>(null);
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null);
  const [loadingShift, setLoadingShift] = useState<boolean>(false);

  // Check role permission
  const hasAccess = isManagerLike(role);

  const fetchAllReports = useCallback(async () => {
    if (!hasAccess) {
      setError('Nu ai permisiunea necesară pentru rapoarte comerciale.');
      return;
    }

    if (!currentStoreId) {
      setError('Selectează un magazin pentru a vedea rapoartele.');
      // Clear data when no store is selected
      setSalesSummary(null);
      setProductPerformance(null);
      setDailyCash(null);
      setInventoryValue(null);
      setLosses(null);
      setShiftReport(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch core reports in parallel
      const [
        summaryRes,
        performanceRes,
        dailyCashRes,
        inventoryRes,
        lossesRes
      ] = await Promise.all([
        reportsService.getSalesSummaryReport(currentStoreId, dateFrom, dateTo),
        reportsService.getProductPerformanceReport(currentStoreId, dateFrom, dateTo),
        reportsService.getDailyCashReport(currentStoreId, selectedDate),
        reportsService.getInventoryValueReport(currentStoreId),
        reportsService.getLossesReport(currentStoreId, dateFrom, dateTo)
      ]);

      setSalesSummary(summaryRes);
      setProductPerformance(performanceRes);
      setDailyCash(dailyCashRes);
      setInventoryValue(inventoryRes);
      setLosses(lossesRes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'A apărut o eroare la încărcarea rapoartelor.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, role, hasAccess, dateFrom, dateTo, selectedDate]);

  const fetchShiftReport = useCallback(async (shiftId: string) => {
    if (!hasAccess) return;
    if (!currentStoreId) return;

    setLoadingShift(true);
    try {
      const res = await reportsService.getShiftReport(currentStoreId, shiftId);
      setShiftReport(res);
      setSelectedShiftId(shiftId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Nu s-a putut încărca raportul de tură.';
      toast.error(message);
    } finally {
      setLoadingShift(false);
    }
  }, [currentStoreId, hasAccess]);

  const clearShiftReport = () => {
    setShiftReport(null);
    setSelectedShiftId(null);
  };

  // Automatically fetch reports when store or date filters change
  useEffect(() => {
    fetchAllReports();
  }, [fetchAllReports]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedDate,
    setSelectedDate,
    selectedShiftId,
    loading,
    error,
    salesSummary,
    productPerformance,
    dailyCash,
    inventoryValue,
    losses,
    shiftReport,
    loadingShift,
    hasAccess,
    fetchAllReports,
    fetchShiftReport,
    clearShiftReport
  };
};

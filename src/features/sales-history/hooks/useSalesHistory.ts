import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { salesHistoryService } from '../services/salesHistoryService';
import { SaleSummary, SaleDetails, SalesHistoryFilters, SalesHistorySummary } from '../types';

import { toast } from 'react-hot-toast';

export const useSalesHistory = () => {
    const { currentStoreId } = useAuth();
    
    const [sales, setSales] = useState<SaleSummary[]>([]);
    const [summary, setSummary] = useState<SalesHistorySummary | null>(null);
    const [loading, setLoading] = useState(true);
    
    const today = new Date().toISOString().split('T')[0];
    const [filters, setFilters] = useState<SalesHistoryFilters>({
        search: '',
        paymentMethod: 'all',
        status: 'all',
        dateFrom: today,
        dateTo: today
    });

    const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const fetchSales = useCallback(async () => {
        if (!currentStoreId) {
            setSales([]);
            setSummary(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await salesHistoryService.listSales(currentStoreId, filters);
            const summ = salesHistoryService.getSalesSummary(data);
            setSales(data);
            setSummary(summ);
        } catch (err: unknown) {
            console.error("Error fetching sales history:", err);
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, filters]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const openSaleDetails = async (saleId: string) => {
        if (!currentStoreId) return;
        setLoadingDetails(true);
        setShowDetailsModal(true);
        try {
            const details = await salesHistoryService.getSaleDetails(currentStoreId, saleId);
            setSelectedSale(details);
        } catch (err: unknown) {
            console.error("Error fetching sale details:", err);
            toast.error("Nu s-au putut încărca datele.");
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedSale(null);
    };

    const updateFilter = (newFilters: Partial<SalesHistoryFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    return {
        sales,
        summary,
        filters,
        loading,
        loadingDetails,
        selectedSale,
        showDetailsModal,
        fetchSales,
        updateFilter,
        openSaleDetails,
        closeDetailsModal
    };
};

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { salesHistoryService } from '../services/salesHistoryService';
import { SaleSummary, SaleDetails, SalesHistoryFilters, SalesHistorySummary, VoidEligibility } from '../types';

import { toast } from 'react-hot-toast';

export const useSalesHistory = () => {
    const { user, currentStoreId } = useAuth();
    
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

    // Void states
    const [voidEligibility, setVoidEligibility] = useState<VoidEligibility | null>(null);
    const [voidEligibilityLoading, setVoidEligibilityLoading] = useState(false);
    const [voidActionLoading, setVoidActionLoading] = useState(false);
    const [voidError, setVoidError] = useState<string | null>(null);
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [selectedSaleForVoid, setSelectedSaleForVoid] = useState<SaleSummary | null>(null);

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

    const loadVoidEligibility = useCallback(async (saleId: string) => {
        if (!currentStoreId || !user?.id) {
            setVoidError("Utilizator neautentificat sau magazin neselectat.");
            return;
        }
        setVoidEligibilityLoading(true);
        setVoidError(null);
        try {
            const eligibility = await salesHistoryService.getSaleVoidEligibility(currentStoreId, user.id, saleId);
            setVoidEligibility(eligibility);
        } catch (err: any) {
            console.error("Error loading void eligibility:", err);
            setVoidError(err?.message || "Nu s-a putut verifica eligibilitatea anulării.");
        } finally {
            setVoidEligibilityLoading(false);
        }
    }, [currentStoreId, user]);

        const openVoidModal = useCallback((sale: SaleSummary | SaleDetails) => {
        const summarySale: SaleSummary = 'items' in sale ? {
            id: sale.id,
            createdAt: sale.createdAt,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            status: sale.status,
            cashierName: sale.cashierName,
            itemsCount: sale.items.length,
            paymentsTotal: sale.payments.reduce((acc, p) => acc + p.amount, 0),
            cashPart: sale.payments.filter(p => p.method === 'cash').reduce((acc, p) => acc + p.amount, 0),
            cardPart: sale.payments.filter(p => p.method === 'card').reduce((acc, p) => acc + p.amount, 0),
        } : sale;

        setSelectedSaleForVoid(summarySale);
        setVoidModalOpen(true);
        setVoidEligibility(null);
        setVoidError(null);
        loadVoidEligibility(summarySale.id);
    }, [loadVoidEligibility]);

    const closeVoidModal = useCallback(() => {
        setVoidModalOpen(false);
        setSelectedSaleForVoid(null);
        setVoidEligibility(null);
        setVoidError(null);
    }, []);

    const confirmVoidSale = useCallback(async (reason: string, notes?: string | null) => {
        if (!currentStoreId || !user?.id || !selectedSaleForVoid) {
            setVoidError("Informații incomplete.");
            return;
        }

        const reasonClean = reason.trim();
        if (!reasonClean || reasonClean.length < 3) {
            setVoidError("Motivul trebuie să aibă cel puțin 3 caractere.");
            return;
        }

        setVoidActionLoading(true);
        setVoidError(null);
        try {
            await salesHistoryService.voidSale({
                storeId: currentStoreId,
                profileId: user.id,
                saleId: selectedSaleForVoid.id,
                reason: reasonClean,
                notes: notes ?? null
            });

            toast.success("Bonul a fost anulat cu succes.");
            
            const voidedSaleId = selectedSaleForVoid.id;
            closeVoidModal();
            
            // Refresh list
            await fetchSales();

            // Refresh details if open
            if (selectedSale && selectedSale.id === voidedSaleId) {
                openSaleDetails(voidedSaleId);
            }
        } catch (err: any) {
            console.error("Error voiding sale:", err);
            setVoidError(err?.message || "Bonul nu a putut fi anulat.");
        } finally {
            setVoidActionLoading(false);
        }
    }, [currentStoreId, user, selectedSaleForVoid, fetchSales, selectedSale, closeVoidModal]);

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
        closeDetailsModal,

        // Void state & actions
        voidEligibility,
        voidEligibilityLoading,
        voidActionLoading,
        voidError,
        voidModalOpen,
        selectedSaleForVoid,
        openVoidModal,
        closeVoidModal,
        confirmVoidSale
    };
};

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { salesHistoryService } from '../services/salesHistoryService';
import { SaleSummary, SaleDetails, SalesHistoryFilters, SalesHistorySummary, VoidEligibility, ReturnEligibility, ReturnSaleItemInput } from '../types';

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

    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

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

    // Return states
    const [returnEligibility, setReturnEligibility] = useState<ReturnEligibility | null>(null);
    const [returnEligibilityLoading, setReturnEligibilityLoading] = useState(false);
    const [returnActionLoading, setReturnActionLoading] = useState(false);
    const [returnError, setReturnError] = useState<string | null>(null);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SaleSummary | null>(null);

    const totalPages = Math.ceil(totalCount / pageSize);

    const fetchSales = useCallback(async () => {
        if (!currentStoreId) {
            setSales([]);
            setSummary(null);
            setTotalCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { sales: fetchedSales, totalCount: count, summary: fetchedSummary } = 
                await salesHistoryService.listSales(currentStoreId, filters, page, pageSize);
            setSales(fetchedSales);
            setTotalCount(count);
            setSummary(fetchedSummary);
        } catch (err: unknown) {
            console.error("Error fetching sales history:", err);
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, filters, page]);

    // Reset page to 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [filters.search, filters.paymentMethod, filters.status, filters.dateFrom, filters.dateTo]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const nextPage = () => setPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setPage(prev => Math.max(prev - 1, 1));
    const goToPage = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages));

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

    const loadReturnEligibility = useCallback(async (saleId: string) => {
        if (!currentStoreId || !user?.id) {
            setReturnError("Utilizator neautentificat sau magazin neselectat.");
            return;
        }
        setReturnEligibilityLoading(true);
        setReturnError(null);
        try {
            const eligibility = await salesHistoryService.getSaleReturnEligibility(currentStoreId, user.id, saleId);
            setReturnEligibility(eligibility);
        } catch (err: any) {
            console.error("Error loading return eligibility:", err);
            setReturnError(err?.message || "Nu s-a putut verifica eligibilitatea returului.");
        } finally {
            setReturnEligibilityLoading(false);
        }
    }, [currentStoreId, user]);

    const openReturnModal = useCallback((sale: SaleSummary | SaleDetails) => {
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

        setSelectedSaleForReturn(summarySale);
        setReturnModalOpen(true);
        setReturnEligibility(null);
        setReturnError(null);
        loadReturnEligibility(summarySale.id);
    }, [loadReturnEligibility]);

    const closeReturnModal = useCallback(() => {
        setReturnModalOpen(false);
        setSelectedSaleForReturn(null);
        setReturnEligibility(null);
        setReturnError(null);
    }, []);

    const confirmReturnSale = useCallback(async (items: ReturnSaleItemInput[], refundMethod: 'cash' | 'card' | 'voucher', reason: string, notes?: string | null) => {
        if (!currentStoreId || !user?.id || !selectedSaleForReturn) {
            setReturnError("Informații incomplete.");
            return;
        }

        const reasonClean = reason.trim();
        if (!reasonClean || reasonClean.length < 3) {
            setReturnError("Motivul trebuie să aibă cel puțin 3 caractere.");
            return;
        }

        if (!items || items.length === 0) {
            setReturnError("Trebuie să selectați cel puțin un produs pentru retur.");
            return;
        }

        setReturnActionLoading(true);
        setReturnError(null);
        try {
            await salesHistoryService.returnSaleItems({
                storeId: currentStoreId,
                profileId: user.id,
                saleId: selectedSaleForReturn.id,
                items,
                refundMethod,
                reason: reasonClean,
                notes: notes ?? null
            });

            toast.success("Returul a fost procesat cu succes.");
            
            const returnedSaleId = selectedSaleForReturn.id;
            closeReturnModal();
            
            // Refresh list
            await fetchSales();

            // Refresh details if open
            if (selectedSale && selectedSale.id === returnedSaleId) {
                openSaleDetails(returnedSaleId);
            }
        } catch (err: any) {
            console.error("Error returning sale items:", err);
            setReturnError(err?.message || "Returul nu a putut fi procesat.");
        } finally {
            setReturnActionLoading(false);
        }
    }, [currentStoreId, user, selectedSaleForReturn, fetchSales, selectedSale, closeReturnModal]);

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
        page,
        totalPages,
        totalCount,
        nextPage,
        prevPage,
        goToPage,

        // Void state & actions
        voidEligibility,
        voidEligibilityLoading,
        voidActionLoading,
        voidError,
        voidModalOpen,
        selectedSaleForVoid,
        openVoidModal,
        closeVoidModal,
        confirmVoidSale,

        // Return state & actions
        returnEligibility,
        returnEligibilityLoading,
        returnActionLoading,
        returnError,
        returnModalOpen,
        selectedSaleForReturn,
        openReturnModal,
        closeReturnModal,
        confirmReturnSale
    };
};

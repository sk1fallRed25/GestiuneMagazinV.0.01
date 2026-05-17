import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { lossHistoryService } from '../services/lossHistoryService';
import { LossHistoryItem, LossHistorySummary, LossHistoryFilters, LossDetails } from '../types';
import toast from 'react-hot-toast';

const initialFilters: LossHistoryFilters = {
    search: '',
    reason: 'all',
    dateFrom: '',
    dateTo: '',
    zone: 'all'
};

export const useLossHistory = () => {
    const { currentStoreId } = useAuth();
    const [items, setItems] = useState<LossHistoryItem[]>([]);
    const [summary, setSummary] = useState<LossHistorySummary | null>(null);
    const [filters, setFilters] = useState<LossHistoryFilters>(initialFilters);
    const [loading, setLoading] = useState(true);
    
    const [selectedLoss, setSelectedLoss] = useState<LossDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const refreshLossHistory = useCallback(async () => {
        if (!currentStoreId) {
            setItems([]);
            setSummary(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await lossHistoryService.listLossHistory(currentStoreId, filters);
            setItems(data);
            setSummary(lossHistoryService.getLossSummary(data));
        } catch (err: unknown) {
            console.error("Eroare refresh pierderi:", err);
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, filters]);

    useEffect(() => {
        refreshLossHistory();
    }, [refreshLossHistory]);

    const updateFilter = (field: keyof LossHistoryFilters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const openLossDetails = async (eventId: string) => {
        if (!currentStoreId) return;
        setLoadingDetails(true);
        setShowDetailsModal(true);
        try {
            const details = await lossHistoryService.getLossDetails(currentStoreId, eventId);
            setSelectedLoss(details);
        } catch (err: unknown) {
            console.error("Eroare detalii pierdere:", err);
            toast.error("Nu s-au putut încărca datele.");
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedLoss(null);
    };

    return {
        items,
        summary,
        filters,
        loading,
        selectedLoss,
        loadingDetails,
        showDetailsModal,
        updateFilter,
        refreshLossHistory,
        openLossDetails,
        closeDetailsModal
    };
};

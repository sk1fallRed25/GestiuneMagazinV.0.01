import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../auth/useAuth';
import { expirationService } from '../services/expirationService';
import { ExpirationItem, ExpirationFilter, ExpirationSummary } from '../types';

export const useExpirations = () => {
    const navigate = useNavigate();
    const { currentStoreId } = useAuth();
    
    const [items, setItems] = useState<ExpirationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ExpirationFilter>({
        status: 'all',
        zone: 'all',
        search: ''
    });

    const refreshExpirations = useCallback(async () => {
        if (!currentStoreId) return;
        setLoading(true);
        try {
            const data = await expirationService.listExpirations(currentStoreId);
            setItems(data);
        } catch (err: unknown) {
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId]);

    useEffect(() => {
        refreshExpirations();
    }, [refreshExpirations]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(filters.search.toLowerCase()) ||
                                 item.barcode.includes(filters.search);
            const matchesStatus = filters.status === 'all' || item.status === filters.status;
            const matchesZone = filters.zone === 'all' || item.zone === filters.zone;

            return matchesSearch && matchesStatus && matchesZone;
        });
    }, [items, filters]);

    const summary = useMemo((): ExpirationSummary => {
        return items.reduce((acc, item) => {
            if (item.status === 'expired') acc.expiredCount++;
            else if (item.status === 'critical') acc.criticalCount++;
            else if (item.status === 'warning') acc.warningCount++;
            
            acc.totalValueAtRisk += item.estimatedValue;
            return acc;
        }, {
            expiredCount: 0,
            criticalCount: 0,
            warningCount: 0,
            totalValueAtRisk: 0
        });
    }, [items]);

    const setFilter = (updates: Partial<ExpirationFilter>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    const goToLossReport = (item: ExpirationItem) => {
        navigate('/pierderi', { 
            state: { 
                preSelectedId: item.productId,
                source: item.zone,
                reason: 'Produs Expirat'
            } 
        });
    };

    return {
        items,
        loading,
        filters,
        filteredItems,
        summary,
        setFilter,
        refreshExpirations,
        goToLossReport
    };
};

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { dashboardService } from '../services/dashboardService';
import { DashboardData } from '../types';
import { toast } from 'react-hot-toast';

export const useDashboard = () => {
    const { currentStoreId, role } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        if (!currentStoreId) {
            if (role === 'platform_owner') {
                setError("Selectează un magazin pentru a vedea dashboard-ul.");
            } else {
                setError("Magazin curent indisponibil.");
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const dashboardData = await dashboardService.getDashboardData(currentStoreId);
            setData(dashboardData);
        } catch (err: unknown) {
            console.error("Dashboard Error:", err);
            setError("Nu s-au putut încărca datele.");
            toast.error("Nu s-au putut încărca datele.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, role]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return {
        data,
        loading,
        error,
        refreshDashboard: fetchDashboard
    };
};

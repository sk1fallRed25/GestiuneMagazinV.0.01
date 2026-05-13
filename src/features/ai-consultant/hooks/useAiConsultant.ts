import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { aiConsultantDataService } from '../services/aiConsultantDataService';
import { AiConsultantData } from '../types';
import toast from 'react-hot-toast';

export const useAiConsultant = () => {
    const { currentStoreId, role } = useAuth();
    const [data, setData] = useState<AiConsultantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!currentStoreId) {
            if (role === 'platform_owner') {
                setError("Selectează un magazin pentru a genera recomandări.");
            } else {
                setError("Magazin curent indisponibil.");
            }
            setLoading(false);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            const result = await aiConsultantDataService.getAiConsultantData(currentStoreId);
            setData(result);
        } catch (err: unknown) {
            console.error("Eroare AI Consultant:", err);
            setError("Eroare la procesarea datelor operaționale.");
            toast.error("Eroare la încărcarea consultantului AI.");
        } finally {
            setLoading(false);
        }
    }, [currentStoreId, role]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        data,
        loading,
        error,
        refresh
    };
};

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { aiConsultantDataService } from '../services/aiConsultantDataService';
import { AiConsultantData } from '../types';
import toast from 'react-hot-toast';

export type AiConsultantErrorType = 
    | 'store_missing' 
    | 'permission_error' 
    | 'data_error' 
    | null;

export const useAiConsultant = () => {
    const { currentStoreId, role } = useAuth();
    const [data, setData] = useState<AiConsultantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<AiConsultantErrorType>(null);

    const classifyError = (err: unknown): { message: string; type: AiConsultantErrorType } => {
        let raw: string;
        if (err instanceof Error) {
            raw = err.message;
        } else if (err && typeof err === 'object' && 'message' in err) {
            raw = String((err as any).message);
        } else if (err && typeof err === 'object' && 'details' in err) {
            raw = String((err as any).details);
        } else {
            raw = String(err || 'Eroare necunoscută');
        }
        const rawLower = raw.toLowerCase();

        // RLS / permission errors from Supabase
        if (
            rawLower.includes('permission denied') ||
            rawLower.includes('42501') ||
            rawLower.includes('rls') ||
            rawLower.includes('policy') ||
            rawLower.includes('not authorized') ||
            rawLower.includes('403')
        ) {
            return {
                message: 'Nu ai permisiuni pentru datele necesare AI Consultant.',
                type: 'permission_error'
            };
        }

        // Supabase query errors (table/column not found, etc.)
        if (
            rawLower.includes('relation') ||
            rawLower.includes('column') ||
            rawLower.includes('does not exist') ||
            rawLower.includes('42p01') ||
            rawLower.includes('42703')
        ) {
            return {
                message: `AI Consultant nu a putut încărca datele. Detalii: ${raw}`,
                type: 'data_error'
            };
        }

        // Generic technical error
        return {
            message: `AI Consultant nu a putut încărca datele. Detalii: ${raw}`,
            type: 'data_error'
        };
    };

    const refresh = useCallback(async () => {
        if (!currentStoreId) {
            if (role === 'platform_owner') {
                setError("Selectează un magazin pentru a genera recomandări.");
            } else {
                setError("Nu există magazin selectat.");
            }
            setErrorType('store_missing');
            setLoading(false);
            return;
        }

        setError(null);
        setErrorType(null);
        setLoading(true);
        try {
            const result = await aiConsultantDataService.getAiConsultantData(currentStoreId);
            setData(result);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
            console.error("[AI Consultant] load failed:", errMsg);
            const classified = classifyError(err);
            setError(classified.message);
            setErrorType(classified.type);
            toast.error(classified.message);
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
        errorType,
        refresh
    };
};
